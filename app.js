// ===== app.js — interacción del sitio, desacoplada del HTML =====
// Requisito transversal: eventos con addEventListener (sin onclick/onsubmit en el
// HTML) y datos con fetch() + async/await sobre archivos .json locales.
// Nota: fetch() sobre archivos locales necesita servir el sitio por HTTP
// (GitHub Pages, Live Server, `python -m http.server`), no abrir con file://.

const SESION_KEY = 'ticketshow_sesion';
const USUARIOS_LOCALES_KEY = 'ticketshow_usuarios_locales';
const ORDENES_KEY = 'ticketshow_ordenes';

// ---------- Utilidades ----------
async function cargarJSON(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al cargar ${ruta}`);
  return respuesta.json();
}

function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `mensaje ${tipo}`;
  elemento.hidden = false;
}

// ---------- Opción 3: buscador y filtro en tiempo real ----------
let catalogo = [];

function filtrarCatalogo(termino) {
  const t = termino.trim().toLowerCase();
  return catalogo.filter(evento =>
    evento.nombre.toLowerCase().includes(t) || evento.lugar.toLowerCase().includes(t)
  );
}

function pintarResultados(lista, termino) {
  const info = document.getElementById('resultados-info');
  const contenedor = document.getElementById('resultados-contenido');

  info.textContent = termino.trim()
    ? `${lista.length} resultado(s) para "${termino.trim()}"`
    : 'Mostrando todos los shows disponibles';

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="sin-resultados">
        <p>No encontramos shows que coincidan con tu búsqueda.</p>
        <a href="listado_box.html" class="boton">Ver todos los shows</a>
      </div>`;
    return;
  }

  contenedor.innerHTML = lista.map(evento => `
    <div class="caja">
      <img src="${evento.imagen}" alt="${evento.nombre}">
      <h3>${evento.nombre}</h3>
      <p>Fecha: ${evento.fecha}</p>
      <p>Lugar: ${evento.lugar}</p>
      <p>Precio: $${evento.precio.toLocaleString('es-AR')}</p>
      <a href="producto.html" class="boton">Ver más</a>
    </div>`).join('');
}

async function iniciarBuscador() {
  const campo = document.getElementById('campo-busqueda');
  const contenedor = document.getElementById('resultados-contenido');
  if (!campo || !contenedor) return;

  try {
    catalogo = await cargarJSON('catalogo.json');
  } catch (error) {
    contenedor.innerHTML = '<p class="mensaje error">No se pudo cargar el catálogo. Probá de nuevo más tarde.</p>';
    return;
  }

  const actualizar = () => pintarResultados(filtrarCatalogo(campo.value), campo.value);

  campo.value = new URLSearchParams(window.location.search).get('q') || '';
  actualizar();

  campo.addEventListener('input', actualizar);
  campo.form.addEventListener('submit', evento => {
    evento.preventDefault();
    actualizar();
  });
}

// ---------- Opción 4: registro, login y vistas por sesión (VSDM) ----------
function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem(SESION_KEY));
  } catch (error) {
    return null;
  }
}

function obtenerUsuariosLocales() {
  try {
    return JSON.parse(localStorage.getItem(USUARIOS_LOCALES_KEY)) || [];
  } catch (error) {
    return [];
  }
}

// Vista de visitante vs. vista de usuario autenticado (barra superior)
function actualizarVistaSesion() {
  const enlace = document.getElementById('link-sesion');
  if (!enlace) return;
  const sesion = obtenerSesion();

  const enlaceEntradas = document.getElementById('link-mis-entradas');
  if (enlaceEntradas) enlaceEntradas.hidden = !sesion;

  if (sesion) {
    enlace.textContent = `HOLA, ${sesion.nombre.toUpperCase()} · SALIR`;
    enlace.href = '#';
    enlace.dataset.accion = 'salir';
  } else {
    enlace.textContent = 'INGRESAR / REGISTRARSE';
    enlace.href = 'login.html';
    delete enlace.dataset.accion;
  }
}

function iniciarSesionGlobal() {
  const enlace = document.getElementById('link-sesion');
  if (!enlace) return;
  actualizarVistaSesion();

  enlace.addEventListener('click', evento => {
    if (enlace.dataset.accion !== 'salir') return;
    evento.preventDefault();
    localStorage.removeItem(SESION_KEY);
    window.location.reload();
  });
}

// El checkout solo lo ve el usuario autenticado; el visitante recibe una invitación
function protegerCheckout() {
  const form = document.getElementById('form-compra');
  if (!form) return;
  const sesion = obtenerSesion();

  if (sesion) {
    form.email.value = sesion.email;
    return;
  }
  form.style.display = 'none';
  const aviso = document.createElement('p');
  aviso.className = 'mensaje info';
  aviso.innerHTML = 'Para finalizar la compra tenés que <a href="login.html">ingresar</a> o <a href="registro.html">crear una cuenta</a>.';
  form.before(aviso);
}

function iniciarLogin() {
  const form = document.getElementById('form-login');
  if (!form) return;
  const mensaje = document.getElementById('mensaje-login');

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    if (!email || !password) {
      mostrarMensaje(mensaje, 'Completá tu e-mail y tu contraseña.', 'error');
      return;
    }

    mostrarMensaje(mensaje, 'Verificando credenciales...', 'info');
    try {
      const usuarios = [...await cargarJSON('usuarios.json'), ...obtenerUsuariosLocales()];
      const usuario = usuarios.find(u => u.email === email && u.password === password);

      if (!usuario) {
        mostrarMensaje(mensaje, 'E-mail o contraseña incorrectos.', 'error');
        return;
      }
      localStorage.setItem(SESION_KEY, JSON.stringify({ email: usuario.email, nombre: usuario.nombre }));
      actualizarVistaSesion();
      mostrarMensaje(mensaje, `¡Bienvenido/a, ${usuario.nombre}! Te redirigimos al inicio...`, 'ok');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } catch (error) {
      mostrarMensaje(mensaje, 'No pudimos contactar al servidor. Intentá de nuevo más tarde.', 'error');
    }
  });
}

// ----- Validaciones del registro (una función por regla, fáciles de probar) -----
function telefonoValido(texto) {
  const t = texto.trim();
  if (!/^\+?[\d\s\-()]+$/.test(t)) return false;
  const digitos = t.replace(/\D/g, '').length;
  return digitos >= 8 && digitos <= 15;
}

function documentoValido(tipo, texto) {
  const doc = texto.trim().replace(/[.\s]/g, '');
  return tipo === 'dni' ? /^\d{7,8}$/.test(doc) : /^[A-Za-z0-9]{6,9}$/.test(doc);
}

// Fecha en formato DD/MM/AAAA: debe existir en el calendario y no ser futura
function fechaNacimientoValida(texto) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return false;
  const [, dia, mes, anio] = partes.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const existe = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe && anio >= 1900 && fecha <= new Date();
}

// Devuelve la lista de campos con error: [{ campo, mensaje }]
function validarRegistro(form) {
  const errores = [];
  const falla = (campo, mensaje) => errores.push({ campo, mensaje });
  const valor = nombre => form.elements[nombre].value;

  if (!valor('email').trim()) falla('email', 'Ingresá tu e-mail.');
  if (!valor('nombre').trim()) falla('nombre', 'Ingresá tu nombre.');
  if (valor('password').length < 8) {
    falla('password', 'La contraseña debe tener al menos 8 caracteres.');
  } else if (valor('password') !== valor('password2')) {
    falla('password2', 'Las contraseñas no coinciden.');
  }
  if (!valor('pais')) falla('pais', 'Seleccioná tu país de residencia.');
  if (!telefonoValido(valor('telefono'))) falla('telefono', 'Ingresá un teléfono válido (entre 8 y 15 dígitos).');
  if (!documentoValido(valor('tipo_doc'), valor('doc'))) {
    falla('doc', valor('tipo_doc') === 'dni'
      ? 'El DNI debe tener 7 u 8 dígitos.'
      : 'El pasaporte debe tener entre 6 y 9 letras o números.');
  }
  if (!fechaNacimientoValida(valor('nacimiento'))) falla('nacimiento', 'Ingresá una fecha de nacimiento válida (DD/MM/AAAA).');
  if (!valor('genero')) falla('genero', 'Seleccioná tu género.');
  return errores;
}

function iniciarRegistro() {
  const form = document.getElementById('form-registro');
  if (!form) return;
  const mensaje = document.getElementById('mensaje-registro');

  // Al corregir un campo se le quita el resaltado de error
  form.addEventListener('input', evento => evento.target.classList.remove('campo-error'));

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    form.querySelectorAll('.campo-error').forEach(campo => campo.classList.remove('campo-error'));

    const errores = validarRegistro(form);
    if (errores.length > 0) {
      errores.forEach(error => form.elements[error.campo].classList.add('campo-error'));
      form.elements[errores[0].campo].focus();
      const resto = errores.length > 1 ? ` (y ${errores.length - 1} campo(s) más para revisar)` : '';
      mostrarMensaje(mensaje, errores[0].mensaje + resto, 'error');
      return;
    }

    const email = form.elements.email.value.trim().toLowerCase();
    mostrarMensaje(mensaje, 'Creando tu cuenta...', 'info');
    try {
      const existentes = [...await cargarJSON('usuarios.json'), ...obtenerUsuariosLocales()];
      if (existentes.some(u => u.email === email)) {
        mostrarMensaje(mensaje, 'Ya existe una cuenta con ese e-mail.', 'error');
        return;
      }
      const el = form.elements;
      const locales = obtenerUsuariosLocales();
      locales.push({
        email,
        password: el.password.value,
        nombre: el.nombre.value.trim(),
        apellido: el.apellido.value.trim(),
        pais: el.pais.value,
        telefono: el.telefono.value.trim(),
        tipoDoc: el.tipo_doc.value,
        nroDoc: el.doc.value.trim(),
        fechaNac: el.nacimiento.value.trim(),
        genero: el.genero.value,
        newsletter: el.newsletter.checked,
      });
      localStorage.setItem(USUARIOS_LOCALES_KEY, JSON.stringify(locales));
      mostrarMensaje(mensaje, '¡Cuenta creada! Ahora podés ingresar.', 'ok');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (error) {
      mostrarMensaje(mensaje, 'No pudimos contactar al servidor. Intentá de nuevo más tarde.', 'error');
    }
  });
}

// ---------- Ficha de ticket y carrito (antes con onclick/onchange inline) ----------
function iniciarFicha() {
  const boton = document.getElementById('btn-agregar');
  if (!boton) return;

  boton.addEventListener('click', () => {
    const select = document.getElementById('tipo-entrada');
    const opcion = select.options[select.selectedIndex];
    const cantidad = parseInt(document.getElementById('cantidad-entradas').value) || 1;

    agregarAlCarrito(opcion.value, opcion.dataset.nombre, parseFloat(opcion.dataset.precio), cantidad);

    const mensaje = document.getElementById('mensaje-agregado');
    mensaje.style.display = 'block';
    setTimeout(() => { mensaje.style.display = 'none'; }, 2500);
  });
}

function iniciarCarrito() {
  const contenedor = document.getElementById('carrito-contenido');
  if (!contenedor) return;

  function renderizar() {
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
      contenedor.innerHTML = `
        <div class="carrito-vacio">
          <p>Todavía no agregaste ninguna entrada.</p>
          <a href="listado_box.html" class="boton">Ver shows disponibles</a>
        </div>`;
      return;
    }

    const filas = carrito.map(item => `
      <tr>
        <td>${item.nombre}</td>
        <td>$${formatearPrecio(item.precio)}</td>
        <td><input type="number" class="input-cantidad" min="1" value="${item.cantidad}" data-id="${item.id}"></td>
        <td>$${formatearPrecio(item.precio * item.cantidad)}</td>
        <td><span class="link-quitar" data-id="${item.id}">Quitar</span></td>
      </tr>`).join('');

    contenedor.innerHTML = `
      <table class="tabla-carrito">
        <tr><th>Entrada</th><th>Precio unitario</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
        ${filas}
      </table>
      <div class="resumen-carrito">
        <p class="total">Total: $${formatearPrecio(calcularTotalCarrito())}</p>
        <a href="comprar.html" class="boton">Finalizar compra</a>
      </div>`;
  }

  // Delegación de eventos: las filas se regeneran, el contenedor no
  contenedor.addEventListener('click', evento => {
    const quitar = evento.target.closest('.link-quitar');
    if (!quitar) return;
    quitarDelCarrito(quitar.dataset.id);
    renderizar();
  });

  contenedor.addEventListener('change', evento => {
    if (!evento.target.classList.contains('input-cantidad')) return;
    actualizarCantidadCarrito(evento.target.dataset.id, evento.target.value);
    renderizar();
  });

  renderizar();
}

// ---------- Mis entradas: historial de compras del usuario autenticado ----------
function obtenerOrdenesDe(email) {
  try {
    return (JSON.parse(localStorage.getItem(ORDENES_KEY)) || []).filter(orden => orden.usuario === email);
  } catch (error) {
    return [];
  }
}

function iniciarMisEntradas() {
  const contenedor = document.getElementById('mis-entradas-contenido');
  if (!contenedor) return;
  const info = document.getElementById('mis-entradas-info');
  const sesion = obtenerSesion();

  if (!sesion) {
    contenedor.innerHTML = `
      <div class="sin-resultados">
        <p>Ingresá a tu cuenta para ver tus entradas.</p>
        <a href="login.html" class="boton">Ingresar</a>
        <a href="registro.html" class="boton">Crear cuenta</a>
      </div>`;
    return;
  }

  const ordenes = obtenerOrdenesDe(sesion.email);
  if (ordenes.length === 0) {
    contenedor.innerHTML = `
      <div class="sin-resultados">
        <p>Todavía no compraste entradas.</p>
        <a href="listado_box.html" class="boton">Ver shows disponibles</a>
      </div>`;
    return;
  }

  info.textContent = `${ordenes.length} compra(s) realizada(s)`;
  // La compra más reciente primero
  contenedor.innerHTML = ordenes.slice().reverse().map(orden => `
    <div class="caja-orden">
      <h3>Orden <span class="numero-orden">${orden.numero}</span></h3>
      <p class="fecha-orden">Comprada el ${orden.fecha} · ${orden.cliente.pago}</p>
      <div class="detalle-orden">
        ${orden.items.map(item => `
          <div class="fila">
            <span>${item.nombre} &times; ${item.cantidad}</span>
            <span>$${formatearPrecio(item.precio * item.cantidad)}</span>
          </div>`).join('')}
        <div class="fila">
          <strong>Total</strong>
          <strong>$${formatearPrecio(orden.total)}</strong>
        </div>
      </div>
    </div>`).join('');
}

// ---------- Arranque ----------
iniciarSesionGlobal();
iniciarBuscador();
iniciarLogin();
iniciarRegistro();
protegerCheckout();
iniciarFicha();
iniciarCarrito();
iniciarMisEntradas();
