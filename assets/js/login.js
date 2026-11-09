import { obtenerDatos } from "./datos.js";
import { MODO_DEMO, WHATSAPP } from "./config.js";
import { anunciar, bannerDemo, ir, aCorreo } from "./ui.js";

bannerDemo();
const datos = obtenerDatos();

const form = document.getElementById("form");
const usuarioEl = document.getElementById("email");
const password = document.getElementById("password");
const enviar = document.getElementById("enviar");
const ver = document.getElementById("ver");

document.getElementById("whatsapp").href = WHATSAPP;
if (MODO_DEMO) document.getElementById("demo").hidden = false;

const destino = (u) => (u.es_admin ? "admin.html" : "proyectos.html");

// Si ya hay una sesión abierta, se entra directo.
try {
  const u = await datos.sesion();
  if (u && !u.sinPerfil) ir(destino(u));
} catch (e) { /* se muestra el formulario normal */ }

// Barritas decorativas del panel (el ancho llega desde JS: la CSP no permite estilos en línea).
document.querySelectorAll(".login__muestra .segmento").forEach((s) => s.style.setProperty("--p", (s.dataset.p || "0") + "%"));

ver.addEventListener("click", () => {
  const visible = password.type === "text";
  password.type = visible ? "password" : "text";
  ver.textContent = visible ? "Ver" : "Ocultar";
  ver.setAttribute("aria-pressed", String(!visible));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  anunciar("");
  const valor = usuarioEl.value.trim();
  if (!valor || !password.value) {
    anunciar("Escribe tu usuario y tu contraseña.", true);
    (valor ? password : usuarioEl).focus();
    return;
  }
  enviar.disabled = true;
  enviar.textContent = "Entrando…";
  try {
    const u = await datos.entrar(aCorreo(valor), password.value);
    if (u.sinPerfil) {
      await datos.salir();
      throw new Error("Tu cuenta aún no está lista. Escríbenos y la activamos.");
    }
    ir(destino(u));
  } catch (err) {
    anunciar(err.message, true);
    enviar.disabled = false;
    enviar.textContent = "Entrar";
    password.select();
  }
});
