-- =====================================================================
-- OPCIONAL: crea un proyecto de EJEMPLO para ver el portal con datos.
-- 1) Cambia el correo de abajo por el de un cliente que ya creaste en
--    Authentication > Users.
-- 2) Pégalo en SQL Editor y ejecútalo.
-- Todo queda marcado como (EJEMPLO). Puedes borrarlo desde el panel.
-- =====================================================================
do $$
declare
  v_correo text := 'cliente@ejemplo.com';        -- << CAMBIA ESTE CORREO
  v_cliente uuid;
  v_proyecto uuid;
begin
  select id into v_cliente from public.perfiles where email = lower(v_correo);
  if v_cliente is null then
    raise exception 'No existe un cliente con el correo %. Créalo primero en Authentication > Users.', v_correo;
  end if;

  insert into public.proyectos (cliente_id, nombre, servicio, novedad)
  values (v_cliente, 'Proyecto de prueba (EJEMPLO)', 'Diseño web',
          'Este es un proyecto de ejemplo. Aquí escribes lo último que quieres contarle al cliente.')
  returning id into v_proyecto;

  insert into public.tareas (proyecto_id, titulo, detalle, responsable, estado, orden) values
    (v_proyecto, 'Planificación',                 '',                                'yellower', 'hecho',      1),
    (v_proyecto, 'Bocetos y estructura',          '',                                'yellower', 'en_proceso', 2),
    (v_proyecto, 'Enviar logo en alta calidad',   'Preferiblemente PNG o SVG.',      'cliente',  'pendiente',  3),
    (v_proyecto, 'Diseño visual',                 '',                                'yellower', 'pendiente',  4);
end $$;
