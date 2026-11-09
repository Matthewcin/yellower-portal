-- =====================================================================
-- YELLOWER PORTAL (versión sencilla) — ESQUEMA DE DATOS
-- Pégalo completo en Supabase > SQL Editor > New query > Run.
-- Es seguro volver a ejecutarlo: no borra datos.
--
-- Qué crea:
--   perfiles  -> una fila por persona que entra (nombre, empresa, si es admin)
--   proyectos -> los proyectos de cada cliente
--   tareas    -> la lista de pendientes/etapas de cada proyecto
--
-- Seguridad (lo importante): cada cliente solo puede ver SUS proyectos y tareas.
-- Solo Yellower (admin) puede crear o editar. El cliente solo puede marcar como
-- hechos los pendientes que son suyos y que no confirma Yellower. Esto lo impone la base de datos, no la página.
-- =====================================================================

-- ---------- TABLAS ----------

create table if not exists public.perfiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null default '',
  nombre    text not null default '' check (char_length(nombre)  <= 200),
  empresa   text not null default '' check (char_length(empresa) <= 200),
  es_admin  boolean not null default false,
  creado    timestamptz not null default now()
);

create table if not exists public.proyectos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.perfiles(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 200),
  servicio    text not null default '' check (char_length(servicio) <= 200),
  novedad     text not null default '' check (char_length(novedad)  <= 2000),
  plazo       text not null default '' check (char_length(plazo) <= 100),
  entrega_estimada date,
  incluye     text not null default '' check (char_length(incluye) <= 1000),
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
alter table public.perfiles add column if not exists email text not null default '';

create index if not exists proyectos_cliente_idx on public.proyectos(cliente_id);

create table if not exists public.tareas (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references public.proyectos(id) on delete cascade,
  titulo       text not null check (char_length(titulo) between 1 and 200),
  detalle      text not null default '' check (char_length(detalle) <= 2000),
  responsable  text not null default 'yellower' check (responsable in ('yellower','cliente')),
  estado       text not null default 'pendiente' check (estado in ('pendiente','en_proceso','hecho')),
  fecha_limite date,
  orden        integer not null default 0,
  etapa        text not null default '' check (char_length(etapa) <= 100),
  requiere_validacion boolean not null default false,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index if not exists tareas_proyecto_idx on public.tareas(proyecto_id);

-- Si ya habías ejecutado una versión anterior de este archivo, esto agrega lo nuevo.
alter table public.proyectos add column if not exists plazo text not null default '' check (char_length(plazo) <= 100);
alter table public.proyectos add column if not exists entrega_estimada date;
alter table public.proyectos add column if not exists incluye text not null default '' check (char_length(incluye) <= 1000);
alter table public.tareas add column if not exists etapa text not null default '' check (char_length(etapa) <= 100);
alter table public.tareas add column if not exists requiere_validacion boolean not null default false;

-- ---------- FUNCIONES Y TRIGGERS ----------

-- ¿La persona que hace la consulta es admin? (no se puede falsificar desde la página)
create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false)
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- Al crear un usuario (Authentication > Add user) se crea su perfil automáticamente.
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'nombre', ''))
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Mantiene la fecha de "actualizado".
create or replace function public.tocar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado = now();
  return new;
end
$$;

drop trigger if exists tocar_proyectos on public.proyectos;
create trigger tocar_proyectos before update on public.proyectos
  for each row execute function public.tocar_actualizado();

drop trigger if exists tocar_tareas on public.tareas;
create trigger tocar_tareas before update on public.tareas
  for each row execute function public.tocar_actualizado();

-- Un cliente solo puede cambiar el ESTADO de sus pendientes, y solo entre
-- "pendiente" y "hecho". Cualquier otro cambio se rechaza.
-- (Quien edita desde el panel de Supabase no tiene sesión de cliente y no se limita.)
create or replace function public.limitar_cambios_cliente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or public.es_admin() then
    return new;
  end if;

  if (new.proyecto_id, new.titulo, new.detalle, new.responsable, new.fecha_limite, new.orden, new.etapa, new.requiere_validacion, new.creado)
     is distinct from
     (old.proyecto_id, old.titulo, old.detalle, old.responsable, old.fecha_limite, old.orden, old.etapa, old.requiere_validacion, old.creado) then
    raise exception 'Solo puedes marcar tus pendientes como hechos.' using errcode = '42501';
  end if;

  if new.estado not in ('pendiente','hecho') then
    raise exception 'Solo puedes marcar tus pendientes como hechos.' using errcode = '42501';
  end if;

  return new;
end
$$;

drop trigger if exists limitar_cliente on public.tareas;
create trigger limitar_cliente before update on public.tareas
  for each row execute function public.limitar_cambios_cliente();

-- ---------- SEGURIDAD (RLS) ----------

alter table public.perfiles  enable row level security;
alter table public.proyectos enable row level security;
alter table public.tareas    enable row level security;

-- Se limpian políticas anteriores para poder volver a ejecutar este archivo.
drop policy if exists perfiles_ver_propio     on public.perfiles;
drop policy if exists perfiles_admin          on public.perfiles;
drop policy if exists proyectos_ver           on public.proyectos;
drop policy if exists proyectos_admin         on public.proyectos;
drop policy if exists tareas_ver              on public.tareas;
drop policy if exists tareas_admin            on public.tareas;
drop policy if exists tareas_cliente_marca    on public.tareas;

-- PERFILES: cada persona ve el suyo; admin ve y edita todos. Un cliente NO puede
-- editar su perfil (así nadie puede darse permisos de admin).
create policy perfiles_ver_propio on public.perfiles
  for select to authenticated using (id = auth.uid());
create policy perfiles_admin on public.perfiles
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- PROYECTOS: el cliente ve solo los suyos; admin todo.
create policy proyectos_ver on public.proyectos
  for select to authenticated using (cliente_id = auth.uid());
create policy proyectos_admin on public.proyectos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- TAREAS: el cliente ve las de sus proyectos; admin todo.
create policy tareas_ver on public.tareas
  for select to authenticated using (
    exists (select 1 from public.proyectos p
            where p.id = tareas.proyecto_id and p.cliente_id = auth.uid())
  );
create policy tareas_admin on public.tareas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
-- El cliente puede actualizar SOLO tareas suyas (responsable = cliente) de sus proyectos,
-- y nunca las que confirma Yellower (por ejemplo: el pago, el material o una aprobación).
create policy tareas_cliente_marca on public.tareas
  for update to authenticated
  using (
    responsable = 'cliente' and not requiere_validacion and exists (
      select 1 from public.proyectos p
      where p.id = tareas.proyecto_id and p.cliente_id = auth.uid())
  )
  with check (
    responsable = 'cliente' and not requiere_validacion and exists (
      select 1 from public.proyectos p
      where p.id = tareas.proyecto_id and p.cliente_id = auth.uid())
  );

-- ---------- PERMISOS ----------
-- Sin sesión (anon) no se puede tocar nada. Con sesión, RLS decide qué filas.
revoke all on public.perfiles, public.proyectos, public.tareas from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.perfiles, public.proyectos, public.tareas to authenticated;

-- ---------- USUARIOS QUE YA EXISTÍAN ----------
-- Si creaste usuarios en Authentication ANTES de ejecutar este archivo, esto les crea
-- su perfil (y completa el correo de los demás).
insert into public.perfiles (id, email, nombre)
select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data->>'nombre', '')
from auth.users u
on conflict (id) do update set email = excluded.email where public.perfiles.email = '';
