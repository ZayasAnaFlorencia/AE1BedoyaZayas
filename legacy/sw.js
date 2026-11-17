/* =========================================================
   sw.js — Service worker de TicketShow (app instalable / offline)
   - Archivos propios: "stale-while-revalidate" (rápido y se actualiza solo)
   - Navegación sin conexión: cae a la copia guardada o a index.html
   - Servicios externos (iTunes, EmailJS, CDN de imágenes): no se tocan
   ========================================================= */

const VERSION = "ticketshow-v4";
const PRECACHE = [
  "index.html", "listado_tabla.html", "listado_box.html", "producto.html", "comprar.html",
  "ticket.html", "mis_tickets.html", "encuesta.html", "login.html", "registro.html", "support.html", "admin.html",
  "style.css", "app.js", "compra.js", "ticket.js", "extras.js", "admin.js", "mis_tickets.js",
  "config.js", "store.js", "i18n.js", "pwa.js", "confirmacion-encuesta.json",
  "vendor/qrcode.js", "vendor/jspdf.umd.min.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((enCache) => {
      const red = fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
        }
        return resp;
      }).catch(() => enCache || (req.mode === "navigate" ? caches.match("index.html") : undefined));
      return enCache || red;
    })
  );
});
