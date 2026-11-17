# TicketShow — AE4 · TIFAS

Sistema de venta de entradas para shows en vivo. Evolución de la maqueta de la AE1 a una
**SPA en JavaScript Vanilla** que consume una **API REST en PHP + MySQL (PDO)**, con
arquitectura MVC desacoplada: el cliente y el servidor se comunican solo por HTTP asíncrono + JSON.

## Qué hace

- **Cartelera** con buscador en vivo y **ficha de evento** con tipos de entrada y stock.
- **Registro / inicio de sesión** (contraseñas con BCRYPT, sesión PHP).
- **Compra de entradas** (transacción atómica: stock + orden + tickets) y **Mis tickets**.
- **Ticket electrónico**: QR por entrada, **descarga en PDF** (una o todas), impresión y **envío por e-mail**.
- **Reseñas y valoraciones** (1–5 ★, "compra verificada"), **encuesta de satisfacción** al finalizar la compra y **soporte** (FAQ + formulario de contacto).
- **Panel de administración** (rol `admin`): **alta, edición, baja y listado de eventos** con sus tipos de entrada.

## Arquitectura de carpetas

```
Ticketshow/
├── config/
│   ├── conexion.php        # PDO Singleton (ERRMODE_EXCEPTION, utf8mb4)
│   ├── helpers.php         # responder() JSON + código HTTP, leerJson(), sesión segura
│   └── auth.php            # exigirLogin() → 401 · exigirRol('admin') → 403
├── models/                 # Acceso a datos: solo PDO Prepared Statements (:marcadores)
│   ├── UsuarioModel.php
│   ├── EventoModel.php
│   └── OrdenModel.php
├── api/                    # Controladores REST (JSON)
│   ├── eventos.php         # GET cartelera / detalle (público)
│   ├── registro.php  login.php  sesion.php  logout.php
│   ├── ordenes.php         # GET mis tickets · POST comprar (protegido)
│   ├── resenas.php  encuesta.php  email.php  soporte.php
│   └── admin_eventos.php   # CRUD de eventos (rol admin)
├── public/                 # Vista: SPA (único documento HTML)
│   ├── index.html          # esqueleto semántico (header, nav, main, footer)
│   ├── css/style.css
│   ├── vendor/             # qrcode.js + jsPDF (QR y PDF en el navegador)
│   └── js/
│       ├── app.js          # router por hash + vistas (DOM, sin innerHTML)
│       └── api.js          # cliente fetch() + async/await
├── legacy/                 # Versión multipágina de la AE1 (maqueta + localStorage). NO forma parte de la AE4
├── ticketshow.sql          # Esquema + datos iniciales (base completa)
├── ticketshow_extras.sql   # Solo las tablas nuevas, para una base ya importada
└── README.md
```

## Despliegue paso a paso (XAMPP)

1. Instalar [XAMPP](https://www.apachefriends.org/) e iniciar **Apache** y **MySQL** desde el panel.
2. Copiar la carpeta del proyecto a `C:\xampp\htdocs\Ticketshow` (Linux/macOS: `/opt/lampp/htdocs/Ticketshow`).
3. Crear la base de datos: abrir <http://localhost/phpmyadmin> → pestaña **Importar** → elegir
   `ticketshow.sql` → **Importar** (crea la base `ticketshow`, las tablas y datos de prueba).
3b. Si **ya tenías** la base importada de antes, no hace falta reimportar todo: importá solo `ticketshow_extras.sql`.
4. Revisar las credenciales de MySQL en `config/conexion.php` (XAMPP por defecto: usuario `root`, sin clave).
5. Abrir <http://localhost/Ticketshow/public/> (también <http://localhost/Ticketshow/>, que redirige).
6. Administrador de prueba: `admin@ticketshow.com` / `admin1234`. Un cliente se crea desde **Registrarme**.

> La SPA llama a la API con la ruta relativa `../api`, por eso `public/` y `api/` deben quedar
> hermanas dentro de la misma carpeta del proyecto.

## Endpoints

| Método | URL | Acceso | Códigos HTTP |
|---|---|---|---|
| GET | `/api/eventos.php` · `?id=` | público | 200 · 400 · 404 · 500 |
| POST | `/api/registro.php` | público | 201 · 400 · 409 · 500 |
| POST | `/api/login.php` | público | 200 · 400 · 401 · 429 · 500 |
| GET | `/api/sesion.php` | público | 200 |
| POST | `/api/logout.php` | público | 200 |
| GET / POST | `/api/ordenes.php` | sesión | 200 / 201 · 400 · 401 · 404 · 409 · 500 |
| GET / POST | `/api/resenas.php` (`?evento_id=`) | GET público · POST sesión | 200 / 201 · 400 · 401 · 404 · 409 · 500 |
| POST | `/api/encuesta.php` | sesión | 201 · 400 · 401 · 404 · 409 · 500 |
| POST | `/api/email.php` | sesión | 200 · 400 · 401 · 404 · 503 · 500 |
| POST | `/api/soporte.php` | público | 201 · 400 · 500 |
| GET / POST / PUT / PATCH / DELETE | `/api/admin_eventos.php` (`?id=`) | rol admin | 200 / 201 · 400 · 401 · 403 · 404 · 409 · 500 |

## Envío de tickets por e-mail (opcional)

`api/email.php` usa `mail()` de PHP. En XAMPP hay que configurar el envío o responderá 503
(el intento igual queda en la tabla `correos_enviados`). Opción con Gmail, en `C:\xampp\php\php.ini`:

```ini
[mail function]
SMTP = smtp.gmail.com
smtp_port = 587
sendmail_path = "\"C:\xampp\sendmail\sendmail.exe\" -t"
```

y en `C:\xampp\sendmail\sendmail.ini`: `smtp_server=smtp.gmail.com`, `smtp_port=587`, `auth_username`,
`auth_password` (una *contraseña de aplicación* de Google) y `force_sender`. Reiniciar Apache.
El destinatario es siempre el e-mail guardado en la compra, nunca uno enviado por el cliente.

> **Nota sobre `legacy/`:** conserva la maqueta multipágina de la AE1 solo como antecedente de
> trazabilidad (de maqueta estática a SPA). La aplicación de la AE4 **no la usa ni la carga**: vive en
> `public/`, `api/`, `models/` y `config/`. El código de `legacy/` no se evalúa en esta entrega.

## Seguridad (OWASP)

- **A03 Inyección**: PDO Prepared Statements con marcadores nombrados, sin concatenar SQL; en el
  front los datos del servidor se inyectan con `textContent`/`createElement`, nunca con `innerHTML`.
- **A02 Fallas criptográficas**: `password_hash()` BCRYPT, columna `VARCHAR(255)`, `password_verify()` en el login.
- **A01 / A07 Control de acceso y autenticación**: `$_SESSION` validada en cada endpoint protegido
  (`exigirLogin`, `exigirRol`), `session_regenerate_id(true)` tras el login y cookie `HttpOnly` + `SameSite`.
- **Límite de intentos de login**: máx. 5 fallos por email y 20 por IP cada 15 minutos (tabla `intentos_login`);
  superado el tope responde **429** con `Retry-After` sin verificar la contraseña.
- Los errores de BD van a `error_log`; al cliente solo llega un mensaje genérico (500).

## Accesibilidad

`:focus-visible` en todos los controles, enlace "Saltar al contenido", navegación por teclado con
elementos nativos (`<a>`, `<button>`), regiones `aria-live="polite"` para las respuestas de `fetch()`
y foco al título en cada cambio de vista.

## Calidad (ISO/IEC 25010)

Adecuación funcional (CRUD completo), eficiencia (JSON liviano, sin recargas), compatibilidad
(Front JS / API REST desacoplados), fiabilidad (try/catch de `PDOException` + códigos HTTP),
seguridad (BCRYPT, Prepared Statements, `$_SESSION`), usabilidad/accesibilidad y mantenibilidad (capas MVC).
