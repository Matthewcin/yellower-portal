/* =====================================================================
   CAPA DE DATOS
   Dos implementaciones con la MISMA interfaz:
     - Supabase (cuando config.js tiene la URL y la anon key)
     - Demo (datos de ejemplo en el navegador, sin servidor)
   El resto de la página no sabe cuál está usando.
   ===================================================================== */

import { SUPABASE_URL, SUPABASE_ANON_KEY, MODO_DEMO, DOMINIO_USUARIOS } from "./config.js";
import { ordenarTareas } from "./ui.js";

/** Traduce errores técnicos a mensajes claros en español. */
function mensajeDe(error, porDefecto) {
  const m = String((error && error.message) || error || "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Usuario o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Tu correo aún no está confirmado. Escríbenos y lo activamos.";
  if (m.includes("failed to fetch") || m.includes("network")) return "No pudimos conectar. Revisa tu internet e intenta de nuevo.";
  if (m.includes("permission") || m.includes("row-level") || m.includes("42501")) return "No tienes permiso para hacer este cambio.";
  return porDefecto;
}

/* ===================================================================== */
/* SUPABASE                                                              */
/* ===================================================================== */

function crearSupabase() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("No se cargó la librería de Supabase.");
  }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  async function perfilDe(user) {
    const { data, error } = await sb.from("perfiles")
      .select("id,email,nombre,empresa,es_admin").eq("id", user.id).maybeSingle();
    if (error) throw new Error(mensajeDe(error, "No pudimos cargar tu perfil."));
    return data || { id: user.id, email: user.email || "", nombre: "", empresa: "", es_admin: false, sinPerfil: true };
  }

  const comoProyecto = (p) => ({ ...p, tareas: ordenarTareas(p.tareas || []) });
  const fallar = (error, texto) => { throw new Error(mensajeDe(error, texto)); };

  return {
    demo: false,

    async sesion() {
      const { data } = await sb.auth.getSession();
      return data.session ? perfilDe(data.session.user) : null;
    },
    async entrar(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) fallar(error, "No pudimos iniciar sesión.");
      return perfilDe(data.user);
    },
    async salir() { await sb.auth.signOut(); },

    /* ----- cliente ----- */
    async misProyectos(userId) {
      const { data, error } = await sb.from("proyectos").select("*, tareas(*)")
        .eq("cliente_id", userId).order("creado", { ascending: false });
      if (error) fallar(error, "No pudimos cargar tus proyectos.");
      return data.map(comoProyecto);
    },
    async marcarTarea(id, estado) {
      const { data, error } = await sb.from("tareas").update({ estado }).eq("id", id).select("id");
      if (error) fallar(error, "No pudimos guardar el cambio.");
      if (!data || data.length !== 1) throw new Error("No tienes permiso para hacer este cambio.");
    },

    /* ----- admin ----- */
    async listarClientes() {
      const { data, error } = await sb.from("perfiles").select("id,email,nombre,empresa,es_admin")
        .eq("es_admin", false).order("empresa").order("email");
      if (error) fallar(error, "No pudimos cargar los clientes.");
      return data;
    },
    async actualizarPerfil(id, campos) {
      const { data, error } = await sb.from("perfiles").update(campos).eq("id", id).select("id");
      if (error) fallar(error, "No pudimos guardar el cliente.");
      if (!data || data.length !== 1) throw new Error("No tienes permiso para hacer este cambio.");
    },
    async proyectosDe(clienteId) {
      const { data, error } = await sb.from("proyectos").select("*, tareas(*)")
        .eq("cliente_id", clienteId).order("creado", { ascending: true });
      if (error) fallar(error, "No pudimos cargar los proyectos.");
      return data.map(comoProyecto);
    },
    async crearProyecto(campos) {
      const { data, error } = await sb.from("proyectos").insert(campos).select("*, tareas(*)").single();
      if (error) fallar(error, "No pudimos crear el proyecto.");
      return comoProyecto(data);
    },
    async actualizarProyecto(id, campos) {
      const { error } = await sb.from("proyectos").update(campos).eq("id", id);
      if (error) fallar(error, "No pudimos guardar el proyecto.");
    },
    async borrarProyecto(id) {
      const { error } = await sb.from("proyectos").delete().eq("id", id);
      if (error) fallar(error, "No pudimos borrar el proyecto.");
    },
    async crearTarea(campos) {
      const { data, error } = await sb.from("tareas").insert(campos).select("*").single();
      if (error) fallar(error, "No pudimos agregar la tarea.");
      return data;
    },
    async actualizarTarea(id, campos) {
      const { error } = await sb.from("tareas").update(campos).eq("id", id);
      if (error) fallar(error, "No pudimos guardar la tarea.");
    },
    async borrarTarea(id) {
      const { error } = await sb.from("tareas").delete().eq("id", id);
      if (error) fallar(error, "No pudimos borrar la tarea.");
    },
  };
}

/* ===================================================================== */
/* DEMO (sin servidor)                                                   */
/* ===================================================================== */

const CLAVE_DEMO = "yellower_portal_demo_v2";   // v2: demo de Super Safety

function sembrarDemo() {
  // DEMO de Super Safety Global: solo para ver el diseño. La contraseña de la demo es "demo".
  // La cuenta real se crea en Supabase (ver docs/PUBLICAR.md): su contraseña NO está en este código.
  const ahora = new Date().toISOString();
  const idAdmin = "demo-admin", idCliente = "demo-supersafety", idProyecto = "demo-tienda";
  let n = 0;
  const t = (etapa, titulo, responsable, extra = {}) => ({
    id: "demo-t" + (++n), proyecto_id: idProyecto, titulo, detalle: extra.detalle || "", etapa,
    responsable, estado: extra.estado || "pendiente", requiere_validacion: !!extra.valida,
    fecha_limite: null, orden: n, creado: ahora, actualizado: ahora,
  });
  return {
    usuarios: [
      { id: idAdmin, email: "admin@demo", password: "demo" },
      { id: idCliente, email: "supersafety@" + DOMINIO_USUARIOS, password: "demo" },
    ],
    perfiles: [
      { id: idAdmin, email: "admin@demo", nombre: "Yani (demo)", empresa: "Yellower", es_admin: true },
      { id: idCliente, email: "supersafety@" + DOMINIO_USUARIOS, nombre: "Super Safety", empresa: "Super Safety Global", es_admin: false },
    ],
    proyectos: [{
      id: idProyecto, cliente_id: idCliente, nombre: "Tienda Online", servicio: "Diseño web",
      plazo: "9 días hábiles", entrega_estimada: null,
      incluye: "Catálogo de productos con fotos y precios\nActualización web\nCarrito de compras y pago en línea\nTodo listo para empezar a vender",
      novedad: "Estamos listos para empezar tu tienda online. Para comenzar necesitamos el primer 50 % del pago, tu Excel con el inventario y tu aprobación de la propuesta de navegación y el diseño visual.",
      creado: ahora, actualizado: ahora,
    }],
    tareas: [
      t("Para comenzar", "Pago del primer 50 %", "cliente", { valida: true, detalle: "Con esto reservamos tu espacio y arrancamos." }),
      t("Para comenzar", "Excel de inventario con productos, imágenes y descripciones", "cliente", { valida: true, detalle: "Un archivo con el nombre, precio, descripción e imágenes de cada producto." }),
      t("Propuesta y diseño", "Propuesta de navegación", "yellower"),
      t("Propuesta y diseño", "Diseño visual", "yellower"),
      t("Propuesta y diseño", "Aprobación de la propuesta de navegación y el diseño visual", "cliente", { valida: true }),
      t("Construcción de la tienda", "Catálogo de productos con fotos y precios", "yellower"),
      t("Construcción de la tienda", "Carrito de compras y pago en línea", "yellower"),
      t("Revisión y publicación", "Revisión y ajustes", "yellower"),
      t("Revisión y publicación", "Publicación", "yellower"),
      t("Revisión y publicación", "Tienda lista para empezar a vender", "yellower"),
    ],
    sesion: null,
  };
}

function crearDemo() {
  const leer = () => {
    try { const raw = localStorage.getItem(CLAVE_DEMO); if (raw) return JSON.parse(raw); } catch (e) { /* se resiembra */ }
    const base = sembrarDemo(); localStorage.setItem(CLAVE_DEMO, JSON.stringify(base)); return base;
  };
  const guardar = (db) => localStorage.setItem(CLAVE_DEMO, JSON.stringify(db));
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  const conTareas = (db, p) => ({ ...p, tareas: ordenarTareas(db.tareas.filter((t) => t.proyecto_id === p.id)) });
  const quien = (db) => db.perfiles.find((p) => p.id === db.sesion);
  const soloAdmin = (db) => { const u = quien(db); if (!u || !u.es_admin) throw new Error("No tienes permiso para hacer este cambio."); };

  return {
    demo: true,

    async sesion() { const db = leer(); return quien(db) || null; },
    async entrar(email, password) {
      const db = leer();
      const u = db.usuarios.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
      if (!u) throw new Error("Usuario o contraseña incorrectos.");
      db.sesion = u.id; guardar(db);
      return quien(db);
    },
    async salir() { const db = leer(); db.sesion = null; guardar(db); },

    async misProyectos(userId) {
      const db = leer();
      return db.proyectos.filter((p) => p.cliente_id === userId).map((p) => conTareas(db, p));
    },
    async marcarTarea(idTarea, estado) {
      const db = leer(); const u = quien(db);
      const t = db.tareas.find((x) => x.id === idTarea);
      const p = t && db.proyectos.find((x) => x.id === t.proyecto_id);
      // Misma regla que la base de datos real: solo tus pendientes, solo hecho/pendiente.
      if (!u || !t || !p || p.cliente_id !== u.id || t.responsable !== "cliente" || t.requiere_validacion || !["pendiente", "hecho"].includes(estado)) {
        throw new Error("No tienes permiso para hacer este cambio.");
      }
      t.estado = estado; t.actualizado = new Date().toISOString(); guardar(db);
    },

    async listarClientes() {
      const db = leer(); soloAdmin(db);
      return db.perfiles.filter((p) => !p.es_admin);
    },
    async actualizarPerfil(idPerfil, campos) {
      const db = leer(); soloAdmin(db);
      Object.assign(db.perfiles.find((p) => p.id === idPerfil), campos); guardar(db);
    },
    async proyectosDe(clienteId) {
      const db = leer(); soloAdmin(db);
      return db.proyectos.filter((p) => p.cliente_id === clienteId).map((p) => conTareas(db, p));
    },
    async crearProyecto(campos) {
      const db = leer(); soloAdmin(db);
      const p = { id: id(), novedad: "", servicio: "", plazo: "", entrega_estimada: null, incluye: "", ...campos, creado: new Date().toISOString(), actualizado: new Date().toISOString() };
      db.proyectos.push(p); guardar(db); return conTareas(db, p);
    },
    async actualizarProyecto(idProyecto, campos) {
      const db = leer(); soloAdmin(db);
      Object.assign(db.proyectos.find((p) => p.id === idProyecto), campos, { actualizado: new Date().toISOString() }); guardar(db);
    },
    async borrarProyecto(idProyecto) {
      const db = leer(); soloAdmin(db);
      db.proyectos = db.proyectos.filter((p) => p.id !== idProyecto);
      db.tareas = db.tareas.filter((t) => t.proyecto_id !== idProyecto); guardar(db);
    },
    async crearTarea(campos) {
      const db = leer(); soloAdmin(db);
      const t = { id: id(), detalle: "", responsable: "yellower", estado: "pendiente", fecha_limite: null, orden: 0, etapa: "", requiere_validacion: false, ...campos,
        creado: new Date().toISOString(), actualizado: new Date().toISOString() };
      db.tareas.push(t); guardar(db); return t;
    },
    async actualizarTarea(idTarea, campos) {
      const db = leer(); soloAdmin(db);
      Object.assign(db.tareas.find((t) => t.id === idTarea), campos, { actualizado: new Date().toISOString() }); guardar(db);
    },
    async borrarTarea(idTarea) {
      const db = leer(); soloAdmin(db);
      db.tareas = db.tareas.filter((t) => t.id !== idTarea); guardar(db);
    },
  };
}

export function obtenerDatos() {
  return MODO_DEMO ? crearDemo() : crearSupabase();
}
