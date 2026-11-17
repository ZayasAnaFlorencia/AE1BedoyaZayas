/* =========================================================
   app.js — SPA de TicketShow (JavaScript Vanilla)
   - Router por hash (#/, #/evento/3, #/comprar/3/7, #/login ...).
   - Toda la dinámica visual vive acá; el HTML solo trae el esqueleto.
   - Datos del servidor SIEMPRE por fetch (api.js) y se inyectan con
     textContent / createElement: nunca se arma HTML con cadenas (OWASP A03, XSS).
   ========================================================= */

import { api, ErrorApi } from "./api.js";

/* ---------- Utilidades de DOM ---------- */

/** Crea un elemento. Los hijos de tipo string se insertan como TEXTO, nunca como HTML. */
function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const vacio = (el) => el.replaceChildren();

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const peso = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const MEDIOS_PAGO = [
  ["mercadopago", "Mercado Pago"],
  ["visa", "Visa"],
  ["mastercard", "Mastercard"],
  ["amex", "American Express"],
  ["transferencia", "Transferencia bancaria"],
  ["efectivo", "Efectivo (Pago Fácil / Rapipago)"]
];

function fechaLarga(f) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f || "");
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : "A confirmar";
}

/** Solo URLs http(s) pueden ir a <img src>. */
function urlSegura(u) {
  return /^https?:\/\//i.test(u || "") ? u : "";
}

function imagen(url, alt) {
  const img = h("img", { alt, loading: "lazy" });
  const seguro = urlSegura(url);
  if (seguro) img.src = seguro;
  return img;
}

/* ---------- Estado y referencias ---------- */

const estado = { usuario: null };
const vista = $("#vista");
const cuenta = $("#cuenta");
const anuncio = $("#anuncio");

/** Mensaje accesible (el contenedor tiene aria-live="polite"/role="alert"). */
function mostrar(contenedor, texto, tipo = "error") {
  vacio(contenedor);
  if (texto) contenedor.append(h("p", { class: tipo === "ok" ? "mensaje-exito" : "mensaje-error-caja", text: texto }));
}

function mostrarErrores(contenedor, err) {
  vacio(contenedor);
  const lista = Object.values(err.errores || {});
  if (lista.length > 1) {
    contenedor.append(h("div", { class: "mensaje-error-caja" }, h("ul", {}, lista.map((m) => h("li", { text: m })))));
  } else {
    mostrar(contenedor, err.message);
  }
}

function enlaceAccion(texto, href) {
  return h("a", { class: "accion-principal", href }, h("span", { text: texto }), h("span", { class: "flecha", "aria-hidden": "true", text: "→" }));
}

function botonAccion(texto, props = {}) {
  return h("button", { type: "button", class: "accion-principal", ...props }, h("span", { text: texto }), h("span", { class: "flecha", "aria-hidden": "true", text: "→" }));
}

/** Etiqueta + input accesible (label for= id). */
function campo(etiqueta, id, props = {}) {
  const { ayuda, ...resto } = props;
  return h("div", {}, h("label", { for: id, text: etiqueta }), h("input", { id, name: id, ...resto }), ayuda ? h("small", { class: "ayuda-campo", text: ayuda }) : null);
}

function titulo(texto) {
  return h("h1", { tabindex: "-1", id: "titulo-vista", text: texto });
}

/** Texto de estrellas con alternativa accesible: ★★★★☆ = "4 de 5". */
function estrellas(n) {
  return h("span", { class: "estrellas-fijas", role: "img", "aria-label": `${n} de 5`, text: "★".repeat(n) + "☆".repeat(5 - n) });
}

/** Grupo de 5 radios (1 a 5) accesible por teclado con flechas. */
function puntajeInput(nombre) {
  return h("fieldset", { class: "estrellas-radio" }, h("legend", { text: "Puntaje" }),
    [1, 2, 3, 4, 5].map((n) => h("label", {}, h("input", { type: "radio", name: nombre, value: n, required: true }), ` ${n} ★`)));
}

/** Carga un script local (vendor/) una sola vez, bajo demanda. */
const scriptsCargados = new Map();
function cargarScript(src) {
  if (!scriptsCargados.has(src)) {
    scriptsCargados.set(src, new Promise((ok, fallo) => {
      const el = h("script", { src });
      el.addEventListener("load", ok);
      el.addEventListener("error", () => { scriptsCargados.delete(src); fallo(new Error(`No se pudo cargar ${src}`)); });
      document.head.append(el);
    }));
  }
  return scriptsCargados.get(src);
}

/* ---------- Router ---------- */

const rutas = [
  [/^#?\/?$/, vistaCartelera],
  [/^#\/evento\/(\d+)$/, vistaEvento],
  [/^#\/comprar\/(\d+)(?:\/(\d+))?$/, vistaComprar],
  [/^#\/login$/, vistaLogin],
  [/^#\/registro$/, vistaRegistro],
  [/^#\/mis-tickets$/, vistaMisTickets],
  [/^#\/ticket\/([A-Z0-9-]{1,20})$/, vistaTicket],
  [/^#\/soporte$/, vistaSoporte],
  [/^#\/admin$/, vistaAdmin],
  [/^#\/admin\/(nuevo|\d+)$/, vistaAdminForm]
];

let navegacion = 0; // descarta respuestas de vistas que ya no están en pantalla

async function enrutar() {
  const hash = location.hash || "#/";
  const id = ++navegacion;
  vacio(vista);
  vista.setAttribute("aria-busy", "true");

  for (const [patron, fn] of rutas) {
    const m = patron.exec(hash);
    if (!m) continue;
    try {
      await fn(...m.slice(1), () => id === navegacion);
    } catch (err) {
      if (id !== navegacion) return;
      vacio(vista);
      vista.append(titulo("Ocurrió un problema"), h("div", { role: "alert", class: "mensaje-error-caja", text: err.message }), h("p", {}, h("a", { href: "#/", text: "Volver a la cartelera" })));
    }
    break;
  }
  if (id !== navegacion) return;
  vista.removeAttribute("aria-busy");
  marcarNavegacion(hash);
  const t = $("#titulo-vista");
  if (t) {
    document.title = `TicketShow - ${t.textContent}`;
    anuncio.textContent = `Página: ${t.textContent}`; // lectores de pantalla
    t.focus();
  }
}

function marcarNavegacion(hash) {
  document.querySelectorAll("[data-ruta]").forEach((a) => {
    if (hash.startsWith(a.dataset.ruta) && (a.dataset.ruta !== "#/" || hash === "#/" || hash === "")) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function irA(hash) {
  if (location.hash === hash) enrutar();
  else location.hash = hash;
}

/* ---------- Cuenta (encabezado) ---------- */

function pintarCuenta() {
  vacio(cuenta);
  const u = estado.usuario;
  if (!u) {
    cuenta.append(h("a", { href: "#/login", "data-ruta": "#/login", text: "Ingresar" }), h("a", { href: "#/registro", "data-ruta": "#/registro", text: "Registrarme" }));
    return;
  }
  cuenta.append(
    h("span", { class: "saludo", text: `Hola, ${u.nombre}` }),
    h("a", { href: "#/mis-tickets", "data-ruta": "#/mis-tickets", text: "Mis tickets" }),
    ...(u.rol === "admin" ? [h("a", { href: "#/admin", "data-ruta": "#/admin", text: "Administración" })] : []),
    h("button", { type: "button", class: "enlace-accion", onclick: cerrarSesion, text: "Salir" })
  );
}

async function cerrarSesion() {
  try {
    await api.logout();
  } catch {
    /* si falla igual limpiamos la vista */
  }
  estado.usuario = null;
  pintarCuenta();
  irA("#/");
}

/* ---------- Vista: cartelera ---------- */

function tarjetaEvento(ev) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(ev.fecha || "");
  const agotado = ev.disponibles === 0;
  return h("a", { class: "tarjeta", href: `#/evento/${ev.id}` },
    h("div", { class: "tarjeta__media" },
      imagen(ev.imagen_url, ""),
      m ? h("span", { class: "tarjeta__fecha" }, h("b", { text: Number(m[2]) }), h("small", { text: MESES[Number(m[1]) - 1].slice(0, 3) })) : null),
    h("div", { class: "tarjeta__cuerpo" },
      h("h3", { text: ev.titulo }),
      h("p", { class: "tarjeta__lugar", text: ev.lugar || "A confirmar" }),
      h("div", { class: "tarjeta__pie" },
        h("span", { class: "tarjeta__precio" }, "Desde ", h("b", { text: ev.precio_desde === null ? "—" : peso.format(ev.precio_desde) })),
        agotado ? h("span", { class: "etiqueta etiqueta--agotado", text: "Agotado" }) : ev.disponibles <= 30 ? h("span", { class: "etiqueta etiqueta--poco", text: `¡Últimas ${ev.disponibles}!` }) : null)));
}

const sinTildes = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function vistaCartelera(vigente) {
  const eventos = await api.eventos();
  if (!vigente()) return;

  const grid = h("div", { class: "grid-eventos", id: "grid-eventos", "aria-live": "polite" });
  const proximos = h("ul", { class: "proximos", id: "lista-proximos", "aria-live": "polite" });
  const estadoBusqueda = h("p", { class: "sin-resultados", id: "sin-resultados", "aria-live": "polite" });

  const pintarGrid = (lista) => {
    vacio(grid);
    grid.append(...lista.map(tarjetaEvento));
    estadoBusqueda.textContent = lista.length ? `${lista.length} show${lista.length === 1 ? "" : "s"} encontrado${lista.length === 1 ? "" : "s"}.` : "No encontramos shows con esa búsqueda.";
  };

  const buscador = h("input", {
    type: "search", id: "buscador", placeholder: "Buscar artista o evento", "aria-label": "Buscar artista o evento", autocomplete: "off",
    oninput: (e) => {
      const q = sinTildes(e.target.value.trim());
      pintarGrid(eventos.filter((ev) => sinTildes(`${ev.titulo} ${ev.artista || ""} ${ev.lugar || ""}`).includes(q)));
    }
  });

  pintarGrid(eventos);
  proximos.append(...eventos.filter((e) => e.fecha).slice(0, 4).map((ev) => {
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(ev.fecha);
    return h("li", {}, h("a", { class: "proximo", href: `#/evento/${ev.id}` },
      h("span", { class: "proximo__fecha" }, h("b", { text: Number(m[2]) }), ` ${MESES[Number(m[1]) - 1].slice(0, 3)}`),
      h("span", { class: "proximo__info" }, h("strong", { text: ev.titulo }), h("small", { text: ev.lugar || "A confirmar" }))));
  }));

  vista.append(
    h("section", { class: "hero" },
      h("div", { class: "hero__contenido" },
        h("h1", { tabindex: "-1", id: "titulo-vista", text: "Tu entrada a los mejores shows en vivo" }),
        h("label", { class: "buscador", for: "buscador" }, h("span", { class: "buscador__icono", "aria-hidden": "true", text: "🔍" }), buscador))),
    h("section", { class: "contenido", "aria-labelledby": "titulo-cartelera" }, h("h2", { id: "titulo-cartelera", text: "Cartelera de shows" }), grid, estadoBusqueda),
    h("section", { class: "contenido", "aria-labelledby": "titulo-proximos" }, h("h2", { id: "titulo-proximos", text: "Próximos shows" }), proximos)
  );
}

/* ---------- Vista: detalle de evento ---------- */

async function vistaEvento(id, vigente) {
  let ev;
  try {
    ev = await api.evento(id);
  } catch (err) {
    if (err.status === 404) {
      vista.append(titulo("Evento no encontrado"), h("p", {}, "No encontramos ese show. Volvé a la ", h("a", { href: "#/", text: "cartelera" }), "."));
      return;
    }
    throw err;
  }
  if (!vigente()) return;

  const tiers = ev.entradas.map((t) => {
    const agotada = t.disponibles === 0;
    const hijos = [
      h("span", { class: "tier__nombre", text: t.nombre }),
      agotada ? h("span", { class: "etiqueta etiqueta--agotado", text: "Agotada" }) : h("span", { class: t.disponibles <= 20 ? "etiqueta etiqueta--poco" : "etiqueta etiqueta--ok", text: t.disponibles <= 20 ? `¡Últimas ${t.disponibles}!` : `${t.disponibles} disponibles` }),
      h("span", { class: "tier__precio", text: peso.format(t.precio) })
    ];
    return agotada ? h("div", { class: "tier tier--agotado" }, hijos) : h("a", { class: "tier", href: `#/comprar/${ev.id}/${t.id}` }, hijos, h("span", { class: "flecha", "aria-hidden": "true", text: "→" }));
  });

  vista.append(h("article", { class: "contenido ficha" },
    h("div", { class: "ficha__media" }, imagen(ev.imagen_url, `Imagen de ${ev.titulo}`)),
    h("div", {},
      titulo(ev.titulo),
      h("ul", { class: "ficha__meta" }, h("li", {}, h("strong", { text: "Fecha: " }), fechaLarga(ev.fecha)), h("li", {}, h("strong", { text: "Lugar: " }), ev.lugar || "A confirmar")),
      h("p", { class: "ficha__descripcion", text: ev.descripcion }),
      ev.instagram && urlSegura(ev.instagram) ? h("p", {}, h("a", { href: ev.instagram, target: "_blank", rel: "noopener noreferrer", text: "Ver en redes sociales" })) : null,
      h("h2", { class: "ficha__subtitulo", text: "Entradas" }),
      h("div", { class: "tiers" }, tiers),
      h("p", {}, h("a", { href: "#/", text: "← Volver a la cartelera" })))),
    seccionResenas(ev.id));
}

/* ---------- Reseñas y valoraciones ---------- */

function seccionResenas(eventoId) {
  const resumen = h("p", { class: "resumen-resenas" });
  const lista = h("div", { id: "lista-resenas", "aria-live": "polite" });
  const msg = h("div", { role: "alert", "aria-live": "assertive" });

  const cargar = async () => {
    const { resumen: r, resenas } = await api.resenas(eventoId);
    resumen.textContent = r.total ? `Valoración promedio: ${r.promedio.toFixed(1)} de 5 (${r.total} reseña${r.total === 1 ? "" : "s"})` : "Todavía no hay reseñas.";
    lista.replaceChildren(...resenas.map((x) => h("article", { class: "resena" },
      h("header", {}, h("strong", { text: x.nombre }), " ", estrellas(x.puntaje), x.verificada ? h("small", { text: " · compra verificada" }) : null),
      x.comentario ? h("p", { text: x.comentario }) : null)));
  };

  const form = estado.usuario
    ? h("form", { novalidate: true, onsubmit: async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
          await api.crearResena({ evento_id: eventoId, puntaje: Number(e.target.puntaje.value), comentario: e.target.comentario.value });
          vacio(msg);
          e.target.replaceWith(h("p", { class: "mensaje-exito", text: "¡Gracias por tu reseña!" }));
          await cargar();
        } catch (err) {
          mostrarErrores(msg, err);
          btn.disabled = false;
        }
      } },
      puntajeInput("puntaje"),
      h("div", {}, h("label", { for: "comentario-resena", text: "Comentario (opcional)" }), h("textarea", { id: "comentario-resena", name: "comentario", rows: "3", maxlength: "500" })),
      botonAccion("Publicar reseña", { type: "submit" }), msg)
    : h("p", {}, h("a", { href: "#/login", text: "Ingresá" }), " para dejar tu reseña.");

  const seccion = h("section", { class: "contenido", "aria-labelledby": "titulo-resenas" }, h("h2", { id: "titulo-resenas", text: "Reseñas" }), resumen, lista, form);
  cargar().catch((err) => { resumen.textContent = err.message; });
  return seccion;
}

/* ---------- Vista: login y registro ---------- */

function vistaLogin() {
  if (estado.usuario) return irA("#/mis-tickets");
  const msg = h("div", { role: "alert", "aria-live": "assertive" });
  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      estado.usuario = await api.login(form.email.value.trim(), form.password.value);
      pintarCuenta();
      const destino = sessionStorage.getItem("destinoTrasLogin") || (estado.usuario.rol === "admin" ? "#/admin" : "#/");
      sessionStorage.removeItem("destinoTrasLogin");
      irA(destino);
    } catch (err) {
      mostrarErrores(msg, err);
      btn.disabled = false;
    }
  } },
    campo("E-mail", "email", { type: "email", required: true, autocomplete: "username" }),
    campo("Contraseña", "password", { type: "password", required: true, autocomplete: "current-password" }),
    botonAccion("Ingresar", { type: "submit" }), msg);

  vista.append(h("div", { class: "contenido" }, titulo("Iniciar sesión"), h("p", {}, "¿No tenés cuenta? ", h("a", { href: "#/registro", text: "Creá una aquí" })), form));
}

function vistaRegistro() {
  if (estado.usuario) return irA("#/");
  const msg = h("div", { role: "alert", "aria-live": "assertive" });
  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      const datos = Object.fromEntries(new FormData(form));
      await api.registro(datos);
      estado.usuario = await api.login(datos.email.trim(), datos.password);
      pintarCuenta();
      irA("#/");
    } catch (err) {
      mostrarErrores(msg, err);
      btn.disabled = false;
    }
  } },
    campo("Nombre *", "nombre", { required: true, maxlength: 60, autocomplete: "given-name" }),
    campo("Apellido", "apellido", { maxlength: 60, autocomplete: "family-name" }),
    campo("E-mail *", "email", { type: "email", required: true, autocomplete: "email" }),
    campo("Contraseña *", "password", { type: "password", required: true, minlength: 8, maxlength: 72, autocomplete: "new-password", ayuda: "Entre 8 y 72 caracteres." }),
    campo("Teléfono", "telefono", { type: "tel", autocomplete: "tel" }),
    campo("País", "pais", { maxlength: 60, autocomplete: "country-name" }),
    botonAccion("Crear cuenta", { type: "submit" }), msg);

  vista.append(h("div", { class: "contenido" }, titulo("Crear cuenta"), form));
}

/* ---------- Vista: comprar ---------- */

async function vistaComprar(eventoId, tipoId, vigente) {
  if (!estado.usuario) {
    sessionStorage.setItem("destinoTrasLogin", location.hash);
    return irA("#/login");
  }
  const ev = await api.evento(eventoId);
  if (!vigente()) return;

  const msg = h("div", { role: "alert", "aria-live": "assertive" });
  const resumen = h("div", { class: "resumen-compra", "aria-live": "polite" });
  const confirmacion = h("div", { "aria-live": "polite" });

  const selTipo = h("select", { id: "tipo_entrada_id", name: "tipo_entrada_id", required: true },
    ev.entradas.map((t) => h("option", { value: t.id, disabled: t.disponibles === 0, selected: String(t.id) === String(tipoId), text: `${t.nombre} — ${peso.format(t.precio)}${t.disponibles === 0 ? " (agotada)" : ""}` })));
  const cantidad = h("input", { type: "number", id: "cantidad", name: "cantidad", min: "1", max: "8", value: "1", required: true });

  const actualizarResumen = () => {
    const t = ev.entradas.find((x) => String(x.id) === selTipo.value);
    const n = Number(cantidad.value) || 0;
    resumen.textContent = t ? `${n} × ${t.nombre} = ${peso.format(t.precio * n)}` : "";
  };
  selTipo.addEventListener("change", actualizarResumen);
  cantidad.addEventListener("input", actualizarResumen);
  actualizarResumen();

  const pagos = h("fieldset", {}, h("legend", { text: "Medio de pago" }),
    MEDIOS_PAGO.map(([codigo, nombre], i) => h("label", { class: "opcion-radio" }, h("input", { type: "radio", name: "medio_pago", value: codigo, required: true, checked: i === 0 }), ` ${nombre}`)));

  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    vacio(msg);
    try {
      const d = Object.fromEntries(new FormData(form));
      const orden = await api.comprar({
        tipo_entrada_id: Number(d.tipo_entrada_id), cantidad: Number(d.cantidad), medio_pago: d.medio_pago,
        cliente_nombre: d.cliente_nombre, cliente_email: d.cliente_email, cliente_telefono: d.cliente_telefono, cliente_direccion: d.cliente_direccion
      });
      vacio(form);
      confirmacion.append(h("div", { class: "mensaje-exito" },
        h("p", {}, h("strong", { text: "¡Compra confirmada! " }), `Orden ${orden.codigo} — total ${peso.format(orden.total)}.`),
        h("p", { text: "Tus códigos de ticket:" }),
        h("ul", {}, orden.tickets.map((c) => h("li", {}, h("code", { text: c })))),
        h("p", {}, h("a", { href: `#/ticket/${orden.codigo}`, text: "Ver tickets con QR, descargar PDF y valorar la compra" }))));
    } catch (err) {
      mostrarErrores(msg, err);
      btn.disabled = false;
    }
  } },
    h("div", {}, h("label", { for: "tipo_entrada_id", text: "Tipo de entrada" }), selTipo),
    h("div", {}, h("label", { for: "cantidad", text: "Cantidad (1 a 8)" }), cantidad),
    resumen,
    campo("Nombre y apellido", "cliente_nombre", { required: true, maxlength: 100, value: estado.usuario.nombre, autocomplete: "name" }),
    campo("E-mail", "cliente_email", { type: "email", required: true, maxlength: 120, autocomplete: "email" }),
    campo("Teléfono (opcional)", "cliente_telefono", { type: "tel", autocomplete: "tel" }),
    campo("Dirección (opcional)", "cliente_direccion", { maxlength: 150, autocomplete: "street-address" }),
    pagos,
    botonAccion("Confirmar compra", { type: "submit" }), msg);

  vista.append(h("div", { class: "contenido" }, titulo(`Comprar: ${ev.titulo}`), h("p", {}, `${fechaLarga(ev.fecha)} · ${ev.lugar || "A confirmar"}`), form, confirmacion));
}

/* ---------- Vista: mis tickets ---------- */

async function vistaMisTickets(vigente) {
  if (!estado.usuario) {
    sessionStorage.setItem("destinoTrasLogin", "#/mis-tickets");
    return irA("#/login");
  }
  const ordenes = await api.ordenes();
  if (!vigente()) return;

  const lista = ordenes.length
    ? ordenes.map((o) => h("article", { class: "ticket-resumen" },
        h("h3", { text: o.evento }),
        h("p", { text: `${fechaLarga(o.fecha)} · ${o.lugar || "A confirmar"}` }),
        h("p", { text: `${o.cantidad} × ${o.tipo_entrada} — total ${peso.format(o.total)} (${o.estado})` }),
        h("p", {}, "Orden ", h("code", { text: o.codigo })),
        h("ul", {}, o.tickets.map((t) => h("li", {}, h("code", { text: t.codigo }), t.usado ? " — usado" : " — válido"))),
        h("p", {}, h("a", { class: "boton-chico", href: `#/ticket/${o.codigo}`, "aria-label": `Ver tickets de la orden ${o.codigo}`, text: "Ver QR / PDF" }))))
    : [h("p", {}, "Todavía no compraste entradas. ", h("a", { href: "#/", text: "Mirá la cartelera" }), ".")];

  vista.append(h("div", { class: "contenido" }, titulo("Mis tickets"), h("div", { id: "mis-tickets-resultado", "aria-live": "polite" }, lista)));
}

/* ---------- Ticket electrónico: QR, PDF, e-mail y encuesta ---------- */

/** Dibuja el QR como SVG con createElementNS (sin armar HTML con cadenas). */
function qrSvg(texto) {
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  const margen = 2;
  const lado = n + margen * 2;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${lado} ${lado}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Código QR del ticket ${texto}`);
  const fondo = document.createElementNS(NS, "rect");
  fondo.setAttribute("width", lado);
  fondo.setAttribute("height", lado);
  fondo.setAttribute("fill", "#fff");
  const trazo = document.createElementNS(NS, "path");
  let d = "";
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) if (qr.isDark(f, c)) d += `M${c + margen} ${f + margen}h1v1h-1z`;
  }
  trazo.setAttribute("d", d);
  trazo.setAttribute("fill", "#000");
  svg.append(fondo, trazo);
  return svg;
}

const latin = (s) => String(s ?? "").normalize("NFC").replace(/[^ -ÿ]/g, "?"); // jsPDF solo trae fuentes Latin-1

function dibujarTicketPDF(doc, orden, codigo, indice) {
  const W = 210, H = 90;
  doc.setFillColor(18, 18, 24); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(230, 57, 70); doc.rect(0, 0, 6, H, "F");
  doc.setFillColor(38, 12, 93); doc.rect(6, 0, 144, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("TICKETSHOW", 14, 10.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Entrada ${indice + 1} de ${orden.tickets.length}`, 146, 10.5, { align: "right" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  const tit = doc.splitTextToSize(latin(orden.evento), 132).slice(0, 2);
  doc.text(tit, 14, 28);
  let y = 28 + tit.length * 7 + 2;
  doc.setFontSize(10);
  const fila = (etiqueta, valor) => {
    doc.setFont("helvetica", "bold"); doc.setTextColor(180, 180, 200); doc.text(etiqueta, 14, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(255, 255, 255);
    doc.text(doc.splitTextToSize(latin(valor), 108)[0], 38, y);
    y += 6.5;
  };
  fila("Fecha", fechaLarga(orden.fecha));
  fila("Lugar", orden.lugar || "A confirmar");
  fila("Entrada", orden.tipo_entrada);
  fila("Titular", orden.cliente_nombre);

  doc.setFont("courier", "bold"); doc.setFontSize(13); doc.text(codigo, 14, H - 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 170);
  doc.text(latin(`Compra ${orden.codigo} - Valido para una persona. Presenta este QR en el acceso.`), 14, H - 4.5);

  doc.setDrawColor(90, 90, 110);
  if (doc.setLineDashPattern) doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(154, 4, 154, H - 4);
  if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

  const qr = qrcode(0, "M");
  qr.addData(codigo);
  qr.make();
  const n = qr.getModuleCount();
  const caja = 46, x0 = 156 + (W - 156 - caja) / 2, y0 = (H - caja) / 2, m = caja / n;
  doc.setFillColor(255, 255, 255); doc.roundedRect(x0 - 3, y0 - 3, caja + 6, caja + 6, 2, 2, "F");
  doc.setFillColor(0, 0, 0);
  for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) if (qr.isDark(f, c)) doc.rect(x0 + c * m, y0 + f * m, m + 0.01, m + 0.01, "F");
}

async function descargarPDF(orden, soloIndice) {
  await Promise.all([cargarScript("vendor/qrcode.js"), cargarScript("vendor/jspdf.umd.min.js")]);
  const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: [210, 90] });
  const indices = typeof soloIndice === "number" ? [soloIndice] : orden.tickets.map((_, i) => i);
  indices.forEach((i, pos) => {
    if (pos > 0) doc.addPage([210, 90], "landscape");
    dibujarTicketPDF(doc, orden, orden.tickets[i].codigo, i);
  });
  doc.save(`TicketShow-${orden.codigo}${typeof soloIndice === "number" ? `-${soloIndice + 1}` : ""}.pdf`);
}

async function vistaTicket(codigo, vigente) {
  if (!estado.usuario) {
    sessionStorage.setItem("destinoTrasLogin", location.hash);
    return irA("#/login");
  }
  const [ordenes] = await Promise.all([api.ordenes(), cargarScript("vendor/qrcode.js")]);
  if (!vigente()) return;
  const orden = ordenes.find((o) => o.codigo === codigo);
  if (!orden) {
    vista.append(titulo("Compra no encontrada"), h("p", {}, "No encontramos esa compra en tu cuenta. ", h("a", { href: "#/mis-tickets", text: "Volver a mis tickets" }), "."));
    return;
  }

  const msg = h("div", { id: "ticket-mensaje", role: "status", "aria-live": "polite" });
  const accion = async (btn, tarea, okTexto) => {
    btn.disabled = true;
    try {
      await tarea();
      if (okTexto) mostrar(msg, okTexto, "ok");
    } catch (err) {
      mostrar(msg, err.message);
    }
    btn.disabled = false;
  };

  const tarjetas = orden.tickets.map((t, i) => h("article", { class: "ticket-card" },
    h("div", { class: "ticket-info" },
      h("p", { class: "ticket-num", text: `Entrada ${i + 1} de ${orden.tickets.length}${t.usado ? " · USADA" : ""}` }),
      h("h2", { text: orden.evento }),
      h("p", { text: `${fechaLarga(orden.fecha)} · ${orden.lugar || "A confirmar"}` }),
      h("p", { text: `${orden.tipo_entrada} — titular: ${orden.cliente_nombre}` }),
      h("p", { class: "ticket-codigo" }, h("code", { text: t.codigo })),
      h("button", { type: "button", class: "boton-chico", text: "Descargar esta entrada (PDF)", onclick: (e) => accion(e.currentTarget, () => descargarPDF(orden, i)) })),
    h("div", { class: "ticket-qr" }, qrSvg(t.codigo))));

  const btnPdf = h("button", { type: "button", class: "accion-principal", onclick: (e) => accion(e.currentTarget, () => descargarPDF(orden)) }, h("span", { text: "Descargar todo (PDF)" }), h("span", { class: "flecha", "aria-hidden": "true", text: "→" }));
  const btnMail = h("button", { type: "button", class: "accion-principal", onclick: (e) => accion(e.currentTarget, async () => {
    const r = await api.enviarTickets(orden.codigo);
    mostrar(msg, `Enviamos los tickets a ${r.destinatario}.`, "ok");
  }) }, h("span", { text: `Enviar por e-mail a ${orden.cliente_email}` }), h("span", { class: "flecha", "aria-hidden": "true", text: "→" }));
  const btnImprimir = h("button", { type: "button", class: "accion-principal", onclick: () => window.print(), }, h("span", { text: "Imprimir" }), h("span", { class: "flecha", "aria-hidden": "true", text: "→" }));

  vista.append(h("div", { class: "contenido" },
    titulo(`Tus tickets: ${orden.evento}`),
    h("p", {}, "Compra ", h("code", { text: orden.codigo }), `. Presentá el QR (en el celular o impreso) en el acceso; cada código vale para una sola persona.`),
    h("div", { class: "ticket-lista" }, tarjetas),
    h("p", { class: "acciones-ticket" }, btnPdf, btnImprimir, btnMail),
    msg,
    orden.encuesta_respondida ? h("p", { class: "mensaje-exito", text: "Ya respondiste la encuesta de esta compra. ¡Gracias!" }) : formEncuesta(orden),
    h("p", {}, h("a", { href: `#/evento/${orden.evento_id}`, text: "Dejar una reseña de este show" }), " · ", h("a", { href: "#/mis-tickets", text: "Volver a mis tickets" }))));
}

function formEncuesta(orden) {
  const msg = h("div", { role: "alert", "aria-live": "polite" });
  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await api.encuesta({ orden_codigo: orden.codigo, puntaje: Number(form.puntaje.value), comentario: form.comentario.value });
      form.replaceWith(h("p", { class: "mensaje-exito", text: "¡Gracias por responder la encuesta!" }));
    } catch (err) {
      mostrarErrores(msg, err);
      btn.disabled = false;
    }
  } },
    puntajeInput("puntaje"),
    h("div", {}, h("label", { for: "comentario-encuesta", text: "¿Algo para mejorar? (opcional)" }), h("textarea", { id: "comentario-encuesta", name: "comentario", rows: "3", maxlength: "500" })),
    botonAccion("Enviar encuesta", { type: "submit" }), msg);
  return h("section", { "aria-labelledby": "titulo-encuesta" }, h("h2", { id: "titulo-encuesta", text: "Encuesta de satisfacción" }), h("p", { text: "¿Qué tan conforme quedaste con tu compra?" }), form);
}

/* ---------- Soporte ---------- */

function vistaSoporte() {
  const msg = h("div", { role: "alert", "aria-live": "polite" });
  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await api.soporte({ nombre: form.nombre.value, email: form.email.value, mensaje: form.mensaje.value });
      form.replaceWith(h("p", { class: "mensaje-exito", text: "¡Recibimos tu consulta! Te respondemos por e-mail a la brevedad." }));
    } catch (err) {
      mostrarErrores(msg, err);
      btn.disabled = false;
    }
  } },
    campo("Nombre", "nombre", { required: true, maxlength: 100, value: estado.usuario ? estado.usuario.nombre : "", autocomplete: "name" }),
    campo("E-mail", "email", { type: "email", required: true, maxlength: 120, autocomplete: "email" }),
    h("div", {}, h("label", { for: "mensaje", text: "Mensaje (10 a 1000 caracteres)" }), h("textarea", { id: "mensaje", name: "mensaje", rows: "5", required: true, minlength: "10", maxlength: "1000" })),
    botonAccion("Enviar consulta", { type: "submit" }), msg);

  const pregunta = (q, r) => h("details", {}, h("summary", { text: q }), h("p", { text: r }));
  vista.append(h("div", { class: "contenido" },
    titulo("Soporte"),
    h("h2", { text: "Preguntas frecuentes" }),
    pregunta("¿Cómo recibo mis entradas?", "Al comprar se generan tus tickets con código QR. Podés verlos en Mis tickets, descargarlos en PDF, imprimirlos o recibirlos por e-mail."),
    pregunta("¿Puedo comprar sin cuenta?", "No: necesitás registrarte e iniciar sesión para que tus tickets queden asociados a tu cuenta."),
    pregunta("¿Cuántas entradas puedo comprar?", "Hasta 8 por compra. Cada código es válido para una sola persona."),
    pregunta("¿Qué medios de pago aceptan?", "Mercado Pago, Visa, Mastercard, American Express, transferencia bancaria y efectivo (Pago Fácil / Rapipago)."),
    h("h2", { text: "Contactanos" }),
    form));
}

/* ---------- Administración: CRUD de eventos ---------- */

function exigirAdmin() {
  if (estado.usuario && estado.usuario.rol === "admin") return true;
  if (!estado.usuario) {
    sessionStorage.setItem("destinoTrasLogin", location.hash);
    irA("#/login");
  } else {
    vista.append(titulo("Acceso restringido"), h("p", { role: "alert", text: "Necesitás rol de administrador." }));
  }
  return false;
}

async function vistaAdmin(vigente) {
  if (!exigirAdmin()) return;
  const msg = h("div", { role: "status", "aria-live": "polite" });
  const cuerpo = h("tbody");

  const cargar = async () => {
    const eventos = await api.adminEventos();
    vacio(cuerpo);
    cuerpo.append(...eventos.map((ev) => h("tr", {},
      h("td", { class: "alinear-izq", text: ev.titulo }),
      h("td", { text: fechaLarga(ev.fecha) }),
      h("td", { text: `${ev.disponibles} disp. / ${ev.tipos} tipos` }),
      h("td", {}, h("span", { class: ev.activo ? "etiqueta etiqueta--ok" : "etiqueta etiqueta--agotado", text: ev.activo ? "Activo" : "Dado de baja" })),
      h("td", { class: "celda-acciones" },
        h("a", { class: "boton-chico", href: `#/admin/${ev.id}`, "aria-label": `Editar ${ev.titulo}`, text: "Editar" }),
        ev.activo ? h("button", { type: "button", class: "boton-chico boton--peligro", "aria-label": `Dar de baja ${ev.titulo}`, text: "Dar de baja", onclick: async () => {
          if (!confirm(`¿Dar de baja "${ev.titulo}"? Dejará de verse en la cartelera.`)) return;
          try {
            await api.adminBaja(ev.id);
            mostrar(msg, "Evento dado de baja.", "ok");
            await cargar();
          } catch (err) {
            mostrar(msg, err.message);
          }
        } }) : null))));
  };
  await cargar();
  if (!vigente()) return;

  vista.append(h("div", { class: "contenido contenido--ancho" },
    titulo("Administración de eventos"),
    h("p", {}, enlaceAccion("Nuevo evento", "#/admin/nuevo")),
    msg,
    h("div", { class: "tabla-scroll" }, h("table", { class: "tabla-admin" },
      h("caption", { class: "sr-only", text: "Eventos cargados" }),
      h("thead", {}, h("tr", {}, ["Evento", "Fecha", "Stock", "Estado", "Acciones"].map((t) => h("th", { scope: "col", text: t })))),
      cuerpo))));
}

async function vistaAdminForm(id, vigente) {
  if (!exigirAdmin()) return;
  const nuevo = id === "nuevo";
  const ev = nuevo ? { titulo: "", fecha: "", lugar: "", artista: "", imagen_url: "", instagram: "", descripcion: "", activo: true, entradas: [{ nombre: "", precio: "", stock: "", vendidas: 0 }] } : await api.adminEvento(id);
  if (!vigente()) return;

  const msg = h("div", { role: "alert", "aria-live": "assertive" });
  const filas = h("div", { id: "tipos-entrada" });

  const filaTipo = (t = {}) => {
    const n = filas.children.length + 1;
    const fila = h("fieldset", { class: "fila-entrada", "data-id": t.id || "", "data-vendidas": t.vendidas || 0 },
      h("legend", { text: `Tipo de entrada ${n}${t.vendidas ? ` (${t.vendidas} vendidas)` : ""}` }),
      h("label", { text: "Nombre" }, h("input", { name: "t_nombre", required: true, value: t.nombre ?? "" })),
      h("label", { text: "Precio (ARS)" }, h("input", { name: "t_precio", type: "number", min: "0", step: "0.01", required: true, value: t.precio ?? "" })),
      h("label", { text: "Stock" }, h("input", { name: "t_stock", type: "number", min: String(t.vendidas || 0), required: true, value: t.stock ?? "" })),
      t.vendidas ? null : h("button", { type: "button", class: "boton-chico boton--peligro", text: "Quitar", onclick: () => fila.remove() }));
    return fila;
  };
  filas.append(...ev.entradas.map(filaTipo));

  const form = h("form", { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const datos = {
      titulo: form.titulo.value.trim(), fecha: form.fecha.value || null, lugar: form.lugar.value.trim(), artista: form.artista.value.trim(),
      imagen_url: form.imagen_url.value.trim(), instagram: form.instagram.value.trim(), descripcion: form.descripcion.value.trim(), activo: form.activo.checked,
      entradas: [...filas.children].map((f) => ({
        ...(f.dataset.id ? { id: Number(f.dataset.id) } : {}),
        nombre: f.querySelector("[name=t_nombre]").value.trim(), precio: f.querySelector("[name=t_precio]").value, stock: f.querySelector("[name=t_stock]").value
      }))
    };
    try {
      if (nuevo) await api.adminCrear(datos);
      else await api.adminActualizar(id, datos);
      irA("#/admin");
    } catch (err) {
      mostrarErrores(msg, err);
      btn.disabled = false;
    }
  } },
    campo("Título *", "titulo", { required: true, maxlength: 120, value: ev.titulo }),
    campo("Fecha (vacío = a confirmar)", "fecha", { type: "date", value: ev.fecha || "" }),
    campo("Lugar", "lugar", { maxlength: 150, value: ev.lugar || "" }),
    campo("Artista", "artista", { value: ev.artista || "" }),
    campo("URL de la imagen *", "imagen_url", { type: "url", required: true, value: ev.imagen_url }),
    campo("Enlace de red social", "instagram", { type: "url", value: ev.instagram || "" }),
    h("div", {}, h("label", { for: "descripcion", text: "Descripción" }), h("textarea", { id: "descripcion", name: "descripcion", rows: "4", text: ev.descripcion })),
    h("label", { class: "check-label" }, h("input", { type: "checkbox", name: "activo", checked: ev.activo }), " Visible en la cartelera"),
    h("h2", { text: "Tipos de entrada" }), filas,
    h("p", {}, h("button", { type: "button", class: "boton-chico", text: "Agregar tipo de entrada", onclick: () => filas.append(filaTipo()) })),
    botonAccion(nuevo ? "Crear evento" : "Guardar cambios", { type: "submit" }), msg);

  vista.append(h("div", { class: "contenido contenido--ancho" }, titulo(nuevo ? "Nuevo evento" : `Editar: ${ev.titulo}`), form, h("p", {}, h("a", { href: "#/admin", text: "← Volver al listado" }))));
}

/* ---------- Arranque ---------- */

window.addEventListener("hashchange", enrutar);

(async () => {
  try {
    const s = await api.sesion();
    estado.usuario = s.autenticado ? s.usuario : null;
  } catch (err) {
    if (!(err instanceof ErrorApi)) throw err;
  }
  pintarCuenta();
  enrutar();
})();
