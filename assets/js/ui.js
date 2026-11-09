/* Ayudas de interfaz. Todo el contenido se inserta con textContent (nunca innerHTML),
   así nada de lo que escriba un usuario puede ejecutar código. */

import { MODO_DEMO, DOMINIO_USUARIOS } from "./config.js";

/** Crea un elemento: el("div", { clase:"x", texto:"hola", attrs:{...}, on:{click:fn} }, ...hijos) */
export function el(etiqueta, props = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  if (props.clase) nodo.className = props.clase;
  if (props.texto !== undefined) nodo.textContent = props.texto;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) if (v !== null && v !== undefined) nodo.setAttribute(k, v);
  if (props.on) for (const [ev, fn] of Object.entries(props.on)) nodo.addEventListener(ev, fn);
  for (const h of hijos.flat()) {
    if (h === null || h === undefined || h === false) continue;
    nodo.append(h.nodeType ? h : document.createTextNode(String(h)));
  }
  return nodo;
}

export const ESTADOS = {
  pendiente:  { icono: "\u25CB", texto: "Pendiente" },
  en_proceso: { icono: "\u25D0", texto: "En proceso" },
  hecho:      { icono: "\u2713", texto: "Hecho" },
};

/** Progreso simple: tareas hechas / total. */
export function calcularProgreso(tareas) {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.estado === "hecho").length;
  return { total, hechas, pct: total ? Math.round((hechas / total) * 100) : 0 };
}

export function ordenarTareas(tareas) {
  return [...tareas].sort((a, b) => (a.orden - b.orden) || String(a.creado).localeCompare(String(b.creado)));
}

/** Barra de progreso. El ancho llega por --p desde JS (compatible con la CSP). */
export function crearBarra(pct, etiqueta) {
  const barra = el("div", { clase: "barra", attrs: {
    role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100",
    "aria-valuenow": String(pct), "aria-label": etiqueta || "Progreso" } },
    el("span", { clase: "barra__relleno" }));
  barra.style.setProperty("--p", pct + "%");
  return barra;
}

const hoyISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};

/** "2026-11-12" -> { texto: "12 nov", vencida: boolean } */
export function infoFecha(iso, estado) {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return { texto: d + " " + meses[m - 1], vencida: estado !== "hecho" && iso < hoyISO() };
}

/** "hace 5 min" */
export function hace(iso) {
  if (!iso) return "";
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return "hace un momento";
  if (seg < 3600) return "hace " + Math.floor(seg / 60) + " min";
  if (seg < 86400) return "hace " + Math.floor(seg / 3600) + " h";
  return "hace " + Math.floor(seg / 86400) + " d";
}

/** Mensaje para lectores de pantalla y confirmación visible (sin movimiento). */
export function anunciar(mensaje, esError = false) {
  const zona = document.getElementById("estado");
  if (!zona) return;
  zona.textContent = mensaje;
  zona.classList.toggle("estado--error", esError);
}

/** Franja visible cuando se está viendo el modo demo. */
export function bannerDemo() {
  if (!MODO_DEMO) return;
  const franja = el("div", { clase: "demo-franja", attrs: { role: "note" } },
    el("strong", { texto: "MODO DEMO" }),
    " Datos de ejemplo guardados solo en este navegador. No hay conexión con Supabase.");
  document.body.prepend(franja);
}

export function ir(pagina) { window.location.replace(pagina); }


/** "SUPERSAFETY" -> "supersafety@clientes.yellowerdesignstudio.com"; un correo se deja igual. */
export function aCorreo(valor) {
  const v = String(valor || "").trim().toLowerCase();
  return v.includes("@") ? v : v + "@" + DOMINIO_USUARIOS;
}

export const ESTADO_ETAPA = {
  completa:     { icono: "\u2713", texto: "Completa" },
  en_curso:     { icono: "\u25D0", texto: "En curso" },
  por_comenzar: { icono: "\u25CB", texto: "Por comenzar" },
};

/** Agrupa las tareas por etapa (en el orden en que aparecen) y calcula el avance de cada una. */
export function agruparEtapas(tareas) {
  const mapa = new Map();
  for (const t of tareas) {
    const nombre = (t.etapa || "").trim() || "Otras tareas";
    if (!mapa.has(nombre)) mapa.set(nombre, []);
    mapa.get(nombre).push(t);
  }
  return [...mapa].map(([nombre, lista]) => {
    const p = calcularProgreso(lista);
    const hayMovimiento = lista.some((t) => t.estado !== "pendiente");
    const estado = p.hechas === p.total ? "completa" : (hayMovimiento ? "en_curso" : "por_comenzar");
    return { nombre, tareas: lista, ...p, estado };
  });
}

/** Estado general del proyecto. */
export function estadoProyecto(tareas) {
  const { total, hechas } = calcularProgreso(tareas);
  if (!total) return { icono: "\u25CB", texto: "Por comenzar" };
  if (hechas === total) return { icono: "\u2713", texto: "Completado" };
  const hayMovimiento = tareas.some((t) => t.estado !== "pendiente");
  return hayMovimiento ? { icono: "\u25D0", texto: "En proceso" } : { icono: "\u25CB", texto: "Por comenzar" };
}

/** "2026-12-01" -> "1 de diciembre de 2026" */
export function fechaCompleta(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return d + " de " + meses[m - 1] + " de " + a;
}

/** Texto con un ítem por línea -> lista limpia. */
export function lineas(texto) {
  return String(texto || "").split("\n").map((s) => s.trim()).filter(Boolean);
}
