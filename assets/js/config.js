/* =====================================================================
   CONFIGURACIÓN — son solo 2 datos de Supabase.
   Los encuentras en Supabase > Project Settings > API:
     - "Project URL"
     - "anon public" key

   La anon key es pública por diseño (todo el que abra la página la ve).
   La protección real son las reglas de seguridad de la base de datos.
   NUNCA pegues aquí la "service_role" key.

   Mientras estén vacías, el portal funciona en MODO DEMO (datos de ejemplo
   guardados solo en tu navegador). Sirve para ver cómo se ve.
   ===================================================================== */

export const SUPABASE_URL = "https://lvsokbjbvbgfdckxsygx.supabase.co";        // ej: "https://abcdxyz.supabase.co"
export const SUPABASE_ANON_KEY = "sb_publishable_SLHIL-PYxM3_NOPbD8gaOw_mMd-UEJ1";   // ej: "eyJhbGciOi..."

// Los clientes pueden entrar con un USUARIO (ej: SUPERSAFETY) en vez de un correo.
// Internamente se convierte en usuario@clientes.yellowerdesignstudio.com.
// Al crear al cliente en Supabase usa ese correo (ver docs/PUBLICAR.md). Ese dominio
// no necesita buzones: aquí no se envían correos.
export const DOMINIO_USUARIOS = "clientes.yellowerdesignstudio.com";

export const WHATSAPP = "https://wa.me/573134553455";
export const SITIO = "https://yellowerdesignstudio.com/";

export const MODO_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
