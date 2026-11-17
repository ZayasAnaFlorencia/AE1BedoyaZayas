/* =========================================================
   extras.js — Ficha del show (producto.html)
   1) Compartir en redes sociales
   2) Integración con API de artistas (iTunes Search API)
   3) Reseñas y valoraciones
   ========================================================= */

(() => {
  const bloque = document.querySelector("#extras-evento");
  if (!bloque) return;

  const { esc } = TS;
  const idEvento = new URLSearchParams(window.location.search).get("id") || "bts";
  const evento = TS.getEvento(idEvento);
  if (!evento) return; // app.js ya mostró "Evento no encontrado"
  bloque.hidden = false;

  /* ---------- 1) Compartir ---------- */
  (function compartir() {
    const url = window.location.href.split("#")[0];
    const texto = T(`¡Mirá este show en TicketShow! ${evento.titulo} — ${TS.fechaLarga(evento.fecha)}`);
    const u = encodeURIComponent(url), t = encodeURIComponent(texto);
    const enlaces = [
      { nombre: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(texto + " " + url)}` },
      { nombre: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
      { nombre: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
      { nombre: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` }
    ];
    const lista = document.querySelector("#compartir-lista");
    lista.innerHTML = enlaces.map((e) =>
      `<a class="enlace-accion" href="${e.href}" target="_blank" rel="noopener noreferrer">${e.nombre}</a>`).join("") +
      '<button type="button" class="enlace-accion" id="btn-copiar">Copiar enlace</button>' +
      (navigator.share ? '<button type="button" class="enlace-accion" id="btn-nativo">Compartir…</button>' : "") +
      (evento.instagram ? `<a class="enlace-accion" href="${esc(evento.instagram)}" target="_blank" rel="noopener noreferrer">Instagram del artista</a>` : "");

    lista.querySelector("#btn-copiar").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(url);
        e.target.textContent = "¡Enlace copiado!";
      } catch (_) {
        window.prompt(T("Copiá el enlace:"), url);
      }
    });
    const nativo = lista.querySelector("#btn-nativo");
    if (nativo) nativo.addEventListener("click", () => navigator.share({ title: evento.titulo, text: texto, url }).catch(() => {}));
  })();

  /* ---------- 2) API de artistas (iTunes Search API) ---------- */
  (async function artista() {
    if (!TS_CONFIG.artistasApi || !evento.artista) return;
    const seccion = document.querySelector("#seccion-artista");
    const cont = document.querySelector("#artista-contenido");
    seccion.hidden = false;
    cont.innerHTML = '<p class="ayuda-campo">Buscando canciones de ' + esc(evento.artista) + "…</p>";

    const clave = "ts_artista_" + evento.artista.toLowerCase();
    let canciones = null;
    try { canciones = JSON.parse(sessionStorage.getItem(clave)); } catch (_) { /* sin caché */ }

    if (!canciones) {
      try {
        const ctrl = new AbortController();
        const temporizador = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(evento.artista)}&entity=song&media=music&limit=25`,
          { signal: ctrl.signal });
        clearTimeout(temporizador);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const datos = await r.json();
        const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const buscado = normal(evento.artista);
        // Nos quedamos solo con canciones realmente del artista y sin repetidos
        const vistas = new Set();
        canciones = (datos.results || []).filter((c) => {
          if (!c.previewUrl || !normal(c.artistName).includes(buscado)) return false;
          const k = normal(c.trackName);
          if (vistas.has(k)) return false;
          vistas.add(k); return true;
        }).slice(0, 5).map((c) => ({
          nombre: c.trackName, album: c.collectionName, artista: c.artistName,
          portada: (c.artworkUrl100 || "").replace(/^http:/, "https:"),
          preview: String(c.previewUrl).replace(/^http:/, "https:"),
          enlace: c.trackViewUrl
        }));
        try { sessionStorage.setItem(clave, JSON.stringify(canciones)); } catch (_) { /* sin caché */ }
      } catch (err) {
        console.warn("API de artistas no disponible:", err);
        cont.innerHTML = '<p class="ayuda-campo">No pudimos cargar la información del artista en este momento.</p>';
        return;
      }
    }

    if (!canciones.length) {
      cont.innerHTML = `<p class="ayuda-campo">No encontramos canciones de "${esc(evento.artista)}" en el servicio de música.</p>`;
      return;
    }
    cont.innerHTML = `
      <p class="ayuda-campo">Escuchá un adelanto de ${esc(evento.artista)} (vista previa de 30 segundos vía iTunes Search API):</p>
      <ul class="lista-canciones">${canciones.map((c) => `
        <li>
          ${c.portada ? `<img src="${esc(c.portada)}" alt="Portada de ${esc(c.album)}" width="56" height="56" loading="lazy">` : ""}
          <div class="cancion-info">
            <strong>${esc(c.nombre)}</strong>
            <small>${esc(c.album)}</small>
            <audio controls preload="none" src="${esc(c.preview)}"></audio>
          </div>
          <a href="${esc(c.enlace)}" target="_blank" rel="noopener noreferrer" class="enlace-accion">Apple Music ↗</a>
        </li>`).join("")}
      </ul>`;
  })();

  /* ---------- 3) Reseñas ---------- */
  (function resenas() {
    const resumen = document.querySelector("#resenas-resumen");
    const lista = document.querySelector("#resenas-lista");
    const form = document.querySelector("#form-resena");
    const mensaje = document.querySelector("#resena-mensaje");
    const grupo = document.querySelector("#estrellas-input");
    let puntaje = 0;

    function pintarEstrellas(hasta) {
      grupo.querySelectorAll("button").forEach((b) => {
        const v = Number(b.dataset.valor);
        b.classList.toggle("estrella--activa", v <= hasta);
        b.setAttribute("aria-checked", String(v === puntaje));
      });
    }
    grupo.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-valor]");
      if (!b) return;
      puntaje = Number(b.dataset.valor);
      pintarEstrellas(puntaje);
    });
    grupo.addEventListener("mouseover", (e) => {
      const b = e.target.closest("button[data-valor]");
      if (b) pintarEstrellas(Number(b.dataset.valor));
    });
    grupo.addEventListener("mouseleave", () => pintarEstrellas(puntaje));

    function dibujar() {
      const todas = TS.getResenas(evento.id);
      const r = TS.resumenResenas(evento.id);
      if (!r.total) {
        resumen.innerHTML = '<p class="ayuda-campo">Todavía no hay reseñas de este show. ¡Sé el primero en opinar!</p>';
        lista.innerHTML = "";
        return;
      }
      const filas = [5, 4, 3, 2, 1].map((n) => {
        const cant = todas.filter((x) => x.puntaje === n).length;
        const pct = Math.round((cant / r.total) * 100);
        return `<div class="barra-fila"><span class="barra-nombre">${n} ★</span>
          <div class="barra"><div class="barra-relleno" style="width:${pct}%"></div></div>
          <span class="barra-valor">${cant}</span></div>`;
      }).join("");
      resumen.innerHTML = `
        <div class="resumen-resenas">
          <div class="promedio-grande"><strong>${r.promedio.toFixed(1)}</strong>
            <span class="estrellas-fijas" aria-label="${r.promedio.toFixed(1)} de 5">${TS.estrellas(r.promedio)}</span>
            <small>${r.total} reseña${r.total === 1 ? "" : "s"}</small></div>
          <div class="barras">${filas}</div>
        </div>`;
      lista.innerHTML = todas.map((x) => `
        <article class="resena">
          <header>
            <strong>${esc(x.nombre)}</strong>
            ${x.verificada ? '<span class="etiqueta etiqueta--ok">Compra verificada</span>' : ""}
            <span class="estrellas-fijas" aria-label="${x.puntaje} de 5">${TS.estrellas(x.puntaje)}</span>
            <small>${esc(TS.fechaHora(x.fecha))}</small>
          </header>
          ${x.comentario ? `<p>${esc(x.comentario)}</p>` : ""}
        </article>`).join("");
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        TS.agregarResena({
          eventoId: evento.id,
          nombre: document.querySelector("#resena-nombre").value,
          email: document.querySelector("#resena-email").value,
          puntaje,
          comentario: document.querySelector("#resena-comentario").value
        });
        form.reset();
        puntaje = 0; pintarEstrellas(0);
        if (typeof TS.setMsg === "function") TS.setMsg(mensaje, "¡Gracias! Tu reseña fue publicada.", "exito");
        else mensaje.innerHTML = '<p class="mensaje-exito">¡Gracias! Tu reseña fue publicada.</p>';
        dibujar();
      } catch (err) {
        if (typeof TS.setMsg === "function") TS.setMsg(mensaje, err.message, "error");
        else mensaje.innerHTML = `<div class="mensaje-error-caja"><p class="mensaje-error">${esc(err.message)}</p></div>`;
      }
    });

    dibujar();
  })();

  // Si venimos desde el ticket con #seccion-resenas, bajamos hasta ahí
  if (window.location.hash === "#seccion-resenas") {
    document.querySelector("#seccion-resenas").scrollIntoView();
  }
})();
