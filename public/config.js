/* =========================================================
   Configuración de TicketShow
   Frontend + API PHP (eventos, sesión, órdenes).
   El panel admin demo sigue usando localStorage; las entidades
   de servidor se consumen con fetch desde api.js.
   ========================================================= */

const TS_CONFIG = {
  // Acceso al panel de administración (admin.html) — solo demo local
  adminUsuario: "admin@ticketshow.com",
  adminClave: "admin123",

  /**
   * Base URL de la API PHP.
   * - Document root en la raíz del proyecto: "/api"
   * - Servidor solo sobre public/ (p. ej. http.server desde public): "../api"
   * Ajustá según cómo levantes el backend.
   */
  apiBase: "../api",

  // Envío real de tickets por e-mail con EmailJS (https://www.emailjs.com).
  // Si dejás estos tres campos vacíos, el botón "Enviar por e-mail" abre tu
  // cliente de correo (mailto:) y registra el envío en la bandeja simulada.
  // Variables que espera la plantilla de EmailJS:
  //   to_email, to_name, evento, fecha, lugar, codigos, link_ticket
  emailjs: {
    serviceId: "",
    templateId: "",
    publicKey: ""
  },

  // Integración con API de artistas (iTunes Search API, pública y sin clave)
  artistasApi: true
};
