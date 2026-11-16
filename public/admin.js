/* =========================================================
   admin.js — Panel de administración de eventos y stock
   Pestañas: Resumen · Eventos · Stock · Ventas · Reseñas ·
             Validar ticket · E-mails
   CRUD de eventos vía API (admin_eventos.php) cuando hay sesión
   con rol admin; fallback a store.js / localStorage en demo local.
   ========================================================= */

(() => {
  const panel = document.querySelector("#admin-panel");
  if (!panel) return;

  const { esc, precio } = TS;
  const vista = document.querySelector("#admin-vista");
  const pantallaLogin = document.querySelector("#admin-login");
  const formLogin = document.querySelector("#form-admin-login");
  const mensajeLogin = document.querySelector("#admin-login-mensaje");
  const tabs = document.querySelectorAll("[data-tab]");

  let tabActual = "resumen";
  let eventoEnEdicion = null; // objeto del evento que se está editando (o uno nuevo)
  let esNuevo = false;
  let avisoGlobal = "";
  /** true cuando el admin entró con sesión PHP (rol admin) y usamos la API */
  let modoApi = false;
  /** Caché de eventos del servidor (admin) */
  let cacheEventos = [];

  /* ---------- Acceso ---------- */
  const estaLogueado = () => { try { return sessionStorage.getItem("ts_admin") === "1"; } catch (_) { return false; } };

  function mostrarSegunSesion() {
    const ok = estaLogueado();
    pantallaLogin.hidden = ok;
    panel.hidden = !ok;
    if (ok) {
      try {
        modoApi = sessionStorage.getItem("ts_admin") === "api";
      } catch (_) { modoApi = false; }
      if (modoApi) {
        refrescarEventosApi().then(() => render());
      } else {
        render();
      }
    }
  }

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = document.querySelector("#admin-usuario").value.trim().toLowerCase();
    const clave = document.querySelector("#admin-clave").value;
    mensajeLogin.innerHTML = '<p class="ayuda-campo">Verificando…</p>';

    // 1) Intento login real contra la API (usuario con rol admin en BD)
    if (typeof TS_API !== "undefined") {
      try {
        const u = await TS_API.login(usuario, clave);
        if (u && u.rol === "admin") {
          modoApi = true;
          try { sessionStorage.setItem("ts_admin", "api"); } catch (_) { /* */ }
          mensajeLogin.innerHTML = "";
          await refrescarEventosApi();
          mostrarSegunSesion();
          return;
        }
        // Sesión de usuario normal: no es admin
        try { await TS_API.logout(); } catch (_) { /* */ }
        mensajeLogin.innerHTML = '<div class="mensaje-error-caja"><p class="mensaje-error">Tu cuenta no tiene rol de administrador.</p></div>';
        return;
      } catch (err) {
        // Si la API no responde o credenciales fallan, seguimos al demo local
        if (err.status && err.status !== 401) {
          console.warn("[admin] API login:", err.message);
        }
      }
    }

    // 2) Fallback demo local (config.js)
    if (usuario === TS_CONFIG.adminUsuario.toLowerCase() && clave === TS_CONFIG.adminClave) {
      modoApi = false;
      try { sessionStorage.setItem("ts_admin", "1"); } catch (_) { /* sin sesión */ }
      mensajeLogin.innerHTML = "";
      mostrarSegunSesion();
    } else {
      mensajeLogin.innerHTML = '<div class="mensaje-error-caja"><p class="mensaje-error">Usuario o contraseña incorrectos.</p></div>';
    }
  });

  document.querySelector("#admin-salir").addEventListener("click", async () => {
    try { sessionStorage.removeItem("ts_admin"); } catch (_) { /* nada */ }
    if (modoApi && typeof TS_API !== "undefined") {
      try { await TS_API.logout(); } catch (_) { /* */ }
    }
    modoApi = false;
    cacheEventos = [];
    mostrarSegunSesion();
  });

  tabs.forEach((b) => b.addEventListener("click", () => {
    tabActual = b.dataset.tab;
    eventoEnEdicion = null;
    avisoGlobal = "";
    (async () => {
      if (modoApi && (tabActual === "stock" || tabActual === "eventos")) {
        await refrescarEventosApi();
        // Para stock necesitamos entradas con ids
        if (tabActual === "stock") {
          const detallados = [];
          for (const ev of cacheEventos) {
            try {
              const full = await TS_API.adminGetEvento(ev.id);
              detallados.push(full);
            } catch (_) {
              detallados.push(ev);
            }
          }
          cacheEventos = detallados;
        }
      }
      render();
    })();
  }));

  /* ---------- Avisos ---------- */
  const ok = (m) => `<p class="mensaje-exito">${esc(m)}</p>`;
  const error = (m) => `<div class="mensaje-error-caja"><p class="mensaje-error">${esc(m)}</p></div>`;

  async function refrescarEventosApi() {
    if (!modoApi || typeof TS_API === "undefined") return;
    try {
      cacheEventos = await TS_API.adminListarEventos();
    } catch (err) {
      console.warn("[admin] listar eventos:", err.message);
      avisoGlobal = error(err.message || "No se pudieron cargar los eventos del servidor.");
    }
  }

  /** Fuente unificada de eventos para las vistas */
  function listaEventos() {
    if (modoApi) {
      return cacheEventos.map((ev) => ({
        id: ev.id,
        titulo: ev.titulo,
        fecha: ev.fecha || "",
        lugar: ev.lugar || "",
        imagen: ev.imagen_url || ev.imagen || "",
        imagen_url: ev.imagen_url || "",
        artista: ev.artista || "",
        descripcion: ev.descripcion || "",
        instagram: ev.instagram || "",
        activo: ev.activo !== false,
        entradas: (ev.entradas || []).map((t) => ({
          id: t.id,
          nombre: t.nombre,
          precio: Number(t.precio),
          stock: Number(t.stock != null ? t.stock : (t.disponibles || 0)),
          vendidas: Number(t.vendidas || 0),
          disponibles: t.disponibles != null ? Number(t.disponibles) : Math.max(0, Number(t.stock || 0) - Number(t.vendidas || 0))
        })),
        tipos: ev.tipos,
        disponibles: ev.disponibles
      }));
    }
    return TS.getEventos();
  }

  function stockDisponibleEv(ev) {
    if (ev.disponibles != null && (!ev.entradas || !ev.entradas.length)) return Number(ev.disponibles);
    if (ev.entradas && ev.entradas.length) {
      return ev.entradas.reduce((s, t) => s + Math.max(0, (t.disponibles != null ? t.disponibles : (t.stock || 0) - (t.vendidas || 0))), 0);
    }
    return TS.stockDisponibleEvento(ev);
  }


  /* ---------- Render principal ---------- */
  function render() {
    tabs.forEach((b) => {
      const activa = b.dataset.tab === tabActual;
      b.classList.toggle("tab--activa", activa);
      b.setAttribute("aria-selected", String(activa));
    });
    const vistas = {
      resumen: vistaResumen, eventos: vistaEventos, stock: vistaStock,
      ventas: vistaVentas, resenas: vistaResenas, validar: vistaValidar, correos: vistaCorreos
    };
    vista.innerHTML = (avisoGlobal || "") + vistas[tabActual]();
    if (tabActual === "eventos" && eventoEnEdicion) activarFormularioEvento();
  }

  /* ---------- Resumen ---------- */
  function vistaResumen() {
    const eventos = listaEventos();
    const ordenes = TS.getOrdenes();
    const ingresos = ordenes.reduce((s, o) => s + o.total, 0);
    const vendidas = eventos.reduce((s, ev) => s + ev.entradas.reduce((a, t) => a + (t.vendidas || 0), 0), 0);
    const capacidad = eventos.reduce((s, ev) => s + ev.entradas.reduce((a, t) => a + t.stock, 0), 0);
    const resenas = TS.getResenas();
    const promedio = resenas.length ? resenas.reduce((s, r) => s + r.puntaje, 0) / resenas.length : 0;

    const barras = eventos.map((ev) => {
      const cap = ev.entradas.reduce((a, t) => a + t.stock, 0);
      const ven = ev.entradas.reduce((a, t) => a + (t.vendidas || 0), 0);
      const pct = cap ? Math.round((ven / cap) * 100) : 0;
      return `<div class="barra-fila"><span class="barra-nombre">${esc(ev.titulo)}</span>
        <div class="barra"><div class="barra-relleno" style="width:${pct}%"></div></div>
        <span class="barra-valor">${ven}/${cap} (${pct}%)</span></div>`;
    }).join("");

    return `
      <div class="tarjetas-resumen">
        <div class="tarjeta-dato"><span>Ingresos</span><strong>${precio(ingresos)}</strong></div>
        <div class="tarjeta-dato"><span>Órdenes</span><strong>${ordenes.length}</strong></div>
        <div class="tarjeta-dato"><span>Entradas vendidas</span><strong>${vendidas}</strong></div>
        <div class="tarjeta-dato"><span>Entradas disponibles</span><strong>${capacidad - vendidas}</strong></div>
        <div class="tarjeta-dato"><span>Shows</span><strong>${eventos.length}</strong></div>
        <div class="tarjeta-dato"><span>Valoración media</span><strong>${resenas.length ? promedio.toFixed(1) + " ★" : "—"}</strong></div>
      </div>
      <h3>Ocupación por show</h3>
      <div class="barras">${barras || "<p>No hay shows cargados.</p>"}</div>
      <p class="ayuda-campo">Los datos se guardan en este navegador (localStorage). Para uso real haría falta un servidor y una base de datos.</p>
      <button type="button" class="boton boton--peligro" data-accion="restablecer">Restablecer datos de demostración</button>`;
  }

  /* ---------- Eventos ---------- */
  function vistaEventos() {
    if (eventoEnEdicion) return formularioEvento();
    const eventos = listaEventos();
    const filas = eventos.map((ev) => `
      <tr>
        <td class="alinear-izq"><img src="${esc(typeof TS.urlSegura === "function" ? TS.urlSegura(ev.imagen || ev.imagen_url || "") : (ev.imagen || ev.imagen_url || ""))}" alt="" class="mini-img"> ${esc(ev.titulo)}${ev.activo === false ? ' <span class="etiqueta etiqueta--agotado">Baja</span>' : ""}</td>
        <td>${TS.fechaCorta(ev.fecha)}</td>
        <td class="alinear-izq">${esc(ev.lugar || "A confirmar")}</td>
        <td>${(ev.entradas && ev.entradas.length) || ev.tipos || 0}</td>
        <td>${stockDisponibleEv(ev)}</td>
        <td class="celda-acciones">
          <a class="boton boton-chico" href="producto.html?id=${encodeURIComponent(ev.id)}">Ver</a>
          <button type="button" class="boton boton-chico" data-accion="editar" data-id="${esc(String(ev.id))}">Editar</button>
          <button type="button" class="boton boton-chico boton--peligro" data-accion="eliminar" data-id="${esc(String(ev.id))}">Eliminar</button>
        </td>
      </tr>`).join("");

    return `
      <div class="barra-herramientas">
        <h3>Eventos (${eventos.length})${modoApi ? ' <small>· API</small>' : ' <small>· local</small>'}</h3>
        <button type="button" class="boton" data-accion="nuevo">+ Nuevo evento</button>
      </div>
      <div class="tabla-scroll"><table class="tabla-admin">
        <thead><tr><th>Show</th><th>Fecha</th><th>Lugar</th><th>Tipos</th><th>Disponibles</th><th>Acciones</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="6">Sin eventos</td></tr>'}</tbody>
      </table></div>`;
  }

  function filaEntrada(t = { nombre: "", precio: "", stock: "", vendidas: 0, id: null }) {
    return `
      <div class="fila-entrada" data-vendidas="${Number(t.vendidas) || 0}" data-id="${t.id != null ? esc(String(t.id)) : ""}">
        <input type="text" class="ent-nombre" placeholder="Nombre (ej: Platea)" value="${esc(t.nombre)}" aria-label="Nombre de la entrada">
        <input type="number" class="ent-precio" min="0" step="1" placeholder="Precio $" value="${esc(t.precio)}" aria-label="Precio">
        <input type="number" class="ent-stock" min="0" step="1" placeholder="Stock total" value="${esc(t.stock)}" aria-label="Stock total">
        <span class="ent-vendidas" title="Entradas ya vendidas">${Number(t.vendidas) || 0} vendidas</span>
        <button type="button" class="boton boton-chico boton--peligro" data-accion="quitar-entrada" aria-label="Quitar este tipo de entrada">✕</button>
      </div>`;
  }

  function formularioEvento() {
    const ev = eventoEnEdicion;
    return `
      <h3>${esNuevo ? "Nuevo evento" : "Editar evento"}</h3>
      <form id="form-evento" class="form-ancho" novalidate>
        <label for="ev-titulo">Título del show *</label>
        <input type="text" id="ev-titulo" maxlength="80" value="${esc(ev.titulo)}">

        <label for="ev-fecha">Fecha (vacío = a confirmar)</label>
        <input type="date" id="ev-fecha" value="${esc(ev.fecha)}">

        <label for="ev-lugar">Lugar</label>
        <input type="text" id="ev-lugar" maxlength="120" value="${esc(ev.lugar)}" placeholder="Ej: Estadio Obras, Buenos Aires">

        <label for="ev-imagen">URL de la imagen *</label>
        <input type="text" id="ev-imagen" value="${esc(ev.imagen)}" placeholder="https://...">

        <label for="ev-descripcion">Descripción</label>
        <textarea id="ev-descripcion" rows="4" maxlength="800">${esc(ev.descripcion)}</textarea>

        <label for="ev-artista">Artista (para la API de música; vacío = no mostrar)</label>
        <input type="text" id="ev-artista" maxlength="80" value="${esc(ev.artista)}" placeholder="Ej: Maroon 5">

        <label for="ev-instagram">Instagram u otra red del artista (URL)</label>
        <input type="text" id="ev-instagram" value="${esc(ev.instagram)}" placeholder="https://www.instagram.com/...">

        <fieldset>
          <legend>Tipos de entrada y stock</legend>
          <div id="ev-entradas">${ev.entradas.map(filaEntrada).join("")}</div>
          <button type="button" class="boton boton-chico" data-accion="agregar-entrada">+ Agregar tipo de entrada</button>
        </fieldset>

        <div id="ev-mensaje" aria-live="polite"></div>
        <button type="submit" class="boton-enviar">Guardar evento</button>
        <button type="button" class="boton boton--secundario" data-accion="cancelar">Cancelar</button>
      </form>`;
  }

  function activarFormularioEvento() {
    document.querySelector("#form-evento").addEventListener("submit", (e) => {
      e.preventDefault();
      guardarFormularioEvento();
    });
  }

  function guardarFormularioEvento() {
    const mensaje = document.querySelector("#ev-mensaje");
    const titulo = document.querySelector("#ev-titulo").value.trim();
    const imagen = document.querySelector("#ev-imagen").value.trim();
    const instagram = document.querySelector("#ev-instagram").value.trim();

    if (!titulo) { mensaje.innerHTML = error("El título es obligatorio."); return; }
    if (!/^https?:\/\//i.test(imagen)) { mensaje.innerHTML = error("La imagen debe ser una URL que empiece con http:// o https://."); return; }
    if (instagram && !/^https?:\/\//i.test(instagram)) { mensaje.innerHTML = error("El enlace de la red social debe empezar con http:// o https://."); return; }

    const entradas = [];
    for (const fila of document.querySelectorAll(".fila-entrada")) {
      const nombre = fila.querySelector(".ent-nombre").value.trim();
      const precioN = Number(fila.querySelector(".ent-precio").value);
      const stock = Number(fila.querySelector(".ent-stock").value);
      const vendidas = Number(fila.dataset.vendidas) || 0;
      if (!nombre) { mensaje.innerHTML = error("Cada tipo de entrada necesita un nombre."); return; }
      if (!(precioN >= 0) || fila.querySelector(".ent-precio").value === "") { mensaje.innerHTML = error(`Ingresá un precio válido para "${nombre}".`); return; }
      if (!Number.isInteger(stock) || stock < 0 || fila.querySelector(".ent-stock").value === "") { mensaje.innerHTML = error(`Ingresá un stock entero (0 o más) para "${nombre}".`); return; }
      if (stock < vendidas) { mensaje.innerHTML = error(`"${nombre}" ya tiene ${vendidas} vendidas: el stock total no puede ser menor.`); return; }
      const idTipo = fila.dataset.id ? Number(fila.dataset.id) : null;
      const item = { nombre, precio: precioN, stock, vendidas };
      if (idTipo) item.id = idTipo;
      entradas.push(item);
    }
    if (!entradas.length) { mensaje.innerHTML = error("Agregá al menos un tipo de entrada."); return; }

    const payload = {
      titulo,
      imagen_url: imagen,
      imagen,
      instagram,
      fecha: document.querySelector("#ev-fecha").value || null,
      lugar: document.querySelector("#ev-lugar").value.trim(),
      descripcion: document.querySelector("#ev-descripcion").value.trim() || "Próximamente más información.",
      artista: document.querySelector("#ev-artista").value.trim(),
      activo: true,
      entradas: entradas.map((t) => ({
        id: t.id || undefined,
        nombre: t.nombre,
        precio: t.precio,
        stock: t.stock
      }))
    };

    const btn = document.querySelector("#form-evento button[type=\"submit\"]");
    if (btn) btn.disabled = true;
    mensaje.innerHTML = '<p class="ayuda-campo">Guardando…</p>';

    (async () => {
      try {
        if (modoApi && typeof TS_API !== "undefined") {
          if (esNuevo || !eventoEnEdicion.id) {
            await TS_API.adminCrearEvento(payload);
          } else {
            await TS_API.adminActualizarEvento(eventoEnEdicion.id, payload);
          }
          await refrescarEventosApi();
        } else {
          const evento = {
            id: eventoEnEdicion.id || TS.nuevoIdEvento(titulo),
            titulo, imagen, entradas, instagram,
            fecha: payload.fecha || "",
            lugar: payload.lugar,
            descripcion: payload.descripcion,
            artista: payload.artista
          };
          TS.guardarEvento(evento);
        }
        avisoGlobal = ok(`Evento "${titulo}" guardado.`);
        eventoEnEdicion = null;
        esNuevo = false;
        render();
      } catch (err) {
        let msg = err.message || "No se pudo guardar.";
        if (err.datos && err.datos.errores) {
          msg = Object.values(err.datos.errores).join(" ");
        }
        mensaje.innerHTML = error(msg);
        if (btn) btn.disabled = false;
      }
    })();
  }

  /* ---------- Stock ---------- */
  function vistaStock() {
    const bloques = listaEventos().map((ev) => {
      const filas = ev.entradas.map((t, i) => {
        const disp = TS.disponibles(t);
        const pct = t.stock ? Math.round(((t.vendidas || 0) / t.stock) * 100) : 0;
        return `
          <tr>
            <td class="alinear-izq">${esc(t.nombre)}</td>
            <td>${precio(t.precio)}</td>
            <td><input type="number" min="${t.vendidas || 0}" step="1" value="${t.stock}" class="input-stock" data-id="${esc(ev.id)}" data-idx="${i}" aria-label="Stock total de ${esc(t.nombre)}"></td>
            <td>${t.vendidas || 0}</td>
            <td><strong class="${disp === 0 ? "texto-agotado" : disp <= 20 ? "texto-poco" : ""}">${disp}</strong></td>
            <td><div class="barra"><div class="barra-relleno" style="width:${pct}%"></div></div></td>
            <td><button type="button" class="boton boton-chico" data-accion="guardar-stock" data-id="${esc(ev.id)}" data-idx="${i}">Guardar</button></td>
          </tr>`;
      }).join("");
      return `
        <h3>${esc(ev.titulo)} <small>${TS.fechaCorta(ev.fecha)}</small></h3>
        <div class="tabla-scroll"><table class="tabla-admin">
          <thead><tr><th>Entrada</th><th>Precio</th><th>Stock total</th><th>Vendidas</th><th>Disponibles</th><th>Ocupación</th><th></th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>`;
    }).join("");
    return `<p class="ayuda-campo">Editá el stock total de cada entrada. El stock disponible se descuenta solo con cada venta.</p>${bloques}`;
  }

  /* ---------- Ventas ---------- */
  function vistaVentas() {
    const ordenes = [...TS.getOrdenes()].reverse();
    const total = ordenes.reduce((s, o) => s + o.total, 0);
    const filas = ordenes.map((o) => `
      <tr>
        <td>${esc(TS.fechaHora(o.creada))}</td>
        <td><a href="ticket.html?orden=${encodeURIComponent(o.id)}">${esc(o.id)}</a></td>
        <td class="alinear-izq">${esc(o.eventoTitulo)}<br><small>${esc(o.tipoNombre)}</small></td>
        <td>${o.cantidad}</td>
        <td>${precio(o.total)}</td>
        <td>${esc(TS.MEDIOS_PAGO[o.pago] || o.pago)}</td>
        <td class="alinear-izq">${esc(o.cliente.nombre)}<br><small>${esc(o.cliente.email)}</small></td>
        <td>${o.tickets.filter((t) => t.usado).length}/${o.tickets.length}</td>
      </tr>`).join("");
    return `
      <div class="barra-herramientas">
        <h3>Ventas (${ordenes.length}) — ${precio(total)}</h3>
        <button type="button" class="boton" data-accion="exportar-csv"${ordenes.length ? "" : " disabled"}>⬇ Exportar CSV</button>
      </div>
      ${ordenes.length ? `<div class="tabla-scroll"><table class="tabla-admin">
        <thead><tr><th>Fecha</th><th>Orden</th><th>Show</th><th>Cant.</th><th>Total</th><th>Pago</th><th>Cliente</th><th>Usados</th></tr></thead>
        <tbody>${filas}</tbody></table></div>` : "<p>Todavía no hay ventas registradas.</p>"}`;
  }

  function exportarCSV() {
    const celda = (v) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
      return `"${s.replace(/"/g, '""')}"`;
    };
    const cab = ["Fecha", "Orden", "Show", "Entrada", "Cantidad", "Total", "Medio de pago", "Cliente", "Email", "Tickets"];
    const filas = TS.getOrdenes().map((o) => [
      o.creada, o.id, o.eventoTitulo, o.tipoNombre, o.cantidad, o.total,
      TS.MEDIOS_PAGO[o.pago] || o.pago, o.cliente.nombre, o.cliente.email, o.tickets.map((t) => t.codigo).join(" ")
    ]);
    const csv = "﻿" + [cab, ...filas].map((f) => f.map(celda).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "ventas-ticketshow.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  /* ---------- Reseñas (moderación) ---------- */
  function vistaResenas() {
    const eventos = Object.fromEntries(TS.getEventos().map((ev) => [ev.id, ev.titulo]));
    const lista = TS.getResenas();
    const filas = lista.map((r) => `
      <tr>
        <td class="alinear-izq">${esc(eventos[r.eventoId] || r.eventoId)}</td>
        <td><span class="estrellas-fijas">${TS.estrellas(r.puntaje)}</span></td>
        <td class="alinear-izq">${esc(r.nombre)}${r.verificada ? ' <span class="etiqueta etiqueta--ok">Verificada</span>' : ""}<br>${esc(r.comentario) || "<small>(sin comentario)</small>"}</td>
        <td>${esc(TS.fechaHora(r.fecha))}</td>
        <td><button type="button" class="boton boton-chico boton--peligro" data-accion="borrar-resena" data-id="${esc(r.id)}">Eliminar</button></td>
      </tr>`).join("");
    return `<h3>Reseñas (${lista.length})</h3>` + (lista.length
      ? `<div class="tabla-scroll"><table class="tabla-admin"><thead><tr><th>Show</th><th>Puntaje</th><th>Reseña</th><th>Fecha</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`
      : "<p>Todavía no hay reseñas.</p>");
  }

  /* ---------- Validar ticket (control de acceso) ---------- */
  let resultadoValidacion = "";
  function vistaValidar() {
    return `
      <h3>Validar ticket en el acceso</h3>
      <p class="ayuda-campo">Ingresá el código del ticket (el texto bajo el QR) o pegá el contenido leído por un lector de QR.</p>
      <form id="form-validar" class="form-ancho" novalidate>
        <label for="codigo-validar">Código del ticket</label>
        <input type="text" id="codigo-validar" placeholder="Ej: TS-ABCDEFGH23" autocomplete="off">
        <button type="submit" class="boton-enviar">Verificar</button>
      </form>
      <div id="resultado-validacion" aria-live="polite">${resultadoValidacion}</div>`;
  }

  function verificarTicket(codigo) {
    const hallado = TS.buscarTicket(codigo);
    if (!hallado) return error("Ticket NO válido: el código no existe en este sistema.");
    const { orden, ticket } = hallado;
    const datos = `<p><strong>${esc(orden.eventoTitulo)}</strong> — ${esc(orden.tipoNombre)}</p>
      <p>Titular: ${esc(orden.cliente.nombre)} · Orden ${esc(orden.id)}</p>`;
    if (ticket.usado) {
      return `<div class="mensaje-error-caja">${datos}<p class="mensaje-error">⚠ Ya fue utilizado el ${esc(TS.fechaHora(ticket.usadoEn))}.</p></div>`;
    }
    return `<div class="mensaje-exito">${datos}<p>✔ Ticket válido, todavía no usado.</p>
      <button type="button" class="boton" data-accion="marcar-usado" data-codigo="${esc(ticket.codigo)}">Marcar como usado (dejar ingresar)</button></div>`;
  }

  /* ---------- Bandeja de e-mails ---------- */
  function vistaCorreos() {
    const lista = TS.getCorreos();
    const filas = lista.map((c) => `
      <tr><td>${esc(TS.fechaHora(c.fecha))}</td><td class="alinear-izq">${esc(c.para)}</td>
      <td class="alinear-izq">${esc(c.asunto)}</td><td>${esc(c.ordenId)}</td><td>${esc(c.modo)}</td></tr>`).join("");
    return `<h3>E-mails de tickets enviados (${lista.length})</h3>` + (lista.length
      ? `<div class="tabla-scroll"><table class="tabla-admin"><thead><tr><th>Fecha</th><th>Para</th><th>Asunto</th><th>Orden</th><th>Vía</th></tr></thead><tbody>${filas}</tbody></table></div>`
      : "<p>Todavía no se enviaron tickets por e-mail.</p>");
  }

  /* ---------- Acciones (delegación de eventos) ---------- */
  vista.addEventListener("click", (e) => {
    const b = e.target.closest("[data-accion]");
    if (!b) return;
    const accion = b.dataset.accion;
    const id = b.dataset.id;

    switch (accion) {
      case "nuevo":
        eventoEnEdicion = { id: "", titulo: "", fecha: "", lugar: "", imagen: "", descripcion: "", artista: "", instagram: "",
          entradas: [{ nombre: "Entrada General", precio: "", stock: "", vendidas: 0 }] };
        esNuevo = true; avisoGlobal = ""; render(); break;
      case "editar":
        (async () => {
          if (modoApi && typeof TS_API !== "undefined") {
            try {
              const ev = await TS_API.adminGetEvento(id);
              eventoEnEdicion = {
                id: ev.id,
                titulo: ev.titulo,
                fecha: ev.fecha || "",
                lugar: ev.lugar || "",
                imagen: ev.imagen_url || "",
                descripcion: ev.descripcion || "",
                artista: ev.artista || "",
                instagram: ev.instagram || "",
                activo: ev.activo !== false,
                entradas: (ev.entradas || []).map((t) => ({
                  id: t.id,
                  nombre: t.nombre,
                  precio: t.precio,
                  stock: t.stock,
                  vendidas: t.vendidas || 0
                }))
              };
            } catch (err) {
              avisoGlobal = error(err.message || "No se pudo cargar el evento.");
              render();
              return;
            }
          } else {
            const local = TS.getEvento(id);
            if (!local) { avisoGlobal = error("Evento no encontrado."); render(); return; }
            eventoEnEdicion = JSON.parse(JSON.stringify(local));
          }
          esNuevo = false; avisoGlobal = ""; render();
        })();
        break;
      case "cancelar":
        eventoEnEdicion = null; render(); break;
      case "eliminar": {
        (async () => {
          let titulo = id;
          if (modoApi) {
            const found = cacheEventos.find((x) => String(x.id) === String(id));
            titulo = found ? found.titulo : id;
          } else {
            const ev = TS.getEvento(id);
            if (!ev) return;
            titulo = ev.titulo;
            const ventas = TS.getOrdenes().filter((o) => o.eventoId === id).length;
            const extra = ventas ? `\n\nTiene ${ventas} orden(es) vendidas: se conservan en Ventas, pero el show dejará de estar en la cartelera.` : "";
            if (!window.confirm(`¿Eliminar "${titulo}"?${extra}`)) return;
            TS.eliminarEvento(id);
            avisoGlobal = ok(`Evento "${titulo}" eliminado.`);
            render();
            return;
          }
          if (!window.confirm(`¿Dar de baja "${titulo}"? (baja lógica: deja de mostrarse en la cartelera)`)) return;
          try {
            await TS_API.adminEliminarEvento(id);
            await refrescarEventosApi();
            avisoGlobal = ok(`Evento "${titulo}" dado de baja.`);
          } catch (err) {
            avisoGlobal = error(err.message || "No se pudo eliminar.");
          }
          render();
        })();
        break;
      }
      case "agregar-entrada":
        document.querySelector("#ev-entradas").insertAdjacentHTML("beforeend", filaEntrada());
        break;
      case "quitar-entrada": {
        const fila = b.closest(".fila-entrada");
        if (Number(fila.dataset.vendidas) > 0) {
          document.querySelector("#ev-mensaje").innerHTML = error("Ese tipo de entrada ya tiene ventas: no se puede quitar (podés poner su stock igual a las vendidas).");
        } else fila.remove();
        break;
      }
      case "guardar-stock": {
        (async () => {
          const idx = Number(b.dataset.idx);
          const input = vista.querySelector(`.input-stock[data-id="${CSS.escape(id)}"][data-idx="${idx}"]`);
          const nuevo = Number(input.value);
          const lista = listaEventos();
          const ev = lista.find((x) => String(x.id) === String(id)) || TS.getEvento(id);
          if (!ev || !ev.entradas || !ev.entradas[idx]) {
            avisoGlobal = error("No se encontró el tipo de entrada.");
            render(); return;
          }
          const tipo = ev.entradas[idx];
          if (!Number.isInteger(nuevo) || nuevo < (tipo.vendidas || 0)) {
            avisoGlobal = error(`El stock de "${tipo.nombre}" debe ser un entero y no puede ser menor que las ${tipo.vendidas || 0} ya vendidas.`);
            render(); return;
          }
          try {
            if (modoApi && tipo.id != null && typeof TS_API !== "undefined") {
              await TS_API.adminActualizarStock(tipo.id, nuevo);
              await refrescarEventosApi();
            } else {
              const local = TS.getEvento(id);
              local.entradas[idx].stock = nuevo;
              TS.guardarEvento(local);
            }
            avisoGlobal = ok(`Stock de "${tipo.nombre}" (${ev.titulo}) actualizado a ${nuevo}.`);
          } catch (err) {
            avisoGlobal = error(err.message || "No se pudo actualizar el stock.");
          }
          render();
        })();
        break;
      }
      case "exportar-csv": exportarCSV(); break;
      case "borrar-resena":
        if (window.confirm("¿Eliminar esta reseña?")) { TS.eliminarResena(id); render(); }
        break;
      case "marcar-usado":
        TS.marcarTicketUsado(b.dataset.codigo);
        resultadoValidacion = ok("Ticket marcado como usado. ¡Que lo disfrute!");
        render(); break;
      case "restablecer":
        if (window.confirm("Se borrarán ventas, reseñas y cambios, y se restauran los shows originales. ¿Continuar?")) {
          TS.restaurarDatosIniciales();
          avisoGlobal = ok("Datos de demostración restablecidos.");
          render();
        }
        break;
    }
  });

  vista.addEventListener("submit", (e) => {
    if (e.target.id !== "form-validar") return;
    e.preventDefault();
    const codigo = document.querySelector("#codigo-validar").value;
    if (!codigo.trim()) { resultadoValidacion = error("Ingresá un código."); }
    else resultadoValidacion = verificarTicket(codigo);
    render();
    document.querySelector("#codigo-validar").focus();
  });

  mostrarSegunSesion();
})();
