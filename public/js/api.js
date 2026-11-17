/* =========================================================
   api.js — Cliente HTTP de TicketShow (fetch + async/await)
   Única capa que habla con el backend: la SPA y la API PHP se
   comunican solo por HTTP asíncrono + JSON.
   ========================================================= */

export const API_BASE = "../api"; // /public/index.html → /api/*.php

export class ErrorApi extends Error {
  constructor(mensaje, status, errores) {
    super(mensaje);
    this.status = status;       // código HTTP (0 = sin conexión)
    this.errores = errores || {}; // { campo: mensaje } cuando la API responde 400
  }
}

async function pedir(ruta, { metodo = "GET", cuerpo } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}/${ruta}`, {
      method: metodo,
      credentials: "same-origin", // envía la cookie de sesión PHP
      headers: {
        Accept: "application/json",
        ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {})
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
    });
  } catch {
    throw new ErrorApi("No se pudo conectar con el servidor. ¿Está Apache/MySQL en marcha?", 0);
  }

  let datos = {};
  try {
    datos = await respuesta.json();
  } catch {
    /* cuerpo vacío o no JSON: se informa con el código HTTP */
  }

  if (!respuesta.ok) {
    const primero = datos.errores ? Object.values(datos.errores)[0] : null;
    throw new ErrorApi(datos.error || primero || `Error HTTP ${respuesta.status}`, respuesta.status, datos.errores);
  }
  return datos;
}

export const api = {
  // Público
  eventos: async () => (await pedir("eventos.php")).eventos,
  evento: async (id) => (await pedir(`eventos.php?id=${encodeURIComponent(id)}`)).evento,

  // Sesión
  sesion: () => pedir("sesion.php"),
  login: async (email, password) => (await pedir("login.php", { metodo: "POST", cuerpo: { email, password } })).usuario,
  logout: () => pedir("logout.php", { metodo: "POST", cuerpo: {} }),
  registro: (datos) => pedir("registro.php", { metodo: "POST", cuerpo: datos }),

  // Órdenes (requiere sesión)
  ordenes: async () => (await pedir("ordenes.php")).ordenes,
  comprar: async (datos) => (await pedir("ordenes.php", { metodo: "POST", cuerpo: datos })).orden,

  // Administración (rol admin) — CRUD de eventos
  adminEventos: async () => (await pedir("admin_eventos.php")).eventos,
  adminEvento: async (id) => (await pedir(`admin_eventos.php?id=${id}`)).evento,
  adminCrear: async (datos) => (await pedir("admin_eventos.php", { metodo: "POST", cuerpo: datos })).evento,
  adminActualizar: async (id, datos) => (await pedir(`admin_eventos.php?id=${id}`, { metodo: "PUT", cuerpo: datos })).evento,
  adminBaja: (id) => pedir(`admin_eventos.php?id=${id}`, { metodo: "DELETE" })
};
