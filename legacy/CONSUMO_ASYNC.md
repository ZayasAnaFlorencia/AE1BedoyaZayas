# Consumo asíncrono + CRUD completo (ISO 25010)

## 1. Consumo asíncrono (`fetch` + `async/await`)

Las entidades de servidor ya no dependen de forma absoluta de `store.js` / `localStorage`.

| Entidad | Endpoint | Cliente JS |
|---|---|---|
| Cartelera / ficha | `GET /api/eventos.php` · `?id=` | `TS_API.getEventos()` · `getEvento(id)` |
| Sesión | `GET /api/sesion.php` | `TS_API.getSesion()` |
| Login / Logout | `POST login.php` · `logout.php` | `login()` · `logout()` |
| Registro | `POST /api/registro.php` | `registro(payload)` |
| Órdenes | `GET/POST /api/ordenes.php` | `getOrdenes()` · `crearOrden()` |

Archivos: `api.js`, `auth.js`, y adaptaciones en `app.js`, `compra.js`, `mis_tickets.js`, `ticket.js`.

### Manejo de errores en `fetch`

En `api.js`, `request()`:

1. **Error de red** (servidor caído, CORS, offline): captura la excepción de `fetch`, lanza un `Error` con `e.red = true` y mensaje claro.
2. **HTTP no OK**: lee el cuerpo JSON (`error` o `errores`), adjunta `e.status` y `e.datos`, y lanza para que la UI muestre el mensaje.
3. **JSON inválido**: no rompe el flujo; usa un fallback de texto.
4. Las pantallas (`auth.js`, `compra.js`, `admin.js`, `app.js`) hacen `try/catch`, muestran mensajes al usuario y, si aplica, deshabilitan el botón solo durante la petición.

---

## 2. CRUD completo de eventos (ISO 25010 — funcionalidad)

| Operación | Método | Endpoint | Modelo |
|---|---|---|---|
| **C**reate | `POST` | `/api/admin_eventos.php` | `EventoModel::crear()` |
| **R**ead | `GET` | `/api/admin_eventos.php` · `?id=` | `listarTodos()` · `buscarPorIdAdmin()` |
| **U**pdate | `PUT` | `/api/admin_eventos.php?id=` | `actualizar()` + sincronización de tipos |
| **D**elete | `DELETE` | `/api/admin_eventos.php?id=` | `eliminar()` — **baja lógica** (`activo = 0`) |
| Stock | `PATCH` | `/api/admin_eventos.php?stock=1` | `actualizarStockTipo()` |

- Endpoint **protegido**: `exigirRol('admin')` (401 sin sesión, 403 sin rol).
- Validación de payload (título, URL de imagen, fecha, al menos un tipo de entrada).
- Transacciones PDO en create/update.
- Delete no borra historial de ventas: solo saca el show de la cartelera pública.
- Tipos de entrada con ventas no se eliminan al editar (protección de integridad).

### Panel `admin.html`

1. Login con usuario **rol `admin`** en la BD → modo API.
2. Fallback demo: credenciales de `config.js` → modo local (`store.js`).
3. Pestaña **Eventos**: listar, alta, edición, baja vía API.
4. Pestaña **Stock**: `PATCH` de stock por `tipo_entrada_id`.

Cliente JS: `TS_API.adminListarEventos`, `adminGetEvento`, `adminCrearEvento`, `adminActualizarEvento`, `adminEliminarEvento`, `adminActualizarStock`.

---

## Cómo probar

1. Usuario admin en BD (`rol = 'admin'`).
2. `TS_CONFIG.apiBase` apuntando a la API.
3. Login en `admin.html` con ese usuario.
4. Crear / editar / eliminar eventos y verificar cartelera pública (`eventos.php` solo muestra `activo = 1`).

---

## 3. Seguridad frontend — OWASP A03 (Injection)

Revisión del JavaScript para evitar XSS al inyectar datos dinámicos en el DOM.

### Reglas aplicadas

1. **Texto plano** → `.textContent` / `.innerText` (nunca `.innerHTML`).
   - Mensajes de login/registro (`auth.js` → `mostrar()`).
   - Títulos, fechas, lugares en ficha de evento (`app.js`).
   - Stock e info de pago (`compra.js`).
   - Helpers `TS.setText()` y `TS.setMsg()`.

2. **Markup estructural con datos** → `.innerHTML` **solo** con valores pasados por `TS.esc()` / `TS.escAttr()`.
   - Tarjetas, tablas, listas de órdenes, reseñas, formularios admin.

3. **URLs** (`src`, `href` externos) → `TS.urlSegura()`:
   - Solo `http://`, `https://` o rutas relativas.
   - Bloquea `javascript:`, `data:`, `vbscript:`, etc.

4. **`esc()` reforzado**: escapa `& < > " ' \` = /` antes de interpolar en HTML.

### Archivos tocados

| Archivo | Cambio |
|---|---|
| `store.js` | `esc`, `escAttr`, `urlSegura`, `setText`, `setMsg` |
| `app.js` | Encuesta y ficha sin innerHTML crudo; `urlSegura` en imágenes |
| `auth.js` | Ya usaba `textContent` para mensajes |
| `extras.js` | Mensajes de reseña vía `setMsg` |
| `admin.js` / `compra.js` / `ticket.js` | Datos de usuario/API pasan por `esc()` |

### Checklist de verificación

- [x] No hay `eval` ni `document.write` con datos externos.
- [x] Mensajes de error/éxito de formularios de auth usan `textContent`.
- [x] Campos de API (título, lugar, nombre, comentario) se escapan al renderizar.
- [x] `img.src` y enlaces externos filtrados con `urlSegura` donde aplica.
- [x] Atributos `value` / `data-*` en plantillas admin usan `esc()`.
