/* =========================================================
   ticket.js — Tickets electrónicos (ticket.html)
   - Muestra cada entrada con su código QR
   - Descarga PDF (uno por entrada, todo en un archivo)
   - Envía los tickets por e-mail (EmailJS si está configurado,
     o mailto: como alternativa) y lo registra en la bandeja simulada
   ========================================================= */

(() => {
  const contenedor = document.querySelector("#ticket-contenedor");
  if (!contenedor) return;

  const { esc, precio } = TS;

  /* ---------- Obtener la orden: API/sessionStorage, store local o hash ---------- */
  const idOrden = new URLSearchParams(window.location.search).get("orden");
  let orden = null;

  try {
    const crudo = sessionStorage.getItem("ts_ultima_orden");
    if (crudo) {
      const candidata = JSON.parse(crudo);
      if (!idOrden || String(candidata.codigo || candidata.id) === String(idOrden)) {
        orden = candidata;
      }
    }
  } catch (_) { /* ignore */ }

  if (!orden && idOrden && typeof TS.getOrden === "function") {
    orden = TS.getOrden(idOrden);
  }
  if (!orden) orden = TS.hashAOrden(window.location.hash);

  if (orden && !orden.cliente) {
    orden.cliente = {
      nombre: orden.cliente_nombre || "",
      email: orden.cliente_email || ""
    };
  }
  if (orden && !orden.id) orden.id = orden.codigo;
  if (orden && !orden.eventoTitulo) orden.eventoTitulo = orden.evento || "";
  if (orden && !orden.eventoFecha) orden.eventoFecha = orden.fecha || "";
  if (orden && !orden.eventoLugar) orden.eventoLugar = orden.lugar || "";
  if (orden && !orden.tipoNombre) orden.tipoNombre = orden.tipo_entrada || "";
  if (orden && !orden.tickets) orden.tickets = [];

  if (!orden) {
    contenedor.innerHTML = `
      <h2>No encontramos esa compra</h2>
      <p>Revisá el enlace o buscá tus tickets por e-mail en <a href="mis_tickets.html">Mis tickets</a>.
      Si compraste con cuenta, <a href="login.html?next=mis_tickets.html">iniciá sesión</a>.</p>`;
    return;
  }

  /* ---------- QR ---------- */
  function crearQR(texto) {
    const qr = qrcode(0, "M");
    qr.addData(texto);
    qr.make();
    return qr;
  }

  function qrComoSVG(texto) {
    const qr = crearQR(texto);
    const n = qr.getModuleCount();
    const margen = 2;
    let rects = "";
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(f, c)) rects += `<rect x="${c + margen}" y="${f + margen}" width="1" height="1"/>`;
      }
    }
    const lado = n + margen * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" role="img" aria-label="Código QR del ticket">
      <rect width="${lado}" height="${lado}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  }

  /* ---------- Pantalla ---------- */
  // Reseña y encuesta se ofrecen únicamente al finalizar la compra (no al volver a ver los tickets)
  let compraReciente = false;
  try { compraReciente = sessionStorage.getItem("ts_encuesta_pendiente") === orden.id; } catch (_) { /* sin sesión */ }

  function dibujarTickets() {
    const tarjetas = orden.tickets.map((t, i) => `
      <article class="ticket-card">
        <div class="ticket-info">
          <p class="ticket-marca">🎟️ TICKETSHOW</p>
          <h3>${esc(orden.eventoTitulo)}</h3>
          <p><strong>Fecha:</strong> ${TS.fechaLarga(orden.eventoFecha)}</p>
          <p><strong>Lugar:</strong> ${esc(orden.eventoLugar || "A confirmar")}</p>
          <p><strong>Entrada:</strong> ${esc(orden.tipoNombre)} <span class="ticket-num">(${i + 1} de ${orden.tickets.length})</span></p>
          <p><strong>Titular:</strong> ${esc(orden.cliente.nombre)}</p>
          <p class="ticket-codigo">${esc(t.codigo)}</p>
          ${t.usado ? '<p class="etiqueta etiqueta--agotado">Ya utilizado</p>' : ""}
          <button type="button" class="enlace-accion" data-pdf="${i}">Descargar PDF</button>
        </div>
        <div class="ticket-qr">${qrComoSVG(TS.payloadQR(t, orden))}</div>
      </article>`).join("");

    contenedor.innerHTML = `
      <h2>Tus tickets electrónicos</h2>
      <div class="mensaje-exito">
        <p><strong>Compra ${esc(orden.id)}</strong> — ${orden.cantidad} × ${esc(orden.tipoNombre)} — Total ${precio(orden.total)}</p>
        <p>Medio de pago elegido: ${esc(TS.MEDIOS_PAGO[orden.pago] || orden.pago)}</p>
      </div>

      <div class="acciones-ticket">
        <button type="button" class="enlace-accion" id="btn-pdf-todos">⬇ Descargar PDF${orden.tickets.length > 1 ? " (todos)" : ""}</button>
        <button type="button" class="enlace-accion" id="btn-email">✉ Enviar por e-mail</button>
        <button type="button" class="enlace-accion" id="btn-imprimir">🖨 Imprimir</button>
      </div>
      <div id="ticket-mensaje" aria-live="polite"></div>

      <div class="ticket-lista">${tarjetas}</div>

      <p class="ayuda-campo">Presentá el QR (en el celular o impreso) en el acceso del show. Cada código es válido para una sola persona.</p>
      ${compraReciente ? `<div class="siguientes-pasos">
        <a class="siguiente-paso" href="producto.html?id=${encodeURIComponent(orden.eventoId)}#seccion-resenas">
          <span>★ Dejar una reseña del show</span><span class="flecha" aria-hidden="true">→</span></a>
        <a class="siguiente-paso" href="encuesta.html">
          <span>Responder encuesta de satisfacción</span><span class="flecha" aria-hidden="true">→</span></a>
      </div>` : ""}`;

    contenedor.querySelector("#btn-pdf-todos").addEventListener("click", () => descargarPDF());
    contenedor.querySelectorAll("[data-pdf]").forEach((b) =>
      b.addEventListener("click", () => descargarPDF(Number(b.dataset.pdf))));
    contenedor.querySelector("#btn-email").addEventListener("click", enviarPorEmail);
    contenedor.querySelector("#btn-imprimir").addEventListener("click", () => window.print());
  }

  /* ---------- PDF ---------- */
  // jsPDF solo trae fuentes Latin-1: reemplazamos lo que no se pueda dibujar
  const latin = (s) => String(s ?? "").normalize("NFC").replace(/[^ -ÿ]/g, "?");

  function dibujarTicketPDF(doc, ticket, indice) {
    const W = 210, H = 90;
    doc.setFillColor(18, 18, 24); doc.rect(0, 0, W, H, "F");
    doc.setFillColor(230, 57, 70); doc.rect(0, 0, 6, H, "F");          // franja roja
    doc.setFillColor(38, 12, 93); doc.rect(6, 0, 144, 16, "F");        // cabecera violeta

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("TICKETSHOW", 14, 10.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(latin(T(`Entrada ${indice + 1} de ${orden.tickets.length}`)), 146, 10.5, { align: "right" });

    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    const titulo = doc.splitTextToSize(latin(orden.eventoTitulo), 132).slice(0, 2);
    doc.text(titulo, 14, 28);

    let y = 28 + titulo.length * 7 + 2;
    doc.setFontSize(10);
    const fila = (etiqueta, valor) => {
      doc.setFont("helvetica", "bold"); doc.setTextColor(180, 180, 200); doc.text(etiqueta, 14, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(255, 255, 255);
      doc.text(doc.splitTextToSize(latin(valor), 108)[0], 38, y);
      y += 6.5;
    };
    fila(T("Fecha"), T(TS.fechaLarga(orden.eventoFecha)));
    fila(T("Lugar"), T(orden.eventoLugar || "A confirmar"));
    fila(T("Entrada"), T(orden.tipoNombre));
    fila(T("Titular"), orden.cliente.nombre);

    doc.setFont("courier", "bold"); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    doc.text(ticket.codigo, 14, H - 10);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 170);
    doc.text(latin(T(`Compra ${orden.id} - Válido para una persona. Presentá este QR en el acceso.`)), 14, H - 4.5);

    // Línea punteada de corte
    doc.setDrawColor(90, 90, 110);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(154, 4, 154, H - 4);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    // QR en vectores (nítido a cualquier tamaño)
    const qr = crearQR(TS.payloadQR(ticket, orden));
    const n = qr.getModuleCount();
    const caja = 46, margenQR = 3;
    const x0 = 156 + (W - 156 - caja) / 2, y0 = (H - caja) / 2;
    doc.setFillColor(255, 255, 255); doc.roundedRect(x0 - margenQR, y0 - margenQR, caja + margenQR * 2, caja + margenQR * 2, 2, 2, "F");
    const m = caja / n;
    doc.setFillColor(0, 0, 0);
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(f, c)) doc.rect(x0 + c * m, y0 + f * m, m + 0.01, m + 0.01, "F");
      }
    }
  }

  function descargarPDF(soloIndice) {
    const mensaje = contenedor.querySelector("#ticket-mensaje");
    if (!window.jspdf) {
      mensaje.innerHTML = '<div class="mensaje-error-caja"><p class="mensaje-error">No se pudo cargar el generador de PDF.</p></div>';
      return;
    }
    const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: [210, 90] });
    const indices = typeof soloIndice === "number" ? [soloIndice] : orden.tickets.map((_, i) => i);
    indices.forEach((i, pos) => {
      if (pos > 0) doc.addPage([210, 90], "landscape");
      dibujarTicketPDF(doc, orden.tickets[i], i);
    });
    const sufijo = typeof soloIndice === "number" ? `-${soloIndice + 1}` : "";
    doc.save(`TicketShow-${orden.id}${sufijo}.pdf`);
  }

  /* ---------- Envío por e-mail ---------- */
  function enlaceTicket() {
    const base = window.location.href.split("#")[0].split("?")[0];
    return `${base}#${TS.ordenAHash(orden)}`;
  }

  async function enviarPorEmail() {
    const mensaje = contenedor.querySelector("#ticket-mensaje");
    const destino = orden.cliente.email || window.prompt(T("¿A qué e-mail enviamos los tickets?"));
    if (!destino) return;

    const codigos = orden.tickets.map((t) => t.codigo).join("\n");
    const link = enlaceTicket();
    const cfg = TS_CONFIG.emailjs;
    const asunto = T(`Tus tickets para ${orden.eventoTitulo}`);
    const cuerpo =
      `${T("Hola")} ${orden.cliente.nombre},\n\n${T("¡Gracias por tu compra en TicketShow!")}\n\n` +
      `${T("Show")}: ${orden.eventoTitulo}\n${T("Fecha")}: ${T(TS.fechaLarga(orden.eventoFecha))}\n${T("Lugar")}: ${T(orden.eventoLugar || "A confirmar")}\n` +
      `${T("Entrada")}: ${T(orden.tipoNombre)} x${orden.cantidad}\n\n${T("Códigos de tus tickets:")}\n${codigos}\n\n` +
      `${T("Abrí tus tickets con el código QR acá:")}\n${link}\n\n${T("¡Disfrutá el show!")}`;

    const registrar = (modo) => TS.registrarCorreo({ para: destino, asunto, ordenId: orden.id, modo });

    if (cfg.serviceId && cfg.templateId && cfg.publicKey) {
      try {
        const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: cfg.serviceId, template_id: cfg.templateId, user_id: cfg.publicKey,
            template_params: {
              to_email: destino, to_name: orden.cliente.nombre, evento: orden.eventoTitulo,
              fecha: T(TS.fechaLarga(orden.eventoFecha)), lugar: T(orden.eventoLugar || "A confirmar"),
              codigos, link_ticket: link
            }
          })
        });
        if (!r.ok) throw new Error(`EmailJS respondió ${r.status}`);
        registrar("EmailJS");
        mensaje.innerHTML = `<p class="mensaje-exito">Enviamos tus tickets a ${esc(destino)}.</p>`;
      } catch (error) {
        console.error(error);
        mensaje.innerHTML = '<div class="mensaje-error-caja"><p class="mensaje-error">No pudimos enviar el e-mail. Probá de nuevo o descargá el PDF.</p></div>';
      }
      return;
    }

    // Sin EmailJS configurado: abrimos el cliente de correo y dejamos constancia
    registrar("mailto");
    window.location.href = `mailto:${encodeURIComponent(destino)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    mensaje.innerHTML = `<p class="mensaje-exito">Abrimos tu aplicación de correo con los tickets para ${esc(destino)}. Revisá y presioná enviar.</p>`;
  }

  dibujarTickets();
})();
