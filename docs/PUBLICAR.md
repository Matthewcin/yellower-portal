# Cómo poner el portal en línea (unos 30 minutos)

No necesitas programar. Son tres partes: **A)** la base de datos, **B)** conectar la página,
**C)** publicarla en `portal.yellowerdesignstudio.com`. Después, **D)** cargar a Super Safety.

Antes de publicar, ábrelo en tu computador para verlo en **modo demo**.

---

## Ver el portal en modo demo (sin configurar nada)

1. Descomprime la carpeta.
2. Abre una terminal dentro de ella y ejecuta: `python3 -m http.server 8080`
3. Abre `http://localhost:8080` en el navegador.
4. Entra con el usuario `SUPERSAFETY` y la contraseña `demo` para ver lo que ve el cliente, o con
   `admin@demo` / `demo` para ver el panel donde tú actualizas.

El modo demo guarda los cambios solo en tu navegador. La contraseña `demo` es solo de la demo: la
contraseña real de cada cliente la creas tú en Supabase y **no se escribe en ningún archivo**.

---

## A. Base de datos en Supabase

1. Entra a **supabase.com** y crea un proyecto nuevo.
   - Nombre: `yellower-portal`
   - Región: **South America (São Paulo)**
   - Contraseña de la base de datos: genérala y **guárdala en tu gestor de contraseñas**.
2. Menú **SQL Editor** > **New query**. Abre `sql/01-esquema.sql`, copia todo, pégalo y pulsa **Run**.
   Debe decir "Success".
3. Menú **Authentication** > **Users** > **Add user** > **Create new user**.
   Escribe **tu correo** y una contraseña larga, y marca **Auto Confirm User**. Esta será tu cuenta.
4. Vuelve a **SQL Editor** y ejecuta esto, con tu correo:

   ```sql
   update public.perfiles set es_admin = true where email = 'TU-CORREO@ejemplo.com';
   ```
5. Menú **Authentication** > **Sign In / Providers** (en algunas versiones, **Providers**) >
   **Email**: apaga **"Allow new users to sign up"**. Así nadie puede registrarse solo.

## B. Conectar la página

1. En Supabase, **Project Settings** > **API**. Copia el **Project URL** y la clave **anon public**.
2. Abre `assets/js/config.js` y pega los dos datos entre las comillas:

   ```js
   export const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
3. Guarda. La franja amarilla de "MODO DEMO" desaparece cuando está bien conectado.

> La clave **anon** es pública por diseño. La seguridad está en la base de datos (cada cliente solo
> ve lo suyo). **Nunca** pegues la clave `service_role` en ningún archivo.

## C. Publicarlo en `portal.yellowerdesignstudio.com`

1. En GitHub crea un repositorio `yellower-portal` y sube todo el contenido. Puede ser **público**:
   no contiene ningún secreto ni contraseña.
2. **Settings** > **Pages** > publicar desde la rama `main`, carpeta `/ (root)`.
3. Crea en la raíz un archivo `CNAME` con una sola línea: `portal.yellowerdesignstudio.com`
4. En el DNS de tu dominio agrega **un** registro:

   | Tipo | Nombre | Destino |
   |---|---|---|
   | `CNAME` | `portal` | `TU-USUARIO.github.io` |

   No toques ningún otro registro: son los de tu web principal.
5. Cuando GitHub verifique el dominio, en **Settings > Pages** marca **Enforce HTTPS**.

---

## D. Cargar a Super Safety Global

Los clientes entran con un **usuario** (no tienen que recordar un correo). El usuario `SUPERSAFETY`
equivale internamente al correo `supersafety@clientes.yellowerdesignstudio.com`. Ese dominio no
necesita buzones: aquí no se envían correos.

1. Supabase > **Authentication** > **Users** > **Add user** > **Create new user**:
   - **Email:** `supersafety@clientes.yellowerdesignstudio.com`
   - **Password:** la que tú elijas. Usa una larga y única (no el nombre de la empresa más un año).
   - Marca **Auto Confirm User**.
2. **SQL Editor** > pega y ejecuta `sql/03-super-safety.sql`. Carga el proyecto **Tienda Online**
   con sus 10 tareas, las 4 cosas que incluye el paquete y el plazo de 9 días hábiles.
3. Entra como cliente con `SUPERSAFETY` y su contraseña para ver cómo lo ve.
4. Envíale por WhatsApp el enlace del portal, su usuario y su contraseña.

Todo arranca en **0 %** y todas las tareas en "pendiente": no se marca ningún avance que no haya pasado.

---

## Uso diario

### Agregar un cliente nuevo
1. Supabase > **Authentication** > **Users** > **Add user**:
   - Email: `usuario@clientes.yellowerdesignstudio.com` (cambia `usuario` por el nombre corto
     del cliente, sin espacios, por ejemplo `lacasita`).
   - Una contraseña, y **Auto Confirm User**.
2. En el panel pulsa **Actualizar lista**: el cliente aparece.
3. Complétale **Nombre** y **Empresa** (la empresa es la que saluda: "¡Hola, Empresa!").
4. Crea su proyecto con **+ Nuevo proyecto** y agrega sus tareas.
5. Envíale por WhatsApp su usuario, su contraseña y el enlace.

(También puede entrar con un correo normal: crea el usuario con ese correo y úsalo para entrar.)

### Qué significa cada campo
- **Etapa:** agrupa las tareas. Cada etapa se ve como una tarjeta con su propia barra de avance.
- **Hace: Yellower / el cliente:** quién tiene que hacerla. Las del cliente salen en "Necesitamos de ti".
- **La confirma Yellower:** actívalo para el pago, el material y las aprobaciones. El cliente las ve
  pero **no puede marcarlas**: las marcas tú cuando las recibes.
  Si no lo activas, el cliente puede marcar esa tarea como hecha él mismo.
- **Plazo / Entrega estimada:** salen como etiquetas en la tarjeta de avance.
- **Qué incluye su paquete:** un ítem por línea; se ve como tarjetas numeradas.
- **Lo último:** el recuadro amarillo que ve el cliente arriba de todo.
- **El porcentaje** se calcula solo: tareas hechas dividido entre el total.

### Si un cliente olvida su contraseña
En Supabase > Authentication > Users, abre su usuario y crea una nueva contraseña.

---

## Opcional
- `sql/02-ejemplo-opcional.sql`: crea un proyecto de ejemplo con datos de prueba.
- `_headers`: solo lo usa Cloudflare Pages. En GitHub Pages se ignora y no pasa nada: la seguridad
  importante la impone la base de datos.
