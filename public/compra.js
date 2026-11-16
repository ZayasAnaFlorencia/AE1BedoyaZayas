/* =========================================================
   compra.js — Pantalla de compra (comprar.html)
   Eventos y órdenes vía API PHP (fetch + async/await).
   Requiere sesión para confirmar la compra en el servidor.
   ========================================================= */

(() => {
  const formulario = document.querySelector("#formulario-compra");
  if (!formulario) return;

  const { esc, precio } = TS;
  const selEvento = document.querySelector("#evento");
  const selTipo = document.querySelector("#tipo-entrada");
  const inputCantidad = document.querySelector("#cantidad");
  const infoStock = document.querySelector("#stock-info");
  const contenedorPagos = document.querySelector("#medios-pago");
  const infoPago = document.querySelector("#pago-info");
  const resumen = document.querySelector("#resumen-compra");
  const confirmacion = document.querySelector("#confirmacion-compra");

  const LIMITE_POR_COMPRA = 8;
  let medioElegido = "";
  let tipoPedidoUsado = false;
  /** Caché en memoria de eventos (lista + detalles cargados). */
  let cacheLista = [];
  const cacheDetalle = new Map();

  const DETALLE_PAGO = {
    mercadopago: "Pagarás con tu cuenta de Mercado Pago.",
    visa: "Pagarás con tarjeta Visa (crédito o débito).",
    mastercard: "Pagarás con tarjeta Mastercard (crédito o débito).",
    amex: "Pagarás con tarjeta American Express.",
    transferencia: "Pagarás por transferencia bancaria.",
    efectivo: "Pagarás en efectivo en una sucursal de Pago Fácil o Rapipago."
  };

  const ICONO_PAGO = {
    mercadopago: "🤝", visa: "💳", mastercard: "💳", amex: "💳", transferencia: "🏦", efectivo: "💵"
  };

  function dispTipo(t) {
    if (!t) return 0;
    if (t.disponibles != null) return Math.max(0, Number(t.disponibles));
    return TS.disponibles(t);
  }

  function stockEv(ev) {
    if (!ev) return 0;
    if (ev.disponibles != null && (!ev.entradas || !ev.entradas.length)) {
      return Math.max(0, Number(ev.disponibles));
    }
    if (ev.entradas) return ev.entradas.reduce((s, t) => s + dispTipo(t), 0);
    return TS.stockDisponibleEvento(ev);
  }

  async function obtenerDetalle(id) {
    const key = String(id);
    if (cacheDetalle.has(key)) return cacheDetalle.get(key);
    try {
      const ev = await TS_API.getEvento(id);
      cacheDetalle.set(key, ev);
      return ev;
    } catch (err) {
      console.warn("[compra] API detalle:", err.message);
      const local = TS.getEvento(id);
      if (local) cacheDetalle.set(key, local);
      return local;
    }
  }

  /* ---------- Show y tipo de entrada ---------- */
  async function cargarEventos() {
    try {
      cacheLista = await TS_API.getEventos();
    } catch (err) {
      console.warn("[compra] API lista:", err.message);
      cacheLista = TS.getEventos();
    }

    selEvento.innerHTML = cacheLista.map((ev) => {
      const agotado = stockEv(ev) === 0;
      return `<option value="${esc(String(ev.id))}"${agotado ? " disabled" : ""}>${esc(ev.titulo)}${agotado ? " (agotado)" : ""}</option>`;
    }).join("");

    const params = new URLSearchParams(window.location.search);
    const pedido = params.get("id");
    const elegido = cacheLista.find((ev) => String(ev.id) === String(pedido) && stockEv(ev) > 0);
    selEvento.value = elegido
      ? String(elegido.id)
      : String((cacheLista.find((ev) => stockEv(ev) > 0) || {}).id || "");
  }

  async function cargarTipos() {
    const id = selEvento.value;
    if (!id) { selTipo.innerHTML = ""; return; }

    const ev = await obtenerDetalle(id);
    if (!ev || !ev.entradas) { selTipo.innerHTML = ""; return; }

    selTipo.innerHTML = ev.entradas.map((t, i) => {
      const disp = dispTipo(t);
      const valor = t.id != null ? `id:${t.id}` : `idx:${i}`;
      return `<option value="${esc(valor)}"${disp === 0 ? " disabled" : ""}>${esc(t.nombre)} (${precio(t.precio)})${disp === 0 ? " - agotada" : ""}</option>`;
    }).join("");

    const params = new URLSearchParams(window.location.search);
    const tipoId = params.get("tipo_id");
    const tipoIdx = Number(params.get("tipo"));
    let elegido = null;

    if (!tipoPedidoUsado && tipoId) {
      elegido = ev.entradas.find((t) => String(t.id) === String(tipoId) && dispTipo(t) > 0);
    }
    if (!tipoPedidoUsado && !elegido && Number.isInteger(tipoIdx) && ev.entradas[tipoIdx] && dispTipo(ev.entradas[tipoIdx]) > 0) {
      elegido = ev.entradas[tipoIdx];
    }
    tipoPedidoUsado = true;

    if (!elegido) {
      elegido = ev.entradas.find((t) => dispTipo(t) > 0) || ev.entradas[0];
    }

    if (elegido) {
      selTipo.value = elegido.id != null ? `id:${elegido.id}` : `idx:${ev.entradas.indexOf(elegido)}`;
    }
    ajustarCantidad();
  }

  function tipoActual() {
    const id = selEvento.value;
    const ev = cacheDetalle.get(String(id));
    if (!ev || !ev.entradas) return { ev: null, tipo: null };
    const val = selTipo.value || "";
    let tipo = null;
    if (val.startsWith("id:")) {
      tipo = ev.entradas.find((t) => String(t.id) === val.slice(3));
    } else if (val.startsWith("idx:")) {
      tipo = ev.entradas[Number(val.slice(4))];
    }
    return { ev, tipo };
  }

  function ajustarCantidad() {
    const { tipo } = tipoActual();
    if (!tipo) { infoStock.textContent = ""; actualizarResumen(); return; }
    const disp = dispTipo(tipo);
    const maximo = Math.max(1, Math.min(LIMITE_POR_COMPRA, disp || LIMITE_POR_COMPRA));
    inputCantidad.max = String(maximo);
    if (Number(inputCantidad.value) > maximo) inputCantidad.value = String(maximo);
    if (Number(inputCantidad.value) < 1) inputCantidad.value = "1";
    infoStock.textContent = disp === 0
      ? "Esta entrada está agotada."
      : `Quedan ${disp} disponibles (máximo ${LIMITE_POR_COMPRA} por compra).`;
    actualizarResumen();
  }

  function actualizarResumen() {
    const { ev, tipo } = tipoActual();
    if (!ev || !tipo) { resumen.innerHTML = ""; return; }
    const cant = Math.max(1, Math.floor(Number(inputCantidad.value) || 1));
    resumen.innerHTML = `
      <p><strong>${esc(ev.titulo)}</strong> — ${esc(tipo.nombre)}</p>
      <p>${cant} × ${precio(tipo.precio)} = <strong class="resumen-total">${precio(tipo.precio * cant)}</strong></p>`;
  }

  /* ---------- Medios de pago (solo selección) ---------- */
  function dibujarMediosPago() {
    contenedorPagos.innerHTML = Object.entries(TS.MEDIOS_PAGO).map(([clave, nombre]) => `
      <button type="button" class="medio-pago" role="radio" aria-checked="false" data-medio="${clave}">
        <span class="medio-pago-icono" aria-hidden="true">${ICONO_PAGO[clave]}</span>
        <span>${esc(nombre)}</span>
      </button>`).join("");

    contenedorPagos.addEventListener("click", (e) => {
      const boton = e.target.closest(".medio-pago");
      if (!boton) return;
      medioElegido = boton.dataset.medio;
      contenedorPagos.querySelectorAll(".medio-pago").forEach((b) => {
        const activo = b === boton;
        b.classList.toggle("medio-pago--activo", activo);
        b.setAttribute("aria-checked", String(activo));
      });
      infoPago.textContent = DETALLE_PAGO[medioElegido];
    });
  }

  /* ---------- Envío del formulario (API) ---------- */
  function mostrarError(mensaje) {
    confirmacion.innerHTML = `<div class="mensaje-error-caja"><p class="mensaje-error">${esc(mensaje)}</p></div>`;
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const nombre = document.querySelector("#nombre").value.trim();
    const email = document.querySelector("#email").value.trim();
    const { ev, tipo } = tipoActual();

    if (!nombre) return mostrarError("Ingresá tu nombre.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return mostrarError("Ingresá un e-mail válido: ahí enviamos tus tickets.");
    }
    if (!ev || !tipo) return mostrarError("Elegí un show y un tipo de entrada.");
    if (!medioElegido) return mostrarError("Elegí un medio de pago.");

    const cantidad = Math.max(1, Math.min(LIMITE_POR_COMPRA, Math.floor(Number(inputCantidad.value) || 1)));
    const boton = formulario.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;
    confirmacion.innerHTML = `<p class="mensaje-exito">Procesando compra…</p>`;

    try {
      // Verificar sesión: la API de órdenes exige login
      const sesion = await TS_API.getSesion();
      if (!sesion.autenticado) {
        mostrarError("Necesitás iniciar sesión para comprar. Te redirigimos al login…");
        setTimeout(() => {
          location.href = `login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
        }, 1200);
        return;
      }

      if (tipo.id == null) {
        // Fallback local si el evento vino del store sin ids numéricos de API
        const orden = TS.crearOrden({
          eventoId: ev.id,
          tipoIdx: Number(String(selTipo.value).replace("idx:", "") || 0),
          cantidad,
          pago: medioElegido,
          cliente: {
            nombre, email,
            direccion: document.querySelector("#direccion").value.trim(),
            telefono: document.querySelector("#telefono").value.trim()
          }
        });
        try { sessionStorage.setItem("ts_encuesta_pendiente", orden.id); } catch (_) { /* */ }
        confirmacion.innerHTML = `<p class="mensaje-exito">¡Compra confirmada! Generando tus tickets…</p>`;
        setTimeout(() => { location.href = `ticket.html?orden=${encodeURIComponent(orden.id)}`; }, 1000);
        return;
      }

      const orden = await TS_API.crearOrden({
        tipo_entrada_id: Number(tipo.id),
        cantidad,
        medio_pago: medioElegido,
        cliente_nombre: nombre,
        cliente_email: email,
        cliente_telefono: document.querySelector("#telefono").value.trim() || undefined,
        cliente_direccion: document.querySelector("#direccion").value.trim() || undefined
      });

      try { sessionStorage.setItem("ts_encuesta_pendiente", orden.codigo || orden.id); } catch (_) { /* */ }
      // Guardamos la orden en sessionStorage para ticket.html (la API no tiene GET por código público)
      try { sessionStorage.setItem("ts_ultima_orden", JSON.stringify(orden)); } catch (_) { /* */ }

      confirmacion.innerHTML = `<p class="mensaje-exito">¡Compra confirmada! Generando tus tickets electrónicos…</p>`;
      setTimeout(() => {
        location.href = `ticket.html?orden=${encodeURIComponent(orden.codigo || orden.id)}`;
      }, 1000);
    } catch (error) {
      if (error.status === 401) {
        mostrarError("Necesitás iniciar sesión para comprar.");
        setTimeout(() => {
          location.href = `login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
        }, 1200);
      } else {
        mostrarError(error.message || "No se pudo completar la compra.");
      }
      if (boton) boton.disabled = false;
      cargarTipos();
    }
  });

  selEvento.addEventListener("change", () => { cargarTipos(); });
  selTipo.addEventListener("change", ajustarCantidad);
  inputCantidad.addEventListener("input", ajustarCantidad);

  dibujarMediosPago();
  (async () => {
    await cargarEventos();
    await cargarTipos();
  })();
})();
