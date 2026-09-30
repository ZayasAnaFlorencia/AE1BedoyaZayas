/* =========================================================
   Ficha de evento dinámica (vive en producto.html)
   Lee ?id=... de la URL y muestra los datos de ese show.
   Para agregar/editar un show, solo hay que tocar este objeto.
   ========================================================= */

const EVENTOS = {
  bts: {
    titulo: "BTS World Tour ARIRANG",
    imagen: "https://cdn.getcrowder.com/images/b66dd286-ad48-4a83-bed7-eeae6da7b866-bts.jpeg",
    fecha: "21 de Octubre de 2026",
    lugar: "Estadio Único de La Plata, Buenos Aires",
    descripcion: "BTS, acrónimo de Bangtan Sonyeondan o “Beyond the Scene”, es una boyband surcoreana nominada al GRAMMY que ha conquistado a millones de fans en todo el mundo desde su debut en junio de 2013. Sus integrantes son RM, Jin, SUGA, j-hope, Jimin, V y Jung Kook.",
    entradas: ["Campo General - $45.000", "Platea Baja - $60.000", "Platea Alta - $50.000", "VIP + Meet & Greet - $120.000"],
    precioDesde: "$45.000"
  },
  olivia: {
    titulo: "Olivia Wald",
    imagen: "https://cdn.getcrowder.com/images/18214696-0d49-49c5-9f24-a4388031fe2e-image.png?w=480&format=webp",
    fecha: "25 de Octubre de 2026",
    lugar: "C Art Media, Buenos Aires",
    descripcion: "Olivia Wald presenta su show en vivo con un repertorio que recorre sus mayores éxitos y canciones nuevas.",
    entradas: ["Campo General - $80.000", "Platea - $95.000", "VIP - $130.000"],
    precioDesde: "$80.000"
  },
  maroon5: {
    titulo: "Maroon 5",
    imagen: "https://cdn.getcrowder.com/images/ea85912e-de3b-41cb-9209-da3d9a7c2034-maroon5-banneraa-640x640-1.jpg?w=480&format=webp",
    fecha: "8 de Noviembre de 2026",
    lugar: "Estadio Obras, Buenos Aires",
    descripcion: "La banda estadounidense liderada por Adam Levine llega a Buenos Aires con sus grandes hits del pop rock.",
    entradas: ["Campo General - $75.000", "Platea Baja - $95.000", "VIP - $140.000"],
    precioDesde: "$75.000"
  },
  calamaro: {
    titulo: "Andrés Calamaro",
    imagen: "https://cdn.getcrowder.com/images/957fb504-d4ae-4d2c-8269-620f49958fbf-image.jpeg?w=480&format=webp",
    fecha: "20 de Noviembre de 2026",
    lugar: "Palacio de los Deportes, Buenos Aires",
    descripcion: "Andrés Calamaro vuelve a los escenarios con un show que repasa las canciones más queridas de su carrera.",
    entradas: ["Campo General - $65.000", "Platea - $80.000", "VIP - $110.000"],
    precioDesde: "$65.000"
  },
  foofighters: {
    titulo: "Foo Fighters",
    imagen: "https://cdn.getcrowder.com/images/6450bfb0-e5a3-4527-b326-20aceb834f98-9cb0ea32-0e49-40ad-b09a-0962eae3a21d-foofighters-bannersaa-1920x720.jpg?w=960&format=webp",
    fecha: "A confirmar",
    lugar: "A confirmar",
    descripcion: "La banda de rock liderada por Dave Grohl llega con su gira en vivo.",
    entradas: ["Campo General - $70.000", "Platea - $90.000"],
    precioDesde: "$70.000"
  },
  // ⚠️ Completá estos shows con sus datos reales (nombre, fecha, lugar, etc.)
  show1: {
    titulo: "Show 1",
    imagen: "https://cdn.getcrowder.com/images/287e865e-4338-4e21-94e2-a45e6c84e122-017547dd-d457-4dd2-a684-080027698ae6-06d3e074-b3c8-4ac9-84c5-88b0bff0dfef.jpg?w=960&format=webp",
    fecha: "A confirmar", lugar: "A confirmar", descripcion: "Próximamente más información.",
    entradas: ["Entrada General - $50.000"], precioDesde: "$50.000"
  },
  show2: {
    titulo: "Show 2",
    imagen: "https://cdn.getcrowder.com/images/96b59e76-950c-4536-bb44-8e30b7c09426-image.png?w=640&format=webp",
    fecha: "A confirmar", lugar: "A confirmar", descripcion: "Próximamente más información.",
    entradas: ["Entrada General - $50.000"], precioDesde: "$50.000"
  },
  show3: {
    titulo: "Show 3",
    imagen: "https://cdn.getcrowder.com/images/94e7857f-33d2-4e86-8c6b-1c2ce07667b3-640x640.png?w=480&format=webp",
    fecha: "A confirmar", lugar: "A confirmar", descripcion: "Próximamente más información.",
    entradas: ["Entrada General - $50.000"], precioDesde: "$50.000"
  },
  show4: {
    titulo: "Show 4",
    imagen: "https://cdn.getcrowder.com/images/e723dbb5-22e6-4f53-b343-ee2383179488-pagweb-17-5.jpg?w=480&format=webp",
    fecha: "A confirmar", lugar: "A confirmar", descripcion: "Próximamente más información.",
    entradas: ["Entrada General - $50.000"], precioDesde: "$50.000"
  },
  show6: {
    titulo: "Show 6",
    imagen: "https://cdn.getcrowder.com/images/12491991-802b-4c4e-95b0-1dcb5f993be0-b94994fd-d6a7-478c-b4a4-b3f640878dda-whatsapp-image-2026-06-12-at-12.53.19.jpg?w=640&format=webp",
    fecha: "A confirmar", lugar: "A confirmar", descripcion: "Próximamente más información.",
    entradas: ["Entrada General - $50.000"], precioDesde: "$50.000"
  }
};

const fichaEvento = document.querySelector("#ficha-evento");

if (fichaEvento) {
  const idEvento = new URLSearchParams(window.location.search).get("id") || "bts";
  const evento = EVENTOS[idEvento];

  if (!evento) {
    fichaEvento.innerHTML = `
      <h2>Evento no encontrado</h2>
      <p>No encontramos ese show. Volvé a la <a href="index.html">cartelera</a>.</p>
    `;
  } else {
    document.title = `TicketShow - ${evento.titulo}`;
    document.querySelector("#evento-titulo").textContent = evento.titulo;
    const imagen = document.querySelector("#evento-imagen");
    imagen.src = evento.imagen;
    imagen.alt = evento.titulo;
    document.querySelector("#evento-fecha").textContent = evento.fecha;
    document.querySelector("#evento-lugar").textContent = evento.lugar;
    document.querySelector("#evento-descripcion").textContent = evento.descripcion;
    document.querySelector("#evento-precio").textContent = evento.precioDesde;
    document.querySelector("#evento-entradas").innerHTML =
      evento.entradas.map((entrada) => `<li>${entrada}</li>`).join("");
    // Pasamos el id a la pantalla de compra para preseleccionar el show
    document.querySelector("#evento-comprar").href = `comprar.html?id=${idEvento}`;
  }
}

/* =========================================================
   Preselecciona el show en comprar.html según ?id=...
   ========================================================= */

const selectTickets = document.querySelector("#tickets");
if (selectTickets) {
  const idPreseleccionado = new URLSearchParams(window.location.search).get("id");
  if (idPreseleccionado && [...selectTickets.options].some((o) => o.value === idPreseleccionado)) {
    selectTickets.value = idPreseleccionado;
  }
}

/* =========================================================
   Al finalizar la compra, se muestra la Encuesta de Satisfacción
   (vive en comprar.html)
   ========================================================= */

const formularioCompra = document.querySelector("#formulario-compra");
const confirmacionCompra = document.querySelector("#confirmacion-compra");

if (formularioCompra && confirmacionCompra) {
  formularioCompra.addEventListener("submit", (evento) => {
    evento.preventDefault();
    confirmacionCompra.innerHTML = `
      <p class="mensaje-exito">
        ¡Compra confirmada! Te estamos llevando a la encuesta de satisfacción...
      </p>
    `;
    setTimeout(() => {
      window.location.href = "encuesta.html";
    }, 1800);
  });
}

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
  "contento", "perfecto", "cómodo", "comodo", "amable"
];

const PALABRAS_NEGATIVAS = [
  "malo", "mala", "lento", "difícil", "dificil", "pésimo", "pesimo",
  "horrible", "problema", "error", "insatisfecho", "tardó", "tardo",
  "demora", "queja", "reclamo"
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
  resultadoEncuesta.classList.remove("mensaje-exito");
  resultadoEncuesta.classList.add("mensaje-error-caja");
  resultadoEncuesta.innerHTML = `<p class="mensaje-error">${mensaje}</p>`;
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
    resultadoEncuesta.innerHTML = `
      <p>${datos.mensaje}</p>
      <p>Satisfacción: <strong>${satisfaccionElegida.value}</strong></p>
      <p>¿Recomendaría TicketShow?: <strong>${recomendacionElegida.value}</strong></p>
      <p>Análisis de sentimiento del comentario (RNA simplificada): <strong>${sentimiento}</strong></p>
    `;

    formularioEncuesta.reset();
    actualizarContador();
  } catch (error) {
    console.error(error);
    mostrarErrorValidacion("No pudimos enviar tu encuesta. Probá nuevamente más tarde.");
  }
}

// Escuchadores desacoplados: solo se registran si estamos en encuesta.html
if (formularioEncuesta && textareaComentario && contadorCaracteres && resultadoEncuesta) {
  actualizarContador();
  textareaComentario.addEventListener("input", actualizarContador);
  formularioEncuesta.addEventListener("submit", manejarEnvioEncuesta);
}
