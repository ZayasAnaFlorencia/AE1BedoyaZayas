/* =========================================================
   api.js — Cliente HTTP de TicketShow (fetch + async/await)
   Conecta la interfaz con los endpoints PHP de /api.
   Las entidades de servidor (eventos, sesión/usuario, órdenes)
   ya no dependen de store.js / localStorage.
   ========================================================= */

const TS_API = (() => {
  const base = () => {
    const cfg = (typeof TS_CONFIG !== "undefined" && TS_CONFIG.apiBase) || "../api";
    return String(cfg).replace(/\/$/, "");
  };

  /**
   * Petición JSON genérica.
   * credentials: "include" para enviar/recibir la cookie de sesión PHP.
   */
  async function request(ruta, opciones = {}) {
    const url = `${base()}/${ruta.replace(/^\//, "")}`;
    const headers = {
      Accept: "application/json",
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(opciones.headers || {})
    };

    let respuesta;
    try {
      respuesta = await fetch(url, {
        credentials: "include",
        ...opciones,
        headers
      });
    } catch (err) {
      const e = new Error("No se pudo conectar con el servidor. ¿Está la API en marcha?");
      e.causa = err;
      e.red = true;
      throw e;
    }

    let datos = null;
    const texto = await respuesta.text();
    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch (_) {
        datos = { error: texto.slice(0, 200) };
      }
    }

    if (!respuesta.ok) {
      const mensaje =
        (datos && (datos.error || (datos.errores && Object.values(datos.errores)[0]))) ||
        `Error HTTP ${respuesta.status}`;
      const e = new Error(String(mensaje));
      e.status = respuesta.status;
      e.datos = datos;
      throw e;
    }

    return datos;
  }

  /* ---------- Normalización de formas (API → UI) ---------- */

  function normalizarEventoLista(ev) {
    return {
      id: ev.id,
      titulo: ev.titulo,
      fecha: ev.fecha || "",
      lugar: ev.lugar || "",
      imagen: ev.imagen_url || ev.imagen || "",
      imagen_url: ev.imagen_url || ev.imagen || "",
      artista: ev.artista || "",
      descripcion: ev.descripcion || "",
      precio_desde: ev.precio_desde != null ? Number(ev.precio_desde) : null,
      disponibles: ev.disponibles != null ? Number(ev.disponibles) : 0,
      // Compat con helpers de store que esperan entradas[]
      entradas: ev.entradas || []
    };
  }

  function normalizarEventoDetalle(ev) {
    const baseEv = normalizarEventoLista(ev);
    baseEv.descripcion = ev.descripcion || "";
    baseEv.instagram = ev.instagram || "";
    baseEv.entradas = (ev.entradas || []).map((t) => ({
      id: t.id,
      nombre: t.nombre,
      precio: Number(t.precio),
      // API expone "disponibles"; store usaba stock/vendidas
      disponibles: t.disponibles != null ? Number(t.disponibles) : Math.max(0, (t.stock || 0) - (t.vendidas || 0)),
      stock: t.stock != null ? Number(t.stock) : Number(t.disponibles || 0),
      vendidas: t.vendidas != null ? Number(t.vendidas) : 0
    }));
    return baseEv;
  }

  function normalizarOrden(o) {
    return {
      id: o.codigo || o.id,
      codigo: o.codigo || o.id,
      eventoId: o.evento_id || o.eventoId,
      eventoTitulo: o.evento || o.eventoTitulo || "",
      eventoFecha: o.fecha || o.eventoFecha || "",
      eventoLugar: o.lugar || o.eventoLugar || "",
      tipoNombre: o.tipo_entrada || o.tipoNombre || "",
      cantidad: Number(o.cantidad || 0),
      precioUnitario: Number(o.precio_unitario != null ? o.precio_unitario : o.precioUnitario || 0),
      total: Number(o.total || 0),
      estado: o.estado || "confirmada",
      pago: o.medio_pago || o.pago || "",
      creadaEn: o.creada_en || o.creadaEn || "",
      cliente: {
        nombre: o.cliente_nombre || (o.cliente && o.cliente.nombre) || "",
        email: o.cliente_email || (o.cliente && o.cliente.email) || "",
        telefono: o.cliente_telefono || (o.cliente && o.cliente.telefono) || "",
        direccion: o.cliente_direccion || (o.cliente && o.cliente.direccion) || ""
      },
      tickets: (o.tickets || []).map((t) => ({
        codigo: t.codigo || t.id,
        usado: !!(t.usado || t.usado_en)
      }))
    };
  }

  /* ---------- Eventos (público) ---------- */

  async function getEventos() {
    const data = await request("eventos.php");
    return (data.eventos || []).map(normalizarEventoLista);
  }

  async function getEvento(id) {
    const data = await request(`eventos.php?id=${encodeURIComponent(id)}`);
    return normalizarEventoDetalle(data.evento);
  }

  /* ---------- Sesión / autenticación ---------- */

  async function getSesion() {
    const data = await request("sesion.php");
    return data;
  }

  async function login(email, password) {
    const data = await request("login.php", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    return data.usuario;
  }

  async function logout() {
    await request("logout.php", { method: "POST", body: "{}" });
    return true;
  }

  async function registro(payload) {
    // payload: { email, password, nombre, apellido?, pais?, telefono?, ... }
    const data = await request("registro.php", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return data; // { id }
  }

  /* ---------- Órdenes (requiere sesión) ---------- */

  async function getOrdenes() {
    const data = await request("ordenes.php");
    return (data.ordenes || []).map(normalizarOrden);
  }

  /**
   * Compra de entradas.
   * @param {{ tipo_entrada_id: number, cantidad: number, medio_pago: string,
   *           cliente_nombre: string, cliente_email: string,
   *           cliente_telefono?: string, cliente_direccion?: string }} datos
   */
  async function crearOrden(datos) {
    const data = await request("ordenes.php", {
      method: "POST",
      body: JSON.stringify(datos)
    });
    return normalizarOrden(data.orden || data);
  }

  /* ---------- Admin CRUD eventos (requiere rol admin) ---------- */

  async function adminListarEventos() {
    const data = await request("admin_eventos.php");
    return data.eventos || [];
  }

  async function adminGetEvento(id) {
    const data = await request(`admin_eventos.php?id=${encodeURIComponent(id)}`);
    return data.evento;
  }

  async function adminCrearEvento(payload) {
    const data = await request("admin_eventos.php", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return data.evento;
  }

  async function adminActualizarEvento(id, payload) {
    const data = await request(`admin_eventos.php?id=${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return data.evento;
  }

  async function adminEliminarEvento(id) {
    const data = await request(`admin_eventos.php?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return data;
  }

  async function adminActualizarStock(tipoEntradaId, stock) {
    const data = await request("admin_eventos.php?stock=1", {
      method: "PATCH",
      body: JSON.stringify({ tipo_entrada_id: tipoEntradaId, stock })
    });
    return data;
  }

  return {
    base,
    request,
    getEventos,
    getEvento,
    getSesion,
    login,
    logout,
    registro,
    getOrdenes,
    crearOrden,
    adminListarEventos,
    adminGetEvento,
    adminCrearEvento,
    adminActualizarEvento,
    adminEliminarEvento,
    adminActualizarStock,
    normalizarEventoLista,
    normalizarEventoDetalle,
    normalizarOrden
  };
})();
