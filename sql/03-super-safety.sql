-- =====================================================================
-- SUPER SAFETY GLOBAL — carga su proyecto "Tienda Online" en el portal.
--
-- ANTES de ejecutarlo: crea al cliente en Supabase
--   Authentication > Users > Add user > Create new user
--     Email:    supersafety@clientes.yellowerdesignstudio.com
--     Password: la que tú elijas (NO la pegues en ningún archivo)
--     Marca "Auto Confirm User"
-- Con ese correo, el cliente entra escribiendo solo el usuario: SUPERSAFETY.
--
-- Luego pega este archivo en SQL Editor y ejecútalo. Es seguro correrlo dos
-- veces: si el proyecto ya existe, no lo duplica.
--
-- Todas las tareas empiezan "pendiente": no se marca ningún avance que no haya ocurrido.
-- =====================================================================
do $$
declare
  v_correo   text := 'supersafety@clientes.yellowerdesignstudio.com';
  v_cliente  uuid;
  v_proyecto uuid;
begin
  select id into v_cliente from public.perfiles where email = v_correo;
  if v_cliente is null then
    raise exception 'No existe el usuario %. Créalo primero en Authentication > Users (ver instrucciones arriba).', v_correo;
  end if;

  update public.perfiles
     set empresa = 'Super Safety Global', nombre = 'Super Safety'
   where id = v_cliente;

  if exists (select 1 from public.proyectos where cliente_id = v_cliente and nombre = 'Tienda Online') then
    raise notice 'El proyecto "Tienda Online" ya existe para este cliente. No se duplicó.';
    return;
  end if;

  insert into public.proyectos (cliente_id, nombre, servicio, plazo, incluye, novedad)
  values (
    v_cliente, 'Tienda Online', 'Diseño web', '9 días hábiles',
    E'Catálogo de productos con fotos y precios\nActualización web\nCarrito de compras y pago en línea\nTodo listo para empezar a vender',
    'Estamos listos para empezar tu tienda online. Para comenzar necesitamos el primer 50 % del pago, tu Excel con el inventario y tu aprobación de la propuesta de navegación y el diseño visual.'
  )
  returning id into v_proyecto;

  -- Lo que necesitamos del cliente: lo confirma Yellower (requiere_validacion = true)
  insert into public.tareas (proyecto_id, etapa, titulo, detalle, responsable, requiere_validacion, orden) values
    (v_proyecto, 'Para comenzar',      'Pago del primer 50 %', 'Con esto reservamos tu espacio y arrancamos.', 'cliente', true, 1),
    (v_proyecto, 'Para comenzar',      'Excel de inventario con productos, imágenes y descripciones', 'Un archivo con el nombre, precio, descripción e imágenes de cada producto.', 'cliente', true, 2);

  insert into public.tareas (proyecto_id, etapa, titulo, responsable, requiere_validacion, orden) values
    (v_proyecto, 'Propuesta y diseño', 'Propuesta de navegación', 'yellower', false, 3),
    (v_proyecto, 'Propuesta y diseño', 'Diseño visual', 'yellower', false, 4),
    (v_proyecto, 'Propuesta y diseño', 'Aprobación de la propuesta de navegación y el diseño visual', 'cliente', true, 5),
    (v_proyecto, 'Construcción de la tienda', 'Catálogo de productos con fotos y precios', 'yellower', false, 6),
    (v_proyecto, 'Construcción de la tienda', 'Carrito de compras y pago en línea', 'yellower', false, 7),
    (v_proyecto, 'Revisión y publicación', 'Revisión y ajustes', 'yellower', false, 8),
    (v_proyecto, 'Revisión y publicación', 'Publicación', 'yellower', false, 9),
    (v_proyecto, 'Revisión y publicación', 'Tienda lista para empezar a vender', 'yellower', false, 10);
end $$;
