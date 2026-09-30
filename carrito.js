// ===== Módulo de carrito de compras (localStorage) =====
// Se comparte entre todas las páginas del sitio.

const CARRITO_KEY = 'ticketshow_carrito';

function obtenerCarrito() {
  const data = localStorage.getItem(CARRITO_KEY);
  return data ? JSON.parse(data) : [];
}

function guardarCarrito(carrito) {
  localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
  actualizarContadorCarrito();
}

// Agrega un ticket al carrito. Si ya existe, suma la cantidad.
function agregarAlCarrito(id, nombre, precio, cantidad = 1) {
  const carrito = obtenerCarrito();
  const existente = carrito.find(item => item.id === id);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({ id, nombre, precio, cantidad });
  }

  guardarCarrito(carrito);
}

function quitarDelCarrito(id) {
  const carrito = obtenerCarrito().filter(item => item.id !== id);
  guardarCarrito(carrito);
}

function actualizarCantidadCarrito(id, cantidad) {
  const carrito = obtenerCarrito();
  const item = carrito.find(item => item.id === id);
  if (item) {
    item.cantidad = Math.max(1, parseInt(cantidad) || 1);
  }
  guardarCarrito(carrito);
}

function vaciarCarrito() {
  localStorage.removeItem(CARRITO_KEY);
  actualizarContadorCarrito();
}

function calcularTotalCarrito() {
  return obtenerCarrito().reduce((total, item) => total + item.precio * item.cantidad, 0);
}

function formatearPrecio(numero) {
  return numero.toLocaleString('es-AR');
}

// Actualiza el contador de unidades que se muestra junto al link "Carrito"
function actualizarContadorCarrito() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const cantidadTotal = obtenerCarrito().reduce((total, item) => total + item.cantidad, 0);
  badge.textContent = cantidadTotal > 0 ? cantidadTotal : '';
  badge.style.display = cantidadTotal > 0 ? 'inline-block' : 'none';
}

document.addEventListener('DOMContentLoaded', actualizarContadorCarrito);
