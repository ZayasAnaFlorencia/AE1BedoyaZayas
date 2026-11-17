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

/* ---------- Router ---------- */

const rutas = [
  [/^#?\/?$/, vistaCartelera],
  [/^#\/evento\/(\d+)$/, vistaEvento],
  [/^#\/comprar\/(\d+)(?:\/(\d+))?$/, vistaComprar],
  [/^#\/login$/, vistaLogin],
  [/^#\/registro$/, vistaRegistro],
  [/^#\/mis-tickets$/, vistaMisTickets],
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
      h("p", {}, h("a", { href: "#/", text: "← Volver a la cartelera" })))));
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
        h("p", {}, h("a", { href: "#/mis-tickets", text: "Ver mis tickets" }))));
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
        h("p", {}, "Orden ", h("code", { text: o.codigo }), " · "),
        h("ul", {}, o.tickets.map((t) => h("li", {}, h("code", { text: t.codigo }), t.usado ? " — usado" : " — válido")))))
    : [h("p", {}, "Todavía no compraste entradas. ", h("a", { href: "#/", text: "Mirá la cartelera" }), ".")];

  vista.append(h("div", { class: "contenido" }, titulo("Mis tickets"), h("div", { id: "mis-tickets-resultado", "aria-live": "polite" }, lista)));
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
