// ===== Lógica de la pantalla de checkout (comprar.html) =====
// Toma los ítems del carrito (carrito.js) y arma el resumen y la orden final.

const contenedorResumen = document.getElementById('resumen-checkout');
const formCompra = document.getElementById('form-compra');

// Pinta el resumen de la compra con los ítems que hay en el carrito
function pintarResumenCheckout() {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    contenedorResumen.innerHTML = `
      <p>Tu carrito está vacío. <a href="listado_box.html">Elegí un show</a> antes de continuar.</p>
    `;
    formCompra.style.display = 'none';
    return;
  }

  let filas = '';
  carrito.forEach(item => {
    filas += `
      <div class="detalle-orden fila">
        <span>${item.nombre} &times; ${item.cantidad}</span>
        <span>$${formatearPrecio(item.precio * item.cantidad)}</span>
      </div>
    `;
  });

  contenedorResumen.innerHTML = `
    <h3 style="margin-top:0;">Resumen de tu compra</h3>
    ${filas}
    <div class="detalle-orden fila total">
      <strong>Total</strong>
      <strong>$${formatearPrecio(calcularTotalCarrito())}</strong>
    </div>
  `;
}

// Genera un número de orden simple para la demo
function generarNumeroOrden() {
  return 'TS-' + Date.now().toString().slice(-8);
}

function manejarEnvioCompra(evento) {
  evento.preventDefault();

  const carrito = obtenerCarrito();
  if (carrito.length === 0) return;

  const orden = {
    numero: generarNumeroOrden(),
    fecha: new Date().toLocaleDateString('es-AR'),
    cliente: {
      nombre: document.getElementById('nombre').value,
      direccion: document.getElementById('direccion').value,
      telefono: document.getElementById('telefono').value,
      email: document.getElementById('email').value,
      pago: document.getElementById('pago').options[document.getElementById('pago').selectedIndex].text
    },
    items: carrito,
    total: calcularTotalCarrito()
  };

  // Historial de compras: cada orden queda asociada al usuario con sesión (pantalla "Mis entradas")
  const sesion = obtenerSesion();
  orden.usuario = sesion ? sesion.email : orden.cliente.email;
  const historial = JSON.parse(localStorage.getItem(ORDENES_KEY) || '[]');
  historial.push(orden);
  localStorage.setItem(ORDENES_KEY, JSON.stringify(historial));

  localStorage.setItem('ticketshow_ultima_orden', JSON.stringify(orden));
  vaciarCarrito();

  // La solapa "Encuesta" solo se habilita una vez finalizada la compra
  localStorage.setItem(ENCUESTA_HABILITADA_KEY, '1');

  window.location.href = 'encuesta.html';
}

document.addEventListener('DOMContentLoaded', () => {
  pintarResumenCheckout();
  formCompra.addEventListener('submit', manejarEnvioCompra);
});
