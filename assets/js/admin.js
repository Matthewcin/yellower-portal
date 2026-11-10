/* Panel de Yellower: elegir cliente, editar su proyecto, la novedad y la lista de tareas.
   Las tareas se guardan solas al cambiar un campo. La seguridad real está en la base de
   datos: aunque alguien abriera esta página, solo un admin puede escribir. */

import { obtenerDatos } from "./datos.js";
import { el, ESTADOS, calcularProgreso, crearBarra, ordenarTareas, hace, anunciar, bannerDemo, ir } from "./ui.js";

bannerDemo();
const datos = obtenerDatos();

const usuario = await datos.sesion();
if (!usuario) ir("/");
else if (!usuario.es_admin) ir("/proyectos/");
else iniciar(usuario);

function iniciar(u) {
  document.getElementById("quien").textContent = u.nombre || u.email;
  document.getElementById("salir").addEventListener("click", async () => { await datos.salir(); ir("/"); });

  const S = { clientes: [], cliente: null, proyectos: [], proyecto: null, nuevoProyecto: false };
  const lateral = document.getElementById("lateral");
  const principal = document.getElementById("principal");

  const ok = (m) => anunciar(m);
  const mal = (e) => anunciar(e.message || String(e), true);

  /* ---------- carga ---------- */

  async function cargarClientes(seleccionar) {
    try {
      S.clientes = await datos.listarClientes();
      const objetivo = S.clientes.find((c) => c.id === (seleccionar || (S.cliente && S.cliente.id))) || S.clientes[0] || null;
      await elegirCliente(objetivo ? objetivo.id : null);
    } catch (e) { mal(e); }
  }

  async function elegirCliente(id, idProyecto) {
    S.cliente = S.clientes.find((c) => c.id === id) || null;
    S.nuevoProyecto = false;
    try {
      S.proyectos = S.cliente ? await datos.proyectosDe(S.cliente.id) : [];
    } catch (e) { S.proyectos = []; mal(e); }
    S.proyecto = S.proyectos.find((p) => p.id === idProyecto) || S.proyectos[0] || null;
    pintar();
  }

  /* ---------- lateral: clientes ---------- */

  function pintarLateral() {
    lateral.replaceChildren(
      el("h2", { texto: "Clientes" }),
      S.clientes.length
        ? el("ul", { clase: "lista-clientes" }, S.clientes.map((c) =>
            el("li", {}, el("button", { clase: "cliente-btn", attrs: { type: "button", "aria-current": String(!!S.cliente && S.cliente.id === c.id) },
              on: { click: () => elegirCliente(c.id) } },
              el("strong", { texto: c.empresa || c.nombre || "(sin nombre)" }),
              el("span", { texto: c.email })))))
        : el("p", { clase: "texto-suave", texto: "Aún no hay clientes." }),
      el("button", { clase: "btn btn--contorno btn--pequeno", attrs: { type: "button" }, texto: "Actualizar lista",
        on: { click: () => cargarClientes() } }),
      el("details", { clase: "ayuda-admin panel" },
        el("summary", { texto: "¿Cómo agrego un cliente nuevo?" }),
        datos.demo
          ? el("p", { texto: "En el modo demo no se crean usuarios. Con Supabase conectado, sigue estos pasos:" })
          : null,
        el("ol", {},
          el("li", { texto: "En Supabase: Authentication > Users > Add user > Create new user." }),
          el("li", { texto: "Escribe su correo y una contraseña, y marca \"Auto Confirm User\"." }),
          el("li", { texto: "Vuelve aquí y pulsa \"Actualizar lista\": aparece en la lista." }),
          el("li", { texto: "Completa su nombre y empresa, crea su proyecto y envíale por WhatsApp su correo y contraseña." }))));
  }

  /* ---------- principal ---------- */

  function pintarPrincipal() {
    if (!S.cliente) {
      principal.replaceChildren(el("div", { clase: "vacio" },
        el("p", { texto: "Elige o agrega un cliente para empezar." })));
      return;
    }
    principal.replaceChildren(
      panelCliente(),
      pestanas(),
      S.nuevoProyecto ? formularioProyectoNuevo() : (S.proyecto ? editorProyecto(S.proyecto) : el("div", { clase: "vacio" },
        el("p", { texto: "Este cliente no tiene proyectos. Crea el primero con \"+ Nuevo proyecto\"." }))));
  }

  function pintar() { pintarLateral(); pintarPrincipal(); }

  function campo(etiqueta, props, tipo = "input") {
    const id = "c-" + Math.random().toString(36).slice(2, 8);
    const control = el(tipo, { clase: "campo__input", attrs: { id, ...props.attrs } });
    if (props.valor !== undefined) control.value = props.valor;
    return { contenedor: el("div", { clase: "campo" }, el("label", { clase: "campo__label", texto: etiqueta, attrs: { for: id } }), control), control };
  }

  /* ----- cliente ----- */

  function panelCliente() {
    const c = S.cliente;
    const nombre = campo("Nombre", { valor: c.nombre, attrs: { type: "text", maxlength: "200", autocomplete: "off" } });
    const empresa = campo("Empresa (así saluda el portal)", { valor: c.empresa, attrs: { type: "text", maxlength: "200", autocomplete: "off" } });
    const guardar = el("button", { clase: "btn btn--pequeno", attrs: { type: "button" }, texto: "Guardar cliente", on: { click: async () => {
      try {
        await datos.actualizarPerfil(c.id, { nombre: nombre.control.value.trim(), empresa: empresa.control.value.trim() });
        c.nombre = nombre.control.value.trim(); c.empresa = empresa.control.value.trim();
        pintarLateral(); ok("Cliente guardado ✓");
      } catch (e) { mal(e); }
    } } });
    return el("div", { clase: "panel" }, el("h3", { texto: "Cliente" }), el("p", { clase: "texto-suave", texto: c.email }), nombre.contenedor, empresa.contenedor, guardar);
  }

  /* ----- pestañas de proyectos ----- */

  function pestanas() {
    return el("div", { clase: "pestanas", attrs: { role: "tablist", "aria-label": "Proyectos del cliente" } },
      S.proyectos.map((p) => el("button", { clase: "pestana", attrs: { type: "button", role: "tab", "aria-selected": String(!S.nuevoProyecto && S.proyecto === p) },
        texto: p.nombre, on: { click: () => { S.proyecto = p; S.nuevoProyecto = false; pintarPrincipal(); } } })),
      el("button", { clase: "pestana", attrs: { type: "button", "aria-selected": String(S.nuevoProyecto) }, texto: "+ Nuevo proyecto",
        on: { click: () => { S.nuevoProyecto = true; pintarPrincipal(); } } }));
  }

  function formularioProyectoNuevo() {
    const nombre = campo("Nombre del proyecto", { attrs: { type: "text", maxlength: "200", placeholder: "Ej: Tienda online" } });
    const servicio = campo("Servicio", { attrs: { type: "text", maxlength: "200", placeholder: "Ej: Diseño web" } });
    const crear = async () => {
      const n = nombre.control.value.trim();
      if (!n) { anunciar("Escribe el nombre del proyecto.", true); nombre.control.focus(); return; }
      try {
        const p = await datos.crearProyecto({ cliente_id: S.cliente.id, nombre: n, servicio: servicio.control.value.trim() });
        S.proyectos.push(p); S.proyecto = p; S.nuevoProyecto = false; pintarPrincipal(); ok("Proyecto creado ✓");
      } catch (e) { mal(e); }
    };
    return el("div", { clase: "panel" }, el("h3", { texto: "Nuevo proyecto" }), nombre.contenedor, servicio.contenedor,
      el("div", { clase: "panel__acciones" },
        el("button", { clase: "btn btn--pequeno", attrs: { type: "button" }, texto: "Crear proyecto", on: { click: crear } }),
        el("button", { clase: "btn btn--contorno btn--pequeno", attrs: { type: "button" }, texto: "Cancelar",
          on: { click: () => { S.nuevoProyecto = false; pintarPrincipal(); } } })));
  }

  /* ----- editor de proyecto ----- */

  function editorProyecto(p) {
    const nombre = campo("Nombre del proyecto", { valor: p.nombre, attrs: { type: "text", maxlength: "200" } });
    const servicio = campo("Servicio", { valor: p.servicio, attrs: { type: "text", maxlength: "200" } });
    const novedad = campo("Lo último (lo ve el cliente arriba, en el recuadro amarillo)", { valor: p.novedad, attrs: { maxlength: "2000", rows: "3" } }, "textarea");
    const plazo = campo("Plazo (ej: 9 días hábiles)", { valor: p.plazo || "", attrs: { type: "text", maxlength: "100" } });
    const entrega = campo("Entrega estimada (opcional)", { valor: p.entrega_estimada || "", attrs: { type: "date" } });
    const incluye = campo("Qué incluye su paquete (un ítem por línea)", { valor: p.incluye || "", attrs: { maxlength: "1000", rows: "5" } }, "textarea");

    const guardar = el("button", { clase: "btn btn--pequeno", attrs: { type: "button" }, texto: "Guardar proyecto", on: { click: async () => {
      const n = nombre.control.value.trim();
      if (!n) { anunciar("El proyecto necesita un nombre.", true); nombre.control.focus(); return; }
      const campos = {
        nombre: n, servicio: servicio.control.value.trim(), novedad: novedad.control.value.trim(),
        plazo: plazo.control.value.trim(), entrega_estimada: entrega.control.value || null,
        incluye: incluye.control.value.trim(),
      };
      try { await datos.actualizarProyecto(p.id, campos); Object.assign(p, campos, { actualizado: new Date().toISOString() }); pestanasRepintar(); ok("Proyecto guardado ✓"); }
      catch (e) { mal(e); }
    } } });

    const borrar = el("button", { clase: "btn btn--peligro btn--pequeno", attrs: { type: "button" }, texto: "Borrar proyecto", on: { click: async () => {
      if (!window.confirm("¿Borrar \"" + p.nombre + "\" y todas sus tareas? Esto no se puede deshacer.")) return;
      try {
        await datos.borrarProyecto(p.id);
        S.proyectos = S.proyectos.filter((x) => x !== p); S.proyecto = S.proyectos[0] || null; pintarPrincipal(); ok("Proyecto borrado.");
      } catch (e) { mal(e); }
    } } });

    const zonaProgreso = el("div", { clase: "progreso" });
    const lista = el("ul", { clase: "lista" });
    const sugerencias = el("datalist", { attrs: { id: "lista-etapas" } });
    const repintarSugerencias = () => {
      const nombres = [...new Set(p.tareas.map((t) => (t.etapa || "").trim()).filter(Boolean))];
      sugerencias.replaceChildren(...nombres.map((n) => el("option", { attrs: { value: n } })));
    };

    function repintarProgreso() {
      const { total, hechas, pct } = calcularProgreso(p.tareas);
      zonaProgreso.replaceChildren(
        el("div", { clase: "progreso__texto" }, el("span", { texto: pct + " % completado" }),
          el("span", { texto: total ? hechas + " de " + total + " listas" : "Sin tareas todavía" })),
        crearBarra(pct, "Progreso de " + p.nombre));
    }

    function repintarLista() {
      p.tareas = ordenarTareas(p.tareas);
      lista.replaceChildren(...p.tareas.map((t, i) => filaAdmin(p, t, i, repintarLista, repintarProgreso, repintarSugerencias)));
      repintarProgreso();
      repintarSugerencias();
    }

    // Agregar tarea
    const nuevoTitulo = campo("Nueva tarea", { attrs: { type: "text", maxlength: "200", placeholder: "Ej: Enviar logo en alta calidad" } });
    const nuevoResp = el("select", { clase: "campo__input", attrs: { "aria-label": "Quién la hace" } },
      el("option", { attrs: { value: "yellower" }, texto: "Yellower" }), el("option", { attrs: { value: "cliente" }, texto: "El cliente" }));
    const nuevaEtapa = campo("Etapa", { attrs: { type: "text", maxlength: "100", list: "lista-etapas", placeholder: "Ej: Para comenzar" } });
    const nuevaValida = el("input", { attrs: { type: "checkbox" } });
    const agregar = async () => {
      const titulo = nuevoTitulo.control.value.trim();
      if (!titulo) { anunciar("Escribe el título de la tarea.", true); nuevoTitulo.control.focus(); return; }
      const orden = p.tareas.reduce((m, t) => Math.max(m, t.orden), -1) + 1;
      try {
        const t = await datos.crearTarea({ proyecto_id: p.id, titulo, responsable: nuevoResp.value, estado: "pendiente", orden,
          etapa: nuevaEtapa.control.value.trim(), requiere_validacion: nuevoResp.value === "cliente" && nuevaValida.checked });
        p.tareas.push(t); nuevoTitulo.control.value = ""; repintarLista(); nuevoTitulo.control.focus(); ok("Tarea agregada ✓");
      } catch (e) { mal(e); }
    };
    nuevoTitulo.control.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); agregar(); } });
    const formNueva = el("div", { clase: "nueva-tarea" }, nuevoTitulo.contenedor, nuevaEtapa.contenedor,
      el("div", { clase: "campo" }, el("span", { clase: "campo__label", texto: "Quién" }), nuevoResp),
      el("label", { clase: "marcar" }, nuevaValida, "La confirma Yellower (pago, material, aprobación)"),
      el("button", { clase: "btn btn--pequeno", attrs: { type: "button" }, texto: "Agregar", on: { click: agregar } }));

    repintarLista();

    return el("div", {},
      el("div", { clase: "panel" }, el("h3", { texto: "Proyecto" }), nombre.contenedor, servicio.contenedor,
        el("div", { clase: "dos-cols" }, plazo.contenedor, entrega.contenedor), incluye.contenedor, novedad.contenedor,
        el("p", { clase: "campo__ayuda", texto: "Última actualización: " + hace(p.actualizado) }),
        el("div", { clase: "panel__acciones" }, guardar, borrar)),
      el("div", { clase: "panel" }, el("h3", { texto: "Progreso y tareas" }), zonaProgreso, lista, sugerencias, formNueva));
  }

  function pestanasRepintar() { pintarPrincipal(); }

  /* ----- una fila de tarea (autoguardado) ----- */

  function filaAdmin(p, t, indice, repintarLista, repintarProgreso, repintarSugerencias) {
    async function guardar(campos, mensaje = "Guardado ✓") {
      try { await datos.actualizarTarea(t.id, campos); Object.assign(t, campos); repintarProgreso(); ok(mensaje); }
      catch (e) { mal(e); }
    }

    const titulo = el("input", { clase: "campo__input", attrs: { type: "text", maxlength: "200", "aria-label": "Título de la tarea" } });
    titulo.value = t.titulo;
    titulo.addEventListener("change", () => {
      const v = titulo.value.trim();
      if (!v) { titulo.value = t.titulo; anunciar("La tarea necesita un título.", true); return; }
      guardar({ titulo: v });
    });

    const detalle = el("input", { clase: "campo__input", attrs: { type: "text", maxlength: "2000", placeholder: "Detalle (opcional)", "aria-label": "Detalle de la tarea" } });
    detalle.value = t.detalle || "";
    detalle.addEventListener("change", () => guardar({ detalle: detalle.value.trim() }));

    const etapa = el("input", { clase: "campo__input", attrs: { type: "text", maxlength: "100", list: "lista-etapas", placeholder: "Etapa (ej: Para comenzar)", "aria-label": "Etapa" } });
    etapa.value = t.etapa || "";
    etapa.addEventListener("change", async () => { await guardar({ etapa: etapa.value.trim() }); repintarSugerencias(); });

    const valida = el("input", { attrs: { type: "checkbox" } });
    valida.checked = !!t.requiere_validacion;
    valida.addEventListener("change", () => guardar({ requiere_validacion: valida.checked }));

    const resp = el("select", { clase: "campo__input", attrs: { "aria-label": "Quién la hace" } },
      el("option", { attrs: { value: "yellower" }, texto: "Hace: Yellower" }), el("option", { attrs: { value: "cliente" }, texto: "Hace: el cliente" }));
    resp.value = t.responsable;
    resp.addEventListener("change", () => guardar({ responsable: resp.value }));

    const estado = el("select", { clase: "campo__input", attrs: { "aria-label": "Estado" } },
      Object.entries(ESTADOS).map(([valor, e]) => el("option", { attrs: { value: valor }, texto: e.icono + " " + e.texto })));
    estado.value = t.estado;
    estado.addEventListener("change", () => guardar({ estado: estado.value }));

    const fecha = el("input", { clase: "campo__input", attrs: { type: "date", "aria-label": "Fecha límite" } });
    fecha.value = t.fecha_limite || "";
    fecha.addEventListener("change", () => guardar({ fecha_limite: fecha.value || null }));

    const borrar = el("button", { clase: "btn btn--peligro btn--pequeno", attrs: { type: "button", "aria-label": "Borrar tarea: " + t.titulo }, texto: "Borrar",
      on: { click: async () => {
        if (!window.confirm("¿Borrar la tarea \"" + t.titulo + "\"?")) return;
        try { await datos.borrarTarea(t.id); p.tareas = p.tareas.filter((x) => x !== t); repintarLista(); ok("Tarea borrada."); } catch (e) { mal(e); }
      } } });

    async function mover(delta) {
      const lista = ordenarTareas(p.tareas);
      const j = indice + delta;
      if (j < 0 || j >= lista.length) return;
      [lista[indice], lista[j]] = [lista[j], lista[indice]];
      try {
        for (let k = 0; k < lista.length; k++) {
          if (lista[k].orden !== k) { await datos.actualizarTarea(lista[k].id, { orden: k }); lista[k].orden = k; }
        }
        p.tareas = lista; repintarLista(); ok("Orden guardado ✓");
      } catch (e) { mal(e); }
    }
    const arriba = el("button", { attrs: { type: "button", "aria-label": "Subir tarea: " + t.titulo }, texto: "\u2191", on: { click: () => mover(-1) } });
    const abajo = el("button", { attrs: { type: "button", "aria-label": "Bajar tarea: " + t.titulo }, texto: "\u2193", on: { click: () => mover(1) } });
    if (indice === 0) arriba.disabled = true;
    if (indice === p.tareas.length - 1) abajo.disabled = true;

    return el("li", { clase: "tarea-admin" },
      el("div", { clase: "orden" }, arriba, abajo),
      el("div", { clase: "tarea-admin__campos" }, titulo, detalle,
        el("div", { clase: "tarea-admin__etapa" }, etapa,
          el("label", { clase: "marcar" }, valida, "La confirma Yellower")),
        el("div", { clase: "tarea-admin__fila" }, resp, estado, fecha, borrar)));
  }

  cargarClientes();
}
