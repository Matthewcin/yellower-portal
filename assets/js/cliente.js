/* Página del cliente: avance del proyecto, etapas, lo que incluye su paquete,
   lo que necesitamos de él y el detalle de tareas. */

import { obtenerDatos } from "./datos.js";
import { WHATSAPP } from "./config.js";
import {
  el, ESTADOS, ESTADO_ETAPA, calcularProgreso, crearBarra, infoFecha, hace, anunciar, bannerDemo, ir,
  agruparEtapas, estadoProyecto, fechaCompleta, lineas,
} from "./ui.js";

bannerDemo();
const datos = obtenerDatos();

const usuario = await datos.sesion();
if (!usuario) ir("index.html");
else if (usuario.sinPerfil) { await datos.salir(); ir("index.html"); }
else iniciar(usuario);

function iniciar(u) {
  const nombre = u.empresa || u.nombre || u.email;
  document.getElementById("saludo").replaceChildren("¡Hola, ", el("em", { texto: nombre }), "!");
  document.getElementById("quien").textContent = u.nombre || u.email;
  if (u.es_admin) document.getElementById("enlaceAdmin").hidden = false;

  document.getElementById("salir").addEventListener("click", async () => { await datos.salir(); ir("index.html"); });
  document.getElementById("actualizar").addEventListener("click", () => cargar(true));

  let proyectos = [];
  let ultimaCarga = 0;
  const abiertos = new Set();   // proyectos cuyo bloque "Listo" está abierto

  async function cargar(manual = false) {
    try {
      proyectos = await datos.misProyectos(u.id);
      ultimaCarga = Date.now();
      pintar();
      if (manual) anunciar("Actualizado.");
    } catch (e) {
      anunciar(e.message, true);
    }
  }

  function pintarHora() {
    document.getElementById("actualizado").textContent = ultimaCarga ? "Actualizado " + hace(new Date(ultimaCarga).toISOString()) : "";
  }

  /* ---------- página ---------- */

  function pintar(enfocarId) {
    const cont = document.getElementById("proyectos");
    if (!proyectos.length) {
      cont.replaceChildren(el("div", { clase: "vacio" },
        el("p", { texto: "Todavía no tienes proyectos aquí." }),
        el("p", { texto: "Escríbenos y activamos tu espacio." })));
    } else {
      cont.replaceChildren(...proyectos.map(bloqueProyecto));
    }
    pintarHora();
    if (enfocarId) {
      // Si la tarea pasó a "Listo" (plegado), el foco va a la siguiente casilla pendiente
      // o al título del proyecto, para que quien usa teclado no pierda su lugar.
      const caja = cont.querySelector('[data-tarea="' + enfocarId + '"] input');
      const siguiente = cont.querySelector(".grupo--tuyo input");
      const titulo = cont.querySelector(".proyecto h2");
      const plegada = caja && caja.closest("details:not([open])");
      (caja && !plegada ? caja : (siguiente || titulo)).focus();
    }
  }

  function bloqueProyecto(p) {
    const tareas = p.tareas;
    const { total, hechas, pct } = calcularProgreso(tareas);
    const etapas = agruparEtapas(tareas);
    const hayEtapas = etapas.length > 1 || (etapas.length === 1 && etapas[0].nombre !== "Otras tareas");
    const incluye = lineas(p.incluye);

    const tuyas = tareas.filter((t) => t.responsable === "cliente" && t.estado !== "hecho");
    const enProceso = tareas.filter((t) => t.responsable !== "cliente" && t.estado === "en_proceso");
    const porHacer = tareas.filter((t) => t.responsable !== "cliente" && t.estado === "pendiente");
    const listas = tareas.filter((t) => t.estado === "hecho");
    const tieneTareasTuyas = tareas.some((t) => t.responsable === "cliente");

    return el("article", { clase: "proyecto", attrs: { "aria-labelledby": "p-" + p.id } },
      tarjetaAvance(p, { total, hechas, pct }, etapas, hayEtapas),

      p.novedad ? el("div", { clase: "callout" },
        el("span", { clase: "callout__marca", attrs: { "aria-hidden": "true" }, texto: "\u2726" }),
        el("div", {},
          el("p", { clase: "callout__titulo", texto: "Lo último de Yellower" }),
          el("p", { texto: p.novedad }),
          el("p", { clase: "callout__fecha", texto: "Actualizado " + hace(p.actualizado) }))) : null,

      incluye.length ? paquete(incluye) : null,

      tuyas.length
        ? grupoTuyo(p, tuyas)
        : (tieneTareasTuyas ? el("p", { clase: "grupo", texto: "\u2713 Estás al día: por ahora no necesitamos nada de ti." }) : null),

      hayEtapas ? el("h3", { clase: "seccion-titulo", texto: "Etapas del proyecto" }) : null,
      hayEtapas ? lineaEtapas(etapas) : null,

      (enProceso.length || porHacer.length || listas.length) ? el("h3", { clase: "seccion-titulo", texto: "Detalle de tareas" }) : null,
      enProceso.length ? grupo("En proceso", enProceso) : null,
      porHacer.length ? grupo("Por hacer", porHacer) : null,
      listas.length ? grupoPlegable("Listo", listas, p.id) : null
    );
  }

  /* ----- tarjeta de avance (oscura) ----- */

  function tarjetaAvance(p, { total, hechas, pct }, etapas, hayEtapas) {
    const est = estadoProyecto(p.tareas);

    let barra;
    if (hayEtapas) {
      barra = el("div", {},
        el("div", { clase: "segmentos", attrs: { role: "img",
          "aria-label": "Avance por etapas: " + etapas.map((e) => e.nombre + " " + e.pct + " %").join(", ") } },
          etapas.map((e) => { const s = el("span", { clase: "segmento" }); s.style.setProperty("--p", e.pct + "%"); return s; })),
        el("div", { clase: "segmentos__leyenda", attrs: { "aria-hidden": "true" } },
          etapas.map((e) => el("span", { texto: e.nombre }))));
    } else {
      barra = crearBarra(pct, "Progreso de " + p.nombre);
      barra.classList.add("barra--tinta");
    }

    return el("section", { clase: "hero-proyecto sobre-tinta" },
      el("div", { clase: "hero-proyecto__fila" },
        p.servicio ? el("span", { clase: "eyebrow", texto: p.servicio }) : el("span"),
        el("span", { clase: "etiqueta--estado etiqueta", texto: est.icono + " " + est.texto })),
      el("h2", { texto: p.nombre, attrs: { id: "p-" + p.id, tabindex: "-1" } }),
      el("div", { clase: "hero-proyecto__cifra" },
        el("span", { clase: "pct" }, String(pct), el("small", { texto: "%" })),
        el("span", { clase: "hero-proyecto__listas", texto: total ? hechas + " de " + total + " tareas listas" : "Sin tareas todavía" })),
      barra,
      (p.plazo || p.entrega_estimada) ? el("ul", { clase: "datos" },
        p.plazo ? el("li", { clase: "etiqueta etiqueta--oscura", texto: "Plazo: " + p.plazo }) : null,
        p.entrega_estimada ? el("li", { clase: "etiqueta etiqueta--oscura", texto: "Entrega estimada: " + fechaCompleta(p.entrega_estimada) }) : null) : null);
  }

  /* ----- lo que incluye el paquete ----- */

  function paquete(items) {
    return el("section", { clase: "paquete" },
      el("h3", { clase: "seccion-titulo seccion-titulo--primero", texto: "Tu paquete incluye" }),
      el("ul", { clase: "paquete__rejilla" }, items.map((txt, i) =>
        el("li", { clase: "paquete__item" },
          el("span", { clase: "paquete__num", attrs: { "aria-hidden": "true" }, texto: String(i + 1).padStart(2, "0") }),
          el("p", { clase: "paquete__texto", texto: txt })))));
  }

  /* ----- línea de etapas ----- */

  function lineaEtapas(etapas) {
    return el("ol", { clase: "etapas" }, etapas.map((e, i) => {
      const est = ESTADO_ETAPA[e.estado];
      return el("li", { clase: "etapa etapa--" + e.estado },
        el("span", { clase: "etapa__num", attrs: { "aria-hidden": "true" }, texto: e.estado === "completa" ? "\u2713" : String(i + 1) }),
        el("div", { clase: "etapa__cuerpo" },
          el("div", { clase: "etapa__cabecera" },
            el("h4", { texto: e.nombre }),
            el("span", { clase: "etiqueta", texto: est.icono + " " + est.texto })),
          crearBarra(e.pct, "Avance de " + e.nombre),
          el("p", { clase: "etapa__conteo", texto: e.hechas + " de " + e.total + (e.total === 1 ? " tarea" : " tareas") })));
    }));
  }

  /* ----- necesitamos de ti ----- */

  function conteo(n) { return el("span", { clase: "grupo__conteo", texto: String(n) }); }

  function grupoTuyo(p, tareas) {
    const mensaje = "Hola Yellower, soy " + nombre + ". Les escribo sobre mi proyecto \"" + p.nombre + "\".";
    const hayConfirma = tareas.some((t) => t.requiere_validacion);
    return el("section", { clase: "grupo grupo--tuyo" },
      el("h3", { clase: "grupo__titulo" }, "Necesitamos de ti", conteo(tareas.length)),
      el("ul", { clase: "lista" }, tareas.map(fila)),
      hayConfirma ? el("div", { clase: "tuyo__accion" },
        el("p", { texto: "Cuando lo tengas listo, envíanoslo por WhatsApp. Lo revisamos y lo marcamos aquí." }),
        el("a", { clase: "btn btn--pequeno flecha", texto: "Escribirnos por WhatsApp",
          attrs: { href: WHATSAPP + "?text=" + encodeURIComponent(mensaje), target: "_blank", rel: "noopener" } })) : null);
  }

  /* ----- detalle ----- */

  function grupo(titulo, tareas) {
    return el("section", { clase: "grupo" },
      el("h3", { clase: "grupo__titulo" }, titulo, conteo(tareas.length)),
      el("ul", { clase: "lista" }, tareas.map(fila)));
  }

  function grupoPlegable(titulo, tareas, clave) {
    const d = el("details", { clase: "grupo" },
      el("summary", {}, titulo, conteo(tareas.length)),
      el("ul", { clase: "lista" }, tareas.map(fila)));
    d.open = abiertos.has(clave);
    d.addEventListener("toggle", () => { if (d.open) abiertos.add(clave); else abiertos.delete(clave); });
    return d;
  }

  function fila(t) {
    const esTuya = t.responsable === "cliente";
    const puedeMarcar = esTuya && !t.requiere_validacion;
    const fecha = infoFecha(t.fecha_limite, t.estado);
    const estado = ESTADOS[t.estado];

    let marca;
    if (puedeMarcar) {
      const entrada = el("input", { attrs: { type: "checkbox", "aria-label": "Marcar como hecho: " + t.titulo } });
      entrada.checked = t.estado === "hecho";
      entrada.addEventListener("change", () => alMarcar(t, entrada));
      marca = el("label", { clase: "casilla" }, entrada, el("span", { clase: "casilla__caja", attrs: { "aria-hidden": "true" } }));
    } else {
      marca = el("span", { clase: "icono-estado icono-estado--" + (esTuya && t.estado !== "hecho" ? "espera" : t.estado), attrs: { "aria-hidden": "true" }, texto: estado.icono });
    }

    return el("li", { clase: "fila" + (t.estado === "hecho" ? " fila--hecho" : ""), attrs: { "data-tarea": t.id } },
      marca,
      el("div", {},
        t.etapa ? el("span", { clase: "fila__etapa", texto: t.etapa }) : null,
        el("p", { clase: "fila__titulo", texto: t.titulo }),
        t.detalle ? el("p", { clase: "fila__detalle", texto: t.detalle }) : null),
      el("div", { clase: "fila__meta" },
        el("span", { clase: "etiqueta" + (esTuya ? " etiqueta--tu" : ""), texto: esTuya ? "Tú" : "Yellower" }),
        esTuya && t.requiere_validacion && t.estado !== "hecho" ? el("span", { clase: "etiqueta", texto: "La confirmamos nosotros" }) : null,
        esTuya ? null : el("span", { clase: "etiqueta", texto: estado.icono + " " + estado.texto }),
        esTuya && t.estado === "hecho" && t.requiere_validacion ? el("span", { clase: "etiqueta", texto: "\u2713 Recibido" }) : null,
        fecha ? el("span", { clase: "etiqueta" + (fecha.vencida ? " etiqueta--vencida" : ""),
          texto: fecha.vencida ? "Vencida · " + fecha.texto : "Para el " + fecha.texto }) : null));
  }

  async function alMarcar(t, entrada) {
    const nuevo = entrada.checked ? "hecho" : "pendiente";
    entrada.disabled = true;
    try {
      await datos.marcarTarea(t.id, nuevo);
      t.estado = nuevo;
      pintar(t.id);
      anunciar(nuevo === "hecho" ? "Listo, lo marcamos como hecho. Gracias." : "Lo dejamos como pendiente.");
    } catch (e) {
      entrada.checked = !entrada.checked;
      entrada.disabled = false;
      anunciar(e.message, true);
    }
  }

  // Se actualiza solo: al volver a la pestaña y cada minuto mientras está visible.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - ultimaCarga > 15000) cargar();
  });
  setInterval(() => { if (document.visibilityState === "visible") cargar(); }, 60000);
  setInterval(pintarHora, 30000);

  cargar();
}
