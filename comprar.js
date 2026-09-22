// Referencias a los elementos del DOM
const selectTickets = document.getElementById('tickets');
const inputCantidad = document.getElementById('cantidad');
const spanSubtotal = document.getElementById('subtotal');
const inputCupon = document.getElementById('cupon');
const divMensaje = document.getElementById('mensaje');

// Estado del descuento (0 = sin descuento, 0.10 = 10%)
let descuentoAplicado = 0;

// Función que calcula y muestra el subtotal
function actualizarSubtotal() {
  // Tomamos la opción seleccionada del <select>
  const opcionSeleccionada = selectTickets.options[selectTickets.selectedIndex];

  // Leemos el precio desde el atributo data-precio
  const precioUnitario = parseFloat(opcionSeleccionada.dataset.precio);

  // Leemos la cantidad ingresada; si está vacía o es inválida, usamos 0
  const cantidad = parseInt(inputCantidad.value) || 0;

  // Calculamos el subtotal en memoria
  let subtotal = precioUnitario * cantidad;

  // Aplicamos el descuento del cupón, si corresponde
  if (descuentoAplicado > 0) {
    subtotal = subtotal - (subtotal * descuentoAplicado);
  }

  // Formateamos con separador de miles (formato es-AR) e inyectamos en el span
  spanSubtotal.textContent = subtotal.toLocaleString('es-AR');
}

// Función que valida el cupón ingresado
function validarCupon() {
  // Capturamos el texto ingresado y lo limpiamos
  const codigo = inputCupon.value.trim().toUpperCase();

  // Quitamos clases previas antes de evaluar el nuevo caso
  divMensaje.classList.remove('mensaje-error', 'mensaje-exito');

  if (codigo === '') {
    divMensaje.textContent = 'Por favor, ingrese un código';
    divMensaje.classList.add('mensaje-error');
    descuentoAplicado = 0;
  } else if (codigo === 'UCP10') {
    divMensaje.textContent = '¡Cupón aplicado! Tenés un 10% de descuento';
    divMensaje.classList.add('mensaje-exito');
    descuentoAplicado = 0.10;
  } else {
    divMensaje.textContent = 'Código inválido o vencido';
    divMensaje.classList.add('mensaje-error');
    descuentoAplicado = 0;
  }

  // Recalculamos el subtotal con (o sin) el descuento aplicado
  actualizarSubtotal();
}

// Se recalcula en tiempo real cada vez que cambia la cantidad
inputCantidad.addEventListener('input', actualizarSubtotal);

// Se recalcula también si el usuario cambia el ticket elegido
selectTickets.addEventListener('change', function () {
  // Si cambia el ticket, se pierde el descuento aplicado
  descuentoAplicado = 0;
  divMensaje.textContent = '';
  divMensaje.classList.remove('mensaje-error', 'mensaje-exito');
  actualizarSubtotal();
});

// Calculamos el subtotal apenas carga la página (con los valores por defecto)
document.addEventListener('DOMContentLoaded', actualizarSubtotal);
