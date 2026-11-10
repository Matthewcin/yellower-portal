# Yellower Portal (versión sencilla)

Un login y una página donde cada cliente ve el progreso de su proyecto y lo que necesitamos de él,
estilo página de Notion. Yellower lo actualiza desde un panel sencillo.

- **Cliente** (`/proyectos/`): tarjeta de avance con porcentaje grande y barra por etapas, "Lo último de
  Yellower", lo que incluye su paquete, "Necesitamos de ti", línea de etapas con su propia barra y el
  detalle de tareas.
- **Yellower** (`/admin/`): elige un cliente, edita su proyecto, escribe "Lo último" y administra
  las tareas (quién la hace, estado, fecha, orden). Todo se guarda solo.
- **Login** (`/`): usuario (ej. SUPERSAFETY) o correo, y contraseña. No hay registro público: Yellower crea las cuentas.

Guía paso a paso: [docs/PUBLICAR.md](docs/PUBLICAR.md)

## Archivos

```
/ · /proyectos/ · /admin/     Las 3 pantallas
assets/js/config.js                          Aquí se pegan los 2 datos de Supabase
assets/js/datos.js                           Conexión con Supabase (y modo demo)
assets/css, fonts, vendor                    Diseño, Work Sans y supabase-js (todo dentro del repo)
sql/01-esquema.sql                           Las 3 tablas y las reglas de seguridad
sql/02-ejemplo-opcional.sql                  Proyecto de ejemplo
sql/03-super-safety.sql                      Carga el proyecto Tienda Online de Super Safety Global
sql/pruebas/                                 Pruebas de seguridad (para quien programe)
docs/PUBLICAR.md                             Cómo ponerlo en línea
```

## Cómo funciona la seguridad (en corto)

- Cada cliente solo puede ver sus proyectos y sus tareas. Lo impone la base de datos, no la página.
- El cliente solo puede marcar como hechas las tareas que son suyas. No puede cambiar títulos,
  estados de Yellower, crear ni borrar nada, ni darse permisos de admin.
- Sin iniciar sesión no se puede leer ni escribir nada.
- Todo lo que escribe un usuario se muestra como texto (nunca como código).
- No se guardan secretos en el repositorio: la clave `anon` es pública por diseño.
