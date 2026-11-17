/* =========================================================
   mis_tickets.js — "Mis entradas"
   Preferencia: GET /api/ordenes.php si hay sesión.
   Fallback: búsqueda por e-mail en store local (demo offline).
   ========================================================= */

(() => {
  const form = document.querySelector("#form-mis-tickets");
  const resultado = document.querySelector("#mis-tickets-resultado");
  const { esc, precio } = TS;

  function pintarOrdenes(ordenes) {
    if (!resultado) return;
    if (!ordenes.length) {
      resultado.innerHTML = "<p>No hay compras para mostrar.</p>";
      return;
    }
    resultado.innerHTML = ordenes.map((o) => {
      const id = o.codigo || o.id;
      const titulo = o.eventoTitulo || o.evento || "";
      const tipo = o.tipoNombre || o.tipo_entrada || "";
      const creada = o.creadaEn || o.creada || "";
      const pago = TS.MEDIOS_PAGO[o.pago] || o.pago || o.medio_pago || "";
      return `
      <a class="ticket-resumen" href="ticket.html?orden=${encodeURIComponent(id)}">
        <div>
          <h3>${esc(titulo)}</h3>
          <p>${o.cantidad} × ${esc(tipo)} — ${precio(o.total)}</p>
          <p><small>Compra ${esc(id)}${creada ? " · " + esc(TS.fechaHora(creada)) : ""} · ${esc(pago)}</small></p>
        </div>
        <span class="enlace-flecha">Ver tickets (QR / PDF) <span aria-hidden="true">→</span></span>
      </a>`;
    }).join("");
  }

  /* Carga automática si hay sesión en el servidor */
  (async () => {
    if (typeof TS_API === "undefined") return;
    try {
      const sesion = await TS_API.getSesion();
      if (!sesion.autenticado) return;
      const ordenes = await TS_API.getOrdenes();
      if (resultado) {
        resultado.innerHTML = "<p class=\"ayuda-campo\">Entradas de tu cuenta:</p>";
        pintarOrdenes(ordenes);
      }
      // Ocultar el form de e-mail si ya estamos logueados
      if (form && ordenes) form.hidden = true;
    } catch (err) {
      console.warn("[mis_tickets] API:", err.message);
    }
  })();

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.querySelector("#mis-email") || {}).value?.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      resultado.innerHTML = '<div class="mensaje-error-caja"><p class="mensaje-error">Ingresá un e-mail válido.</p></div>';
      return;
    }

    // Intento API (por si en el futuro hay búsqueda); hoy órdenes son por sesión
    try {
      const sesion = await TS_API.getSesion();
      if (sesion.autenticado) {
        const ordenes = await TS_API.getOrdenes();
        pintarOrdenes(ordenes);
        return;
      }
    } catch (_) { /* seguir con local */ }

    const ordenes = TS.ordenesPorEmail(email).reverse();
    if (!ordenes.length) {
      resultado.innerHTML = "<p>No encontramos compras con ese e-mail en este dispositivo. Si compraste con cuenta, <a href=\"login.html?next=mis_tickets.html\">iniciá sesión</a>.</p>";
      return;
    }
    pintarOrdenes(ordenes);
  });
})();
