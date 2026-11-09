# Pruebas de seguridad de la base de datos (para quien programe)

No hace falta usarlas para publicar el portal. Sirven para comprobar que las reglas de
seguridad siguen intactas si algún día se modifica `01-esquema.sql`.

Necesitan un Postgres local (no tu proyecto de Supabase):

    createdb portal_test
    psql -d portal_test -f 00-simular-supabase.sql   # imita auth.uid() y los roles de Supabase
    psql -d portal_test -f ../01-esquema.sql
    psql -d portal_test -f 10-pruebas-de-seguridad.sql

Resultado esperado: `== 46 pasan, 0 fallan, de 46`.
Cubre: un cliente no ve ni toca datos de otro, no puede darse permisos de admin, solo marca
sus propios pendientes, y sin sesión no se puede leer ni escribir nada.
