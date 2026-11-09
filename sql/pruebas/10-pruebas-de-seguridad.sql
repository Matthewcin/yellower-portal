\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on

-- helpers de prueba (solo existen en esta base temporal)
create or replace function public.__q(rol text, sub uuid, sentencia text) returns text language plpgsql as $$
declare r text;
begin
  execute format('set local role %I', rol);
  perform set_config('request.jwt.claim.sub', coalesce(sub::text,''), true);
  begin execute sentencia into r;
  exception when others then r := 'ERROR ' || sqlstate; end;
  reset role; return r;
end $$;
create or replace function public.__x(rol text, sub uuid, sentencia text) returns text language plpgsql as $$
declare n bigint; r text;
begin
  execute format('set local role %I', rol);
  perform set_config('request.jwt.claim.sub', coalesce(sub::text,''), true);
  begin execute sentencia; get diagnostics n = row_count; r := 'filas=' || n;
  exception when others then r := 'ERROR ' || sqlstate; end;
  reset role; return r;
end $$;

truncate auth.users cascade;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000ad','yani@yellower.test','{"nombre":"Yani"}'),
 ('00000000-0000-0000-0000-00000000000a','a@cliente.test','{"nombre":"Cliente A"}'),
 ('00000000-0000-0000-0000-00000000000b','b@cliente.test','{"nombre":"Cliente B"}');
update perfiles set es_admin = true where id = '00000000-0000-0000-0000-0000000000ad';
insert into proyectos (id, cliente_id, nombre) values
 ('11111111-1111-1111-1111-11111111111a','00000000-0000-0000-0000-00000000000a','Proyecto A'),
 ('11111111-1111-1111-1111-11111111111b','00000000-0000-0000-0000-00000000000b','Proyecto B');
insert into tareas (id, proyecto_id, titulo, responsable, estado) values
 ('22222222-2222-2222-2222-22222222222a','11111111-1111-1111-1111-11111111111a','A: enviar logo','cliente','pendiente'),
 ('22222222-2222-2222-2222-22222222222b','11111111-1111-1111-1111-11111111111a','A: boceto','yellower','en_proceso'),
 ('22222222-2222-2222-2222-22222222222c','11111111-1111-1111-1111-11111111111a','A: brief','yellower','hecho'),
 ('22222222-2222-2222-2222-22222222222d','11111111-1111-1111-1111-11111111111b','B: enviar fotos','cliente','pendiente');
insert into tareas (id, proyecto_id, titulo, responsable, estado, requiere_validacion, etapa) values
 ('22222222-2222-2222-2222-22222222222e','11111111-1111-1111-1111-11111111111a','A: pago del 50%','cliente','pendiente', true, 'Para comenzar');

create temp table resultados(n serial, prueba text, obtenido text, esperado text);
create or replace function pg_temp.t(prueba text, obtenido text, esperado text) returns void language sql as $$
  insert into resultados(prueba, obtenido, esperado) values (prueba, obtenido, esperado) $$;

\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set AD '''00000000-0000-0000-0000-0000000000ad'''

-- ===== CLIENTE A =====
select pg_temp.t('A ve solo sus proyectos',        public.__q('authenticated', :A, 'select count(*)::text from proyectos'), '1');
select pg_temp.t('A ve solo sus tareas',           public.__q('authenticated', :A, 'select count(*)::text from tareas'), '4');
select pg_temp.t('A NO marca lo que confirma Yellower (pago)', public.__x('authenticated', :A, $$update tareas set estado='hecho' where id='22222222-2222-2222-2222-22222222222e'$$), 'filas=0');
select pg_temp.t('A NO se quita la validación del pago', public.__x('authenticated', :A, $$update tareas set requiere_validacion=false where id='22222222-2222-2222-2222-22222222222e'$$), 'filas=0');
select pg_temp.t('A NO se pone validación a otra tarea', public.__x('authenticated', :A, $$update tareas set requiere_validacion=true where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 42501');
select pg_temp.t('A NO cambia la etapa',            public.__x('authenticated', :A, $$update tareas set etapa='otra' where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 42501');
select pg_temp.t('El perfil guarda el correo', (select email from perfiles where id='00000000-0000-0000-0000-00000000000a'), 'a@cliente.test');
select pg_temp.t('A ve solo su perfil',            public.__q('authenticated', :A, 'select count(*)::text from perfiles'), '1');
select pg_temp.t('A no ve tareas de B (por id)',   public.__q('authenticated', :A, $$select count(*)::text from tareas where id='22222222-2222-2222-2222-22222222222d'$$), '0');
select pg_temp.t('A marca SU pendiente como hecho',public.__x('authenticated', :A, $$update tareas set estado='hecho' where id='22222222-2222-2222-2222-22222222222a'$$), 'filas=1');
select pg_temp.t('A desmarca SU pendiente',        public.__x('authenticated', :A, $$update tareas set estado='pendiente' where id='22222222-2222-2222-2222-22222222222a'$$), 'filas=1');
select pg_temp.t('A NO toca pendiente de B',       public.__x('authenticated', :A, $$update tareas set estado='hecho' where id='22222222-2222-2222-2222-22222222222d'$$), 'filas=0');
select pg_temp.t('A NO marca tarea de Yellower',   public.__x('authenticated', :A, $$update tareas set estado='hecho' where id='22222222-2222-2222-2222-22222222222b'$$), 'filas=0');
select pg_temp.t('A NO cambia el título',          public.__x('authenticated', :A, $$update tareas set titulo='hackeado' where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 42501');
select pg_temp.t('A NO pone estado en_proceso',    public.__x('authenticated', :A, $$update tareas set estado='en_proceso' where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 42501');
select pg_temp.t('A NO se cambia de responsable',  public.__x('authenticated', :A, $$update tareas set responsable='yellower' where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 42501');
select pg_temp.t('A NO mueve su tarea a proyecto B', public.__x('authenticated', :A, $$update tareas set proyecto_id='11111111-1111-1111-1111-11111111111b' where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 42501');
select pg_temp.t('A NO se vuelve admin',           public.__x('authenticated', :A, $$update perfiles set es_admin=true where id='00000000-0000-0000-0000-00000000000a'$$), 'filas=0');
select pg_temp.t('A sigue sin ser admin',          (select es_admin::text from perfiles where id='00000000-0000-0000-0000-00000000000a'), 'false');
select pg_temp.t('A NO crea proyectos',            public.__x('authenticated', :A, $$insert into proyectos(cliente_id,nombre) values ('00000000-0000-0000-0000-00000000000a','X')$$), 'ERROR 42501');
select pg_temp.t('A NO crea tareas (ni en el suyo)', public.__x('authenticated', :A, $$insert into tareas(proyecto_id,titulo) values ('11111111-1111-1111-1111-11111111111a','X')$$), 'ERROR 42501');
select pg_temp.t('A NO crea tareas en proyecto de B', public.__x('authenticated', :A, $$insert into tareas(proyecto_id,titulo) values ('11111111-1111-1111-1111-11111111111b','X')$$), 'ERROR 42501');
select pg_temp.t('A NO borra tareas',              public.__x('authenticated', :A, $$delete from tareas where id='22222222-2222-2222-2222-22222222222a'$$), 'filas=0');
select pg_temp.t('A NO edita proyectos',           public.__x('authenticated', :A, $$update proyectos set novedad='x' where id='11111111-1111-1111-1111-11111111111a'$$), 'filas=0');
select pg_temp.t('A NO borra proyectos',           public.__x('authenticated', :A, $$delete from proyectos where id='11111111-1111-1111-1111-11111111111a'$$), 'filas=0');

-- ===== CLIENTE B (simétrico) =====
select pg_temp.t('B ve solo sus tareas',           public.__q('authenticated', :B, 'select count(*)::text from tareas'), '1');
select pg_temp.t('B NO ve proyecto de A',          public.__q('authenticated', :B, $$select count(*)::text from proyectos where id='11111111-1111-1111-1111-11111111111a'$$), '0');

-- ===== SIN SESIÓN (anon) =====
select pg_temp.t('Sin sesión NO lee proyectos',    public.__q('anon', null, 'select count(*)::text from proyectos'), 'ERROR 42501');
select pg_temp.t('Sin sesión NO lee tareas',       public.__q('anon', null, 'select count(*)::text from tareas'), 'ERROR 42501');
select pg_temp.t('Sin sesión NO lee perfiles',     public.__q('anon', null, 'select count(*)::text from perfiles'), 'ERROR 42501');
select pg_temp.t('Sin sesión NO escribe',          public.__x('anon', null, $$insert into proyectos(cliente_id,nombre) values ('00000000-0000-0000-0000-00000000000a','X')$$), 'ERROR 42501');

-- ===== ADMIN (Yani) =====
select pg_temp.t('Admin ve todos los proyectos',   public.__q('authenticated', :AD, 'select count(*)::text from proyectos'), '2');
select pg_temp.t('Admin ve todas las tareas',      public.__q('authenticated', :AD, 'select count(*)::text from tareas'), '5');
select pg_temp.t('Admin confirma el pago',         public.__x('authenticated', :AD, $$update tareas set estado='hecho' where id='22222222-2222-2222-2222-22222222222e'$$), 'filas=1');
select pg_temp.t('Admin edita plazo y entrega',    public.__x('authenticated', :AD, $$update proyectos set plazo='9 días hábiles', entrega_estimada='2026-12-01', incluye='Catálogo' where id='11111111-1111-1111-1111-11111111111a'$$), 'filas=1');
select pg_temp.t('Admin ve todos los perfiles',    public.__q('authenticated', :AD, 'select count(*)::text from perfiles'), '3');
select pg_temp.t('Admin edita título',             public.__x('authenticated', :AD, $$update tareas set titulo='A: enviar logo (editado)' where id='22222222-2222-2222-2222-22222222222a'$$), 'filas=1');
select pg_temp.t('Admin pone en_proceso',          public.__x('authenticated', :AD, $$update tareas set estado='en_proceso' where id='22222222-2222-2222-2222-22222222222a'$$), 'filas=1');
select pg_temp.t('Admin crea tarea',               public.__x('authenticated', :AD, $$insert into tareas(proyecto_id,titulo,responsable) values ('11111111-1111-1111-1111-11111111111a','Nueva','cliente')$$), 'filas=1');
select pg_temp.t('Admin crea proyecto',            public.__x('authenticated', :AD, $$insert into proyectos(cliente_id,nombre) values ('00000000-0000-0000-0000-00000000000b','Proyecto B2')$$), 'filas=1');
select pg_temp.t('Admin escribe novedad',          public.__x('authenticated', :AD, $$update proyectos set novedad='Avanzamos con el boceto' where id='11111111-1111-1111-1111-11111111111a'$$), 'filas=1');
select pg_temp.t('Admin borra tarea',              public.__x('authenticated', :AD, $$delete from tareas where titulo='Nueva'$$), 'filas=1');

-- ===== PANEL DE SUPABASE (sin sesión de cliente) =====
select pg_temp.t('Panel/SQL editor edita título',  public.__x('postgres', null, $$update tareas set titulo='editado desde el panel' where id='22222222-2222-2222-2222-22222222222d'$$), 'filas=1');

-- ===== LÍMITES DE DATOS =====
select pg_temp.t('Título vacío rechazado',         public.__x('authenticated', :AD, $$insert into tareas(proyecto_id,titulo) values ('11111111-1111-1111-1111-11111111111a','')$$), 'ERROR 23514');
select pg_temp.t('Estado inválido rechazado',      public.__x('authenticated', :AD, $$update tareas set estado='cualquier' where id='22222222-2222-2222-2222-22222222222a'$$), 'ERROR 23514');
select pg_temp.t('Texto gigante rechazado',        public.__x('authenticated', :AD, $$update proyectos set novedad=repeat('x',5000) where id='11111111-1111-1111-1111-11111111111a'$$), 'ERROR 23514');

-- ===== RESULTADO =====
select case when obtenido = esperado then 'PASA ' else 'FALLA' end || ' | ' || prueba || '  ->  ' || coalesce(obtenido,'(null)') ||
       case when obtenido = esperado then '' else '   (esperado: ' || esperado || ')' end
from resultados order by n;
select '== ' || count(*) filter (where obtenido = esperado) || ' pasan, ' || count(*) filter (where obtenido is distinct from esperado) || ' fallan, de ' || count(*) from resultados;
