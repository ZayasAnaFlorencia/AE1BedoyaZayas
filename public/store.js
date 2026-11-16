/* =========================================================
   store.js — Utilidades + datos locales de TicketShow
   Las entidades de servidor (eventos, sesión, órdenes) se consumen
   con fetch desde api.js. Este módulo conserva:
   - helpers (esc, precio, fechas)
   - reseñas / correos / panel admin demo en localStorage
   - fallback offline si la API no está disponible
   ========================================================= */

const TS = (() => {
  const CLAVES = {
    eventos: "ts_eventos_v1",
    ordenes: "ts_ordenes_v1",
    resenas: "ts_resenas_v1",
    correos: "ts_correos_v1"
  };

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const MEDIOS_PAGO = {
    mercadopago: "Mercado Pago",
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    transferencia: "Transferencia bancaria",
    efectivo: "Efectivo (Pago Fácil / Rapipago)"
  };

  /* ---------- Datos semilla (los de app.js original) ---------- */
  const e = (nombre, precio, stock, vendidas = 0) => ({ nombre, precio, stock, vendidas });
  const GEN = "Próximamente más información.";

  const SEMILLA = [
    {
      id: "bts", titulo: "BTS World Tour ARIRANG", fecha: "2026-10-21",
      imagen: "https://cdn.getcrowder.com/images/b66dd286-ad48-4a83-bed7-eeae6da7b866-bts.jpeg",
      lugar: "Estadio Único de La Plata, Buenos Aires",
      descripcion: "BTS, acrónimo de Bangtan Sonyeondan o “Beyond the Scene”, es una boyband surcoreana nominada al GRAMMY que ha conquistado a millones de fans en todo el mundo desde su debut en junio de 2013. Sus integrantes son RM, Jin, SUGA, j-hope, Jimin, V y Jung Kook.",
      entradas: [e("Campo General", 45000, 500, 120), e("Platea Baja", 60000, 300, 80), e("Platea Alta", 50000, 300, 40), e("VIP + Meet & Greet", 120000, 60, 25)],
      artista: "BTS", instagram: "https://www.instagram.com/bts.bighitofficial/"
    },
    {
      id: "olivia", titulo: "Olivia Wald", fecha: "2026-10-25",
      imagen: "https://cdn.getcrowder.com/images/18214696-0d49-49c5-9f24-a4388031fe2e-image.png?w=480&format=webp",
      lugar: "C Art Media, Buenos Aires",
      descripcion: "Olivia Wald presenta su show en vivo con un repertorio que recorre sus mayores éxitos y canciones nuevas.",
      entradas: [e("Campo General", 80000, 200, 30), e("Platea", 95000, 120, 20), e("VIP", 130000, 40, 10)],
      artista: "Olivia Wald", instagram: "https://www.instagram.com/oliviawald/"
    },
    {
      id: "maroon5", titulo: "Maroon 5", fecha: "2026-11-08",
      imagen: "https://cdn.getcrowder.com/images/ea85912e-de3b-41cb-9209-da3d9a7c2034-maroon5-banneraa-640x640-1.jpg?w=480&format=webp",
      lugar: "Estadio Obras, Buenos Aires",
      descripcion: "La banda estadounidense liderada por Adam Levine llega a Buenos Aires con sus grandes hits del pop rock.",
      entradas: [e("Campo General", 75000, 400, 90), e("Platea Baja", 95000, 200, 50), e("VIP", 140000, 50, 12)],
      artista: "Maroon 5", instagram: "https://www.instagram.com/maroon5/"
    },
    {
      id: "calamaro", titulo: "Andrés Calamaro", fecha: "2026-11-20",
      imagen: "https://cdn.getcrowder.com/images/957fb504-d4ae-4d2c-8269-620f49958fbf-image.jpeg?w=480&format=webp",
      lugar: "Palacio de los Deportes, Buenos Aires",
      descripcion: "Andrés Calamaro vuelve a los escenarios con un show que repasa las canciones más queridas de su carrera.",
      entradas: [e("Campo General", 65000, 300, 60), e("Platea", 80000, 150, 35), e("VIP", 110000, 40, 8)],
      artista: "Andrés Calamaro", instagram: "https://www.instagram.com/andrescalamaro/"
    },
    {
      id: "foofighters", titulo: "Foo Fighters", fecha: "",
      imagen: "https://cdn.getcrowder.com/images/6450bfb0-e5a3-4527-b326-20aceb834f98-9cb0ea32-0e49-40ad-b09a-0962eae3a21d-foofighters-bannersaa-1920x720.jpg?w=960&format=webp",
      lugar: "",
      descripcion: "La banda de rock liderada por Dave Grohl llega con su gira en vivo.",
      entradas: [e("Campo General", 70000, 400), e("Platea", 90000, 200)],
      artista: "Foo Fighters", instagram: "https://www.instagram.com/foofighters/"
    },
    // ⚠️ Shows pendientes de completar con datos reales (se editan desde admin.html)
    { id: "show1", titulo: "Show 1", fecha: "", lugar: "", descripcion: GEN, artista: "", instagram: "",
      imagen: "https://cdn.getcrowder.com/images/287e865e-4338-4e21-94e2-a45e6c84e122-017547dd-d457-4dd2-a684-080027698ae6-06d3e074-b3c8-4ac9-84c5-88b0bff0dfef.jpg?w=960&format=webp",
      entradas: [e("Entrada General", 50000, 200)] },
    { id: "show2", titulo: "Show 2", fecha: "", lugar: "", descripcion: GEN, artista: "", instagram: "",
      imagen: "https://cdn.getcrowder.com/images/96b59e76-950c-4536-bb44-8e30b7c09426-image.png?w=640&format=webp",
      entradas: [e("Entrada General", 50000, 200)] },
    { id: "show3", titulo: "Show 3", fecha: "", lugar: "", descripcion: GEN, artista: "", instagram: "",
      imagen: "https://cdn.getcrowder.com/images/94e7857f-33d2-4e86-8c6b-1c2ce07667b3-640x640.png?w=480&format=webp",
      entradas: [e("Entrada General", 50000, 200)] },
    { id: "show4", titulo: "Show 4", fecha: "", lugar: "", descripcion: GEN, artista: "", instagram: "",
      imagen: "https://cdn.getcrowder.com/images/e723dbb5-22e6-4f53-b343-ee2383179488-pagweb-17-5.jpg?w=480&format=webp",
      entradas: [e("Entrada General", 50000, 200)] },
    { id: "show6", titulo: "Show 6", fecha: "", lugar: "", descripcion: GEN, artista: "", instagram: "",
      imagen: "https://cdn.getcrowder.com/images/12491991-802b-4c4e-95b0-1dcb5f993be0-b94994fd-d6a7-478c-b4a4-b3f640878dda-whatsapp-image-2026-06-12-at-12.53.19.jpg?w=640&format=webp",
      entradas: [e("Entrada General", 50000, 200)] }
  ];

  /* ---------- Utilidades ---------- */
  function leer(clave, porDefecto) {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch (_) { return porDefecto; }
  }

  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (_) { /* sin almacenamiento */ }
  }

  /**
   * OWASP A03 — Injection: escapa texto antes de insertarlo con innerHTML.
   * Usar siempre que el valor venga de API, localStorage o input de usuario.
   * Preferir .textContent / .innerText cuando solo se muestra texto plano.
   */
  function esc(texto) {
    return String(texto ?? "").replace(/[&<>"'`=/]/g, (c) =>
      ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
        "'": "&#39;", "`": "&#96;", "=": "&#61;", "/": "&#47;"
      }[c]));
  }

  /** Escape orientado a atributos HTML (value, title, data-*). */
  function escAttr(texto) {
    return esc(texto);
  }

  /**
   * Solo permite URLs http(s) o rutas relativas seguras.
   * Bloquea javascript:, data: texto, vbscript:, etc.
   */
  function urlSegura(url) {
    const u = String(url ?? "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[./#?]/.test(u) && !/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
    return "";
  }

  /** Asigna solo texto (sin HTML). Preferido frente a innerHTML. */
  function setText(el, texto) {
    if (!el) return;
    el.textContent = texto == null ? "" : String(texto);
  }

  /**
   * Mensaje de UI: usa textContent si es texto plano;
   * si hace falta markup fijo, solo interpola valores ya escapados.
   */
  function setMsg(el, texto, tipo) {
    if (!el) return;
    el.className = (el.className || "").replace(/\bmensaje-(error|exito|error-caja)\b/g, "").trim();
    if (tipo === "error") {
      el.classList.add("mensaje-error-caja");
      el.replaceChildren();
      const p = document.createElement("p");
      p.className = "mensaje-error";
      p.textContent = texto == null ? "" : String(texto);
      el.appendChild(p);
    } else if (tipo === "exito") {
      el.classList.add("mensaje-exito");
      el.textContent = texto == null ? "" : String(texto);
    } else {
      el.textContent = texto == null ? "" : String(texto);
    }
  }

  function precio(n) {
    return "$" + Number(n || 0).toLocaleString("es-AR");
  }

  // "2026-10-21" -> "21 de octubre de 2026"; vacío -> "A confirmar"
  function fechaLarga(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "A confirmar";
    return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
  }

  function fechaCorta(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "A confirmar";
  }

  function fechaHora(isoCompleto) {
    const d = new Date(isoCompleto);
    return isNaN(d) ? "" : d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" });
  }

  function codigoAleatorio(prefijo, largo = 8) {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones
    let s = "";
    const bytes = crypto.getRandomValues(new Uint8Array(largo));
    bytes.forEach((b) => { s += alfabeto[b % alfabeto.length]; });
    return `${prefijo}-${s}`;
  }

  function slug(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "evento";
  }

  /* ---------- Eventos y stock ---------- */
  function getEventos() {
    let lista = leer(CLAVES.eventos, null);
    if (!Array.isArray(lista)) {
      lista = JSON.parse(JSON.stringify(SEMILLA));
      guardar(CLAVES.eventos, lista);
    }
    return lista;
  }

  function getEvento(id) {
    return getEventos().find((ev) => ev.id === id) || null;
  }

  function guardarEvento(evento) {
    const lista = getEventos();
    const i = lista.findIndex((x) => x.id === evento.id);
    if (i >= 0) lista[i] = evento; else lista.push(evento);
    guardar(CLAVES.eventos, lista);
  }

  function eliminarEvento(id) {
    guardar(CLAVES.eventos, getEventos().filter((x) => x.id !== id));
  }

  function nuevoIdEvento(titulo) {
    const base = slug(titulo);
    let id = base, n = 2;
    while (getEvento(id)) id = `${base}-${n++}`;
    return id;
  }

  const disponibles = (tipo) => Math.max(0, (tipo.stock || 0) - (tipo.vendidas || 0));
  const precioDesde = (ev) => ev.entradas.length ? Math.min(...ev.entradas.map((t) => t.precio)) : 0;
  const stockDisponibleEvento = (ev) => ev.entradas.reduce((s, t) => s + disponibles(t), 0);

  /* ---------- Órdenes y tickets ---------- */
  const getOrdenes = () => leer(CLAVES.ordenes, []);
  const getOrden = (id) => getOrdenes().find((o) => o.id === id) || null;

  function ordenesPorEmail(email) {
    const buscado = String(email || "").trim().toLowerCase();
    return getOrdenes().filter((o) => o.cliente.email.toLowerCase() === buscado);
  }

  // Valida stock, lo descuenta y genera la orden con un ticket (y QR) por entrada.
  function crearOrden({ eventoId, tipoIdx, cantidad, cliente, pago }) {
    const eventos = getEventos();
    const ev = eventos.find((x) => x.id === eventoId);
    if (!ev) throw new Error("El show elegido no existe.");
    const tipo = ev.entradas[tipoIdx];
    if (!tipo) throw new Error("El tipo de entrada elegido no existe.");
    if (!MEDIOS_PAGO[pago]) throw new Error("Elegí un medio de pago.");
    const cant = Math.floor(Number(cantidad));
    if (!(cant >= 1)) throw new Error("La cantidad debe ser al menos 1.");
    if (cant > disponibles(tipo)) {
      throw new Error(disponibles(tipo) === 0
        ? "Esa entrada está agotada."
        : `Solo quedan ${disponibles(tipo)} entradas de ${tipo.nombre}.`);
    }

    tipo.vendidas = (tipo.vendidas || 0) + cant;
    guardar(CLAVES.eventos, eventos);

    const id = codigoAleatorio("ORD", 6);
    const orden = {
      id,
      codigo: id,
      creada: new Date().toISOString(),
      eventoId: ev.id,
      eventoTitulo: ev.titulo,
      eventoFecha: ev.fecha,
      eventoLugar: ev.lugar,
      tipoNombre: tipo.nombre,
      precioUnitario: tipo.precio,
      cantidad: cant,
      total: tipo.precio * cant,
      pago,
      estado: "Confirmada",
      cliente,
      tickets: Array.from({ length: cant }, () => ({ codigo: codigoAleatorio("TS", 10), usado: false, usadoEn: null }))
    };
    const ordenes = getOrdenes();
    ordenes.push(orden);
    guardar(CLAVES.ordenes, ordenes);
    return orden;
  }

  // Busca un ticket por su código (el que viaja dentro del QR)
  function buscarTicket(codigoCrudo) {
    // El QR contiene "TICKETSHOW|<codigo>|<eventoId>"; también aceptamos el código solo
    const partes = String(codigoCrudo || "").trim().toUpperCase().split("|");
    const codigo = partes.length >= 2 ? partes[1] : partes[0];
    for (const o of getOrdenes()) {
      const t = o.tickets.find((x) => x.codigo.toUpperCase() === codigo);
      if (t) return { orden: o, ticket: t };
    }
    return null;
  }

  function marcarTicketUsado(codigo) {
    const ordenes = getOrdenes();
    for (const o of ordenes) {
      const t = o.tickets.find((x) => x.codigo === codigo);
      if (t) {
        t.usado = true;
        t.usadoEn = new Date().toISOString();
        guardar(CLAVES.ordenes, ordenes);
        return true;
      }
    }
    return false;
  }

  const payloadQR = (ticket, orden) => `TICKETSHOW|${ticket.codigo}|${orden.eventoId}`;

  // Versión compacta de la orden para viajar en un enlace (ticket.html#d=...)
  function ordenAHash(o) {
    const compacta = { i: o.id, t: o.eventoTitulo, f: o.eventoFecha, l: o.eventoLugar, n: o.tipoNombre,
      c: o.cantidad, m: o.total, p: o.pago, u: o.cliente.nombre, e: o.eventoId, k: o.tickets.map((x) => x.codigo) };
    return "d=" + btoa(unescape(encodeURIComponent(JSON.stringify(compacta))));
  }

  function hashAOrden(hash) {
    try {
      const m = /d=([^&]+)/.exec(hash || "");
      if (!m) return null;
      const c = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      return {
        id: c.i, codigo: c.i, eventoTitulo: c.t, eventoFecha: c.f, eventoLugar: c.l, tipoNombre: c.n,
        cantidad: c.c, total: c.m, pago: c.p, eventoId: c.e, estado: "Confirmada", desdeEnlace: true,
        cliente: { nombre: c.u, email: "" },
        tickets: c.k.map((codigo) => ({ codigo, usado: false }))
      };
    } catch (_) { return null; }
  }

  /* ---------- Reseñas ---------- */
  const getResenas = (eventoId) => {
    const todas = leer(CLAVES.resenas, []);
    return eventoId ? todas.filter((r) => r.eventoId === eventoId) : todas;
  };

  function agregarResena({ eventoId, nombre, email, puntaje, comentario }) {
    const p = Math.round(Number(puntaje));
    if (!(p >= 1 && p <= 5)) throw new Error("Elegí un puntaje de 1 a 5 estrellas.");
    if (!String(nombre).trim()) throw new Error("Ingresá tu nombre.");
    const mail = String(email || "").trim().toLowerCase();
    // "Compra verificada": el e-mail coincide con una orden de ese show
    const verificada = !!mail && getOrdenes().some((o) => o.eventoId === eventoId && o.cliente.email.toLowerCase() === mail);
    const resenas = leer(CLAVES.resenas, []);
    const nueva = {
      id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      eventoId, nombre: String(nombre).trim().slice(0, 60), puntaje: p,
      comentario: String(comentario || "").trim().slice(0, 500),
      verificada, fecha: new Date().toISOString()
    };
    resenas.unshift(nueva);
    guardar(CLAVES.resenas, resenas);
    return nueva;
  }

  function eliminarResena(id) {
    guardar(CLAVES.resenas, leer(CLAVES.resenas, []).filter((r) => r.id !== id));
  }

  function resumenResenas(eventoId) {
    const lista = getResenas(eventoId);
    if (!lista.length) return { promedio: 0, total: 0 };
    return { promedio: lista.reduce((s, r) => s + r.puntaje, 0) / lista.length, total: lista.length };
  }

  function estrellas(promedio) {
    const llenas = Math.round(promedio);
    return "★".repeat(llenas) + "☆".repeat(5 - llenas);
  }

  /* ---------- Bandeja de e-mails enviados ---------- */
  const getCorreos = () => leer(CLAVES.correos, []);
  function registrarCorreo(correo) {
    const lista = getCorreos();
    lista.unshift({ ...correo, fecha: new Date().toISOString() });
    guardar(CLAVES.correos, lista.slice(0, 200));
  }

  function restaurarDatosIniciales() {
    Object.values(CLAVES).forEach((k) => { try { localStorage.removeItem(k); } catch (_) { /* nada */ } });
  }

  return {
    MEDIOS_PAGO, getEventos, getEvento, guardarEvento, eliminarEvento, nuevoIdEvento,
    disponibles, precioDesde, stockDisponibleEvento,
    getOrdenes, getOrden, ordenesPorEmail, crearOrden, buscarTicket, marcarTicketUsado,
    payloadQR, ordenAHash, hashAOrden,
    getResenas, agregarResena, eliminarResena, resumenResenas, estrellas,
    getCorreos, registrarCorreo, restaurarDatosIniciales,
    esc, escAttr, urlSegura, setText, setMsg,
    precio, fechaLarga, fechaCorta, fechaHora
  };
})();
