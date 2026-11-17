/* =========================================================
   app.js — Ficha de evento, listados dinámicos y encuesta
   Eventos del servidor: TS_API (fetch). Utilidades locales: TS.
   ========================================================= */

const esc = TS.esc;
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Disponibles de un tipo de entrada (API o local). */
function dispTipo(t) {
  if (t.disponibles != null) return Math.max(0, Number(t.disponibles));
  return TS.disponibles(t);
}

/** Stock total disponible de un evento (API lista o detalle). */
function stockEvento(ev) {
  if (ev.disponibles != null && (!ev.entradas || !ev.entradas.length)) {
    return Math.max(0, Number(ev.disponibles));
  }
  if (ev.entradas && ev.entradas.length) {
    return ev.entradas.reduce((s, t) => s + dispTipo(t), 0);
  }
  return TS.stockDisponibleEvento(ev);
}

/** Precio "desde" compatible con respuesta de API y store. */
function precioDesdeEv(ev) {
  if (ev.precio_desde != null) return Number(ev.precio_desde);
  return TS.precioDesde(ev);
}

/* ---------- Pieza reutilizable: tarjeta de evento ---------- */
function tarjetaEvento(ev) {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(ev.fecha || "");
  const fecha = m ? `<span class="tarjeta__fecha"><b>${Number(m[2])}</b><small>${MES_CORTO[Number(m[1]) - 1]}</small></span>` : "";
  const r = (typeof TS.resumenResenas === "function") ? TS.resumenResenas(ev.id) : { total: 0, promedio: 0 };
  const disp = stockEvento(ev);
  const aviso = disp === 0 ? '<span class="etiqueta etiqueta--agotado">Agotado</span>'
    : disp <= 30 ? `<span class="etiqueta etiqueta--poco">¡Últimas ${disp}!</span>` : "";
  const valoracion = r.total ? `<span class="tarjeta__valoracion" title="${r.promedio.toFixed(1)} / 5">★ ${r.promedio.toFixed(1)}</span>` : "";
  const busqueda = `${ev.titulo} ${ev.lugar || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const img = (typeof TS.urlSegura === "function" ? TS.urlSegura(ev.imagen || ev.imagen_url || "") : (ev.imagen || ev.imagen_url || ""));
  return `
    <a class="tarjeta" href="producto.html?id=${encodeURIComponent(ev.id)}" data-busqueda="${esc(busqueda)}">
      <div class="tarjeta__media">
        <img src="${esc(img)}" alt="${esc(ev.titulo)}" loading="lazy">
        ${fecha}
      </div>
      <div class="tarjeta__cuerpo">
        <h3>${esc(ev.titulo)}</h3>
        <p class="tarjeta__lugar">${esc(ev.lugar || "A confirmar")}</p>
        <div class="tarjeta__pie">
          <span class="tarjeta__precio">Desde <b>${TS.precio(precioDesdeEv(ev))}</b></span>
          ${aviso}${valoracion}
        </div>
      </div>
    </a>`;
}

/** Carga cartelera desde la API; si falla, usa store local como respaldo. */
async function cargarEventosDesdeServidor() {
  try {
    return await TS_API.getEventos();
  } catch (err) {
    console.warn("[TicketShow] API eventos no disponible, usando datos locales:", err.message);
    return TS.getEventos();
  }
}

/* =========================================================
   Ficha de evento dinámica (producto.html) — async/await
   ========================================================= */

const fichaEvento = document.querySelector("#ficha-evento");

if (fichaEvento) {
  (async () => {
    const idEvento = new URLSearchParams(window.location.search).get("id") || "";
    let evento = null;

    if (idEvento) {
      try {
        evento = await TS_API.getEvento(idEvento);
      } catch (err) {
        console.warn("[TicketShow] detalle API falló:", err.message);
        evento = TS.getEvento(idEvento);
      }
    }

    if (!evento) {
      fichaEvento.innerHTML = `
        <h2>Evento no encontrado</h2>
        <p>No encontramos ese show. Volvé a la <a href="index.html">cartelera</a>.</p>
      `;
      return;
    }

    document.title = `TicketShow - ${evento.titulo}`;
    document.querySelector("#evento-titulo").textContent = evento.titulo;
    const imagen = document.querySelector("#evento-imagen");
    imagen.src = (typeof TS.urlSegura === "function" ? TS.urlSegura(evento.imagen || evento.imagen_url || "") : (evento.imagen || evento.imagen_url || "")) || "";
    imagen.alt = evento.titulo || "";
    document.querySelector("#evento-fecha").textContent = TS.fechaLarga(evento.fecha);
    document.querySelector("#evento-lugar").textContent = evento.lugar || "A confirmar";
    document.querySelector("#evento-descripcion").textContent = evento.descripcion || "";
    document.querySelector("#evento-precio").textContent = TS.precio(precioDesdeEv(evento));

    document.querySelector("#evento-entradas").innerHTML = (evento.entradas || []).map((t, i) => {
      const disp = dispTipo(t);
      const estado = disp === 0
        ? '<span class="etiqueta etiqueta--agotado">Agotada</span>'
        : disp <= 20 ? `<span class="etiqueta etiqueta--poco">¡Últimas ${disp}!</span>`
        : `<span class="etiqueta etiqueta--ok">${disp} disponibles</span>`;
      const contenido = `
        <span class="tier__nombre">${esc(t.nombre)}</span>
        ${estado}
        <span class="tier__precio">${TS.precio(t.precio)}</span>
        <span class="flecha" aria-hidden="true">→</span>`;
      // Preferimos tipo_entrada_id de la API si existe
      const tipoParam = t.id != null ? `tipo_id=${encodeURIComponent(t.id)}` : `tipo=${i}`;
      return disp === 0
        ? `<li><span class="tier tier--agotado" aria-disabled="true">${contenido}</span></li>`
        : `<li><a class="tier" href="comprar.html?id=${encodeURIComponent(idEvento)}&${tipoParam}">${contenido}</a></li>`;
    }).join("");
  })();
}

/* =========================================================
   Listados dinámicos: portada (index), tabla y cajas
   ========================================================= */

(async () => {
  const eventos = await cargarEventosDesdeServidor();

  const gridEventos = document.querySelector("#grid-eventos");
  if (gridEventos) {
    gridEventos.innerHTML = eventos.map(tarjetaEvento).join("");

    const buscador = document.querySelector("#buscador");
    const sinResultados = document.querySelector("#sin-resultados");
    if (buscador) {
      buscador.addEventListener("input", () => {
        const q = buscador.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let visibles = 0;
        gridEventos.querySelectorAll(".tarjeta").forEach((t) => {
          const coincide = !q || t.dataset.busqueda.includes(q);
          t.hidden = !coincide;
          if (coincide) visibles++;
        });
        if (sinResultados) sinResultados.hidden = visibles > 0;
      });
    }
  }

  const listaProximos = document.querySelector("#lista-proximos");
  if (listaProximos) {
    const proximos = eventos.filter((ev) => ev.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);
    listaProximos.innerHTML = proximos.map((ev) => {
      const [, mes, dia] = ev.fecha.split("-");
      return `
      <li>
        <a class="proximo" href="producto.html?id=${encodeURIComponent(ev.id)}">
          <span class="proximo__fecha"><b>${Number(dia)}</b><small>${MES_CORTO[Number(mes) - 1]}</small></span>
          <span class="proximo__info">
            <strong>${esc(ev.titulo)}</strong>
            <small>${TS.fechaLarga(ev.fecha)} · ${esc(ev.lugar || "Lugar a confirmar")}</small>
          </span>
          <span class="flecha" aria-hidden="true">→</span>
        </a>
      </li>`;
    }).join("");
  }

  const cuerpoTabla = document.querySelector("#tabla-eventos-cuerpo");
  if (cuerpoTabla) {
    cuerpoTabla.innerHTML = eventos.map((ev) => `
      <tr>
        <td class="celda-evento">
          <img src="${esc(typeof TS.urlSegura === "function" ? TS.urlSegura(ev.imagen || ev.imagen_url || "") : (ev.imagen || ev.imagen_url || ""))}" alt="${esc(ev.titulo)}" loading="lazy">
          <a class="fila-enlace" href="producto.html?id=${encodeURIComponent(ev.id)}">${esc(ev.titulo)}</a>
        </td>
        <td>${TS.fechaCorta(ev.fecha)}</td>
        <td>${esc(ev.lugar || "A confirmar")}</td>
        <td class="celda-precio">${TS.precio(precioDesdeEv(ev))} <span class="flecha" aria-hidden="true">→</span></td>
      </tr>`).join("");
  }

  const contenedorCajas = document.querySelector("#contenedor-cajas");
  if (contenedorCajas) {
    contenedorCajas.innerHTML = eventos.map(tarjetaEvento).join("");
  }
})();

/* =========================================================
   Opción 14 — Encuesta de Satisfacción del Usuario
   (vive en encuesta.html)
   ========================================================= */

const formularioEncuesta = document.querySelector("#formulario-encuesta");
const textareaComentario = document.querySelector("#comentario");
const contadorCaracteres = document.querySelector("#contador-caracteres");
const resultadoEncuesta = document.querySelector("#resultado-encuesta");

const LIMITE_CARACTERES = 300;

// Palabras clave usadas para simular una clasificación de sentimiento
// (representa, de forma simplificada, lo que haría una RNA entrenada para PLN)
const PALABRAS_POSITIVAS = [
  "excelente", "genial", "increíble", "increible", "buena", "bueno",
  "rápido", "rapido", "fácil", "facil", "recomiendo", "satisfecho",
  "contento", "perfecto", "cómodo", "comodo", "amable",
  // inglés y portugués
  "excellent", "great", "amazing", "good", "fast", "easy", "recommend", "perfect", "friendly", "happy",
  "ótimo", "otimo", "bom", "rápido", "fácil", "recomendo", "perfeito", "feliz"
];

const PALABRAS_NEGATIVAS = [
  "malo", "mala", "lento", "difícil", "dificil", "pésimo", "pesimo",
  "horrible", "problema", "error", "insatisfecho", "tardó", "tardo",
  "demora", "queja", "reclamo",
  // inglés y portugués
  "bad", "slow", "difficult", "terrible", "problem", "awful", "complaint", "delay",
  "ruim", "lento", "péssimo", "pessimo", "difícil", "reclamação", "reclamacao", "atraso"
];

// Clasifica el comentario en Positivo / Negativo / Neutro contando coincidencias
function clasificarSentimiento(texto) {
  const textoNormalizado = texto.toLowerCase();
  let puntaje = 0;

  PALABRAS_POSITIVAS.forEach((palabra) => {
    if (textoNormalizado.includes(palabra)) puntaje += 1;
  });

  PALABRAS_NEGATIVAS.forEach((palabra) => {
    if (textoNormalizado.includes(palabra)) puntaje -= 1;
  });

  if (puntaje > 0) return "Positivo";
  if (puntaje < 0) return "Negativo";
  return "Neutro";
}

// Actualiza el contador de caracteres restantes del textarea
function actualizarContador() {
  const restantes = LIMITE_CARACTERES - textareaComentario.value.length;
  contadorCaracteres.textContent = `${restantes} caracteres restantes`;
  contadorCaracteres.classList.toggle("contador-caracteres--limite", restantes <= 20);
}

// Muestra un mensaje de error de validación en el DOM, sin enviar nada
function mostrarErrorValidacion(mensaje) {
  // OWASP A03: texto de error solo vía textContent (sin innerHTML)
  if (typeof TS.setMsg === "function") {
    TS.setMsg(resultadoEncuesta, mensaje, "error");
  } else {
    resultadoEncuesta.classList.remove("mensaje-exito");
    resultadoEncuesta.classList.add("mensaje-error-caja");
    resultadoEncuesta.replaceChildren();
    const p = document.createElement("p");
    p.className = "mensaje-error";
    p.textContent = String(mensaje ?? "");
    resultadoEncuesta.appendChild(p);
  }
}

// Valida los radio buttons obligatorios, clasifica el comentario y "envía" la encuesta
async function manejarEnvioEncuesta(evento) {
  evento.preventDefault();

  const satisfaccionElegida = formularioEncuesta.querySelector('input[name="satisfaccion"]:checked');
  const recomendacionElegida = formularioEncuesta.querySelector('input[name="recomendacion"]:checked');

  if (!satisfaccionElegida) {
    mostrarErrorValidacion("Por favor, elegí una opción de satisfacción antes de enviar.");
    return;
  }

  if (!recomendacionElegida) {
    mostrarErrorValidacion("Por favor, indicá si recomendarías TicketShow antes de enviar.");
    return;
  }

  const comentario = textareaComentario.value.trim();
  const sentimiento = comentario ? clasificarSentimiento(comentario) : "Sin comentario";

  try {
    const respuesta = await fetch("confirmacion-encuesta.json");

    if (!respuesta.ok) {
      throw new Error(`Error ${respuesta.status} al leer confirmacion-encuesta.json`);
    }

    const datos = await respuesta.json();

    resultadoEncuesta.classList.remove("mensaje-error-caja");
    resultadoEncuesta.classList.add("mensaje-exito");
    // OWASP A03: valores dinámicos escapados (o textContent en nodos)
    resultadoEncuesta.replaceChildren();
    const addP = (htmlOrText, asHtml = false) => {
      const p = document.createElement("p");
      if (asHtml) p.innerHTML = htmlOrText; // solo markup fijo + esc()
      else p.textContent = htmlOrText;
      resultadoEncuesta.appendChild(p);
    };
    addP(String(datos.mensaje || "Gracias por tu respuesta."));
    addP(`Satisfacción: <strong>${esc(satisfaccionElegida.value)}</strong>`, true);
    addP(`¿Recomendaría TicketShow?: <strong>${esc(recomendacionElegida.value)}</strong>`, true);
    addP(`Análisis de sentimiento del comentario (RNA simplificada): <strong>${esc(sentimiento)}</strong>`, true);

    formularioEncuesta.reset();
    actualizarContador();
    try { sessionStorage.removeItem("ts_encuesta_pendiente"); } catch (_) { /* sin sesión */ }
  } catch (error) {
    console.error(error);
    mostrarErrorValidacion("No pudimos enviar tu encuesta. Probá nuevamente más tarde.");
  }
}

// La encuesta solo se ofrece al finalizar una compra (ver compra.js / ticket.js)
let encuestaHabilitada = false;
try { encuestaHabilitada = !!sessionStorage.getItem("ts_encuesta_pendiente"); } catch (_) { /* sin sesión */ }

if (formularioEncuesta && !encuestaHabilitada) {
  formularioEncuesta.outerHTML = `
    <div class="mensaje-exito">
      <p>La encuesta de satisfacción se habilita al finalizar una compra.</p>
      <p><a href="comprar.html" class="enlace-flecha">Ir a comprar entradas <span aria-hidden="true">→</span></a></p>
    </div>`;
}

// Escuchadores desacoplados: solo se registran si estamos en encuesta.html
else if (formularioEncuesta && textareaComentario && contadorCaracteres && resultadoEncuesta) {
  actualizarContador();
  textareaComentario.addEventListener("input", actualizarContador);
  formularioEncuesta.addEventListener("submit", manejarEnvioEncuesta);
}
