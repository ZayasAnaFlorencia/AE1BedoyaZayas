// Referencias a los elementos del DOM
const selectTickets = document.getElementById('tickets');
const inputCantidad = document.getElementById('cantidad');
const spanSubtotal = document.getElementById('subtotal');

// Función que calcula y muestra el subtotal
function actualizarSubtotal() {
  // Tomamos la opción seleccionada del <select>
  const opcionSeleccionada = selectTickets.options[selectTickets.selectedIndex];

  // Leemos el precio desde el atributo data-precio
  const precioUnitario = parseFloat(opcionSeleccionada.dataset.precio);

  // Leemos la cantidad ingresada; si está vacía o es inválida, usamos 0
  const cantidad = parseInt(inputCantidad.value) || 0;

  // Calculamos el subtotal en memoria
  const subtotal = precioUnitario * cantidad;

  // Formateamos con separador de miles (formato es-AR) e inyectamos en el span
  spanSubtotal.textContent = subtotal.toLocaleString('es-AR');
}

// Se recalcula en tiempo real cada vez que cambia la cantidad
inputCantidad.addEventListener('input', actualizarSubtotal);

// Se recalcula también si el usuario cambia el ticket elegido
selectTickets.addEventListener('change', actualizarSubtotal);

// Calculamos el subtotal apenas carga la página (con los valores por defecto)
document.addEventListener('DOMContentLoaded', actualizarSubtotal);

<script>
  function validarCupon() {
    const input = document.getElementById('cupon');
    const mensaje = document.getElementById('mensaje');

    const codigo = input.value.trim().toUpperCase();

    mensaje.classList.remove('mensaje-error', 'mensaje-exito');

    if (codigo === '') {
      mensaje.textContent = 'Por favor, ingrese un código';
      mensaje.classList.add('mensaje-error');
    } else if (codigo === 'UCP10') {
      mensaje.textContent = '¡Cupón aplicado! Tenés un 10% de descuento';
      mensaje.classList.add('mensaje-exito');
    } else {
      mensaje.textContent = 'Código inválido o vencido';
      mensaje.classList.add('mensaje-error');
    }
  }
</script>
