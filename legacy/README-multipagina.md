# TicketShow — Brenda Bedoya (AE2) · versión ampliada

Sitio de venta de entradas para shows en vivo, ahora con panel de administración,
tickets electrónicos con QR, reseñas, integraciones y app móvil.

## Cómo ejecutarlo
Los módulos y el service worker necesitan un servidor local (no abrir con doble clic):

```bash
python3 -m http.server 8000      # o: npx http-server .
# abrir http://localhost:8000/index.html
```

> Todo se guarda en el navegador (`localStorage`). No hay servidor ni base de datos.

## Funciones nuevas

| Función | Dónde |
|---|---|
| **Panel de administración** (eventos, stock, ventas, reseñas, validar tickets, e-mails) | `admin.html` · `admin.js` |
| **Tickets electrónicos PDF + QR**, descarga, impresión y envío por e-mail | `ticket.html` · `ticket.js` · `mis_tickets.html` |
| **Reseñas y valoraciones** (1–5 ★, "compra verificada", moderación desde admin) | ficha del show (`producto.html`) · `extras.js` |
| **Redes sociales y API de artistas** (compartir, Instagram, canciones con preview vía iTunes Search API) | `extras.js` |
| **Selección de medio de pago** (Mercado Pago, Visa, Mastercard, Amex, transferencia, efectivo) | `comprar.html` · `compra.js` |
| **Idiomas** Español / English / Português (selector en el pie, se recuerda la elección) | `i18n.js` |
| **App móvil**: PWA instalable + proyecto nativo Android (Capacitor) | `manifest.webmanifest`, `sw.js`, `pwa.js`, `android/` |

Capa de datos compartida: `store.js` (eventos, stock, órdenes, reseñas). Configuración: `config.js`.

### Panel de administración
- Acceso demo: `admin@ticketshow.com` / `admin123` (cambiar en `config.js`).
- **Eventos**: alta, edición y baja; tipos de entrada con precio y stock.
- **Stock**: se descuenta solo con cada venta; no permite quedar por debajo de lo vendido ni sobrevender.
- **Validar ticket**: ingresar el código (o el contenido del QR) → marca el ticket como usado, y rechaza el segundo uso.
- **Ventas**: listado y exportación a CSV.

### Envío de tickets por e-mail
- Sin configuración: abre tu cliente de correo (`mailto:`) con los códigos y un enlace al ticket, y lo registra en *Admin → E-mails*.
- Envío automático real: completá `emailjs` en `config.js` (cuenta gratuita en emailjs.com). La plantilla recibe
  `to_email, to_name, evento, fecha, lugar, codigos, link_ticket`.

### App móvil
- **PWA**: en Chrome/Android o Safari/iOS (con el sitio servido por HTTPS) → "Instalar app" / "Agregar a inicio". Funciona sin conexión para lo ya visitado.
- **App nativa Android** (Capacitor), requiere [Node](https://nodejs.org) y [Android Studio](https://developer.android.com/studio):
  ```bash
  npm install
  npm run android        # copia la web a www/, sincroniza y abre Android Studio → Run ▶ / Build APK
  ```
  Para iOS (solo en macOS con Xcode): `npx cap add ios && npm run ios`.
  Cada vez que cambies HTML/JS/CSS: `npm run sync`.

### Diseño
- Interfaz moderna sin botones de caja: encabezado fijo con menú de texto, tarjetas de evento clicables, filas clicables en la tabla y en los tipos de entrada (llevan directo a la compra con ese tipo elegido) y buscador en vivo en la portada.
- Solo quedan los controles imprescindibles (enviar formularios, estrellas, medios de pago), con estilo de texto con flecha.

### Idiomas
- El selector está en el pie de todas las páginas públicas. Para agregar o corregir textos, editá las listas `DICT` y `PATRONES` de `i18n.js` (la clave es el texto en español).
- Los datos que carga el administrador (nombres, lugares, descripciones nuevas) se muestran como fueron escritos. El panel `admin.html` queda en español.
- La encuesta de satisfacción ya no está en el menú: se ofrece solo al finalizar una compra (en `ticket.html`) y se cierra una vez respondida.

## Limitaciones conocidas (proyecto académico)
- **Pagos**: solo se elige el medio de pago; no se cobra ni se piden datos de tarjeta.
- **Autenticación de admin y datos**: viven en el navegador, por lo que no son seguros ni se comparten entre dispositivos. Para producción hace falta un backend (usuarios, base de datos, validación de tickets en servidor).
- El enlace de ticket enviado por e-mail muestra los QR en cualquier dispositivo, pero la **validación de entrada** solo funciona en el navegador donde se hizo la compra/admin.
- Las fechas de los shows originales (21/10, 25/10 y 08/11/2026) ya pasaron: se pueden editar desde el panel.
