# TicketShow — AE4 · TIFAS

Sistema de venta de entradas para shows en vivo. Evolución de la maqueta de la AE1 a una
**SPA en JavaScript Vanilla** que consume una **API REST en PHP + MySQL (PDO)**, con
arquitectura MVC desacoplada: el cliente y el servidor se comunican solo por HTTP asíncrono + JSON.

## Qué hace

- **Cartelera** con buscador en vivo y **ficha de evento** con tipos de entrada y stock.
- **Registro / inicio de sesión** (contraseñas con BCRYPT, sesión PHP).
- **Compra de entradas** (transacción atómica: stock + orden + tickets) y **Mis tickets**.
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
│   └── admin_eventos.php   # CRUD de eventos (rol admin)
├── public/                 # Vista: SPA (único documento HTML)
│   ├── index.html          # esqueleto semántico (header, nav, main, footer)
│   ├── css/style.css
│   └── js/
│       ├── app.js          # router por hash + vistas (DOM, sin innerHTML)
│       └── api.js          # cliente fetch() + async/await
├── legacy/                 # Versión multipágina anterior (localStorage), solo de referencia
├── ticketshow.sql          # Esquema + datos iniciales
└── README.md
```

## Despliegue paso a paso (XAMPP)

1. Instalar [XAMPP](https://www.apachefriends.org/) e iniciar **Apache** y **MySQL** desde el panel.
2. Copiar la carpeta del proyecto a `C:\xampp\htdocs\Ticketshow` (Linux/macOS: `/opt/lampp/htdocs/Ticketshow`).
3. Crear la base de datos: abrir <http://localhost/phpmyadmin> → pestaña **Importar** → elegir
   `ticketshow.sql` → **Importar** (crea la base `ticketshow`, las tablas y datos de prueba).
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
| POST | `/api/login.php` | público | 200 · 400 · 401 · 500 |
| GET | `/api/sesion.php` | público | 200 |
| POST | `/api/logout.php` | público | 200 |
| GET / POST | `/api/ordenes.php` | sesión | 200 / 201 · 400 · 401 · 404 · 409 · 500 |
| GET / POST / PUT / PATCH / DELETE | `/api/admin_eventos.php` (`?id=`) | rol admin | 200 / 201 · 400 · 401 · 403 · 404 · 409 · 500 |

## Seguridad (OWASP)

- **A03 Inyección**: PDO Prepared Statements con marcadores nombrados, sin concatenar SQL; en el
  front los datos del servidor se inyectan con `textContent`/`createElement`, nunca con `innerHTML`.
- **A02 Fallas criptográficas**: `password_hash()` BCRYPT, columna `VARCHAR(255)`, `password_verify()` en el login.
- **A01 / A07 Control de acceso y autenticación**: `$_SESSION` validada en cada endpoint protegido
  (`exigirLogin`, `exigirRol`), `session_regenerate_id(true)` tras el login y cookie `HttpOnly` + `SameSite`.
- Los errores de BD van a `error_log`; al cliente solo llega un mensaje genérico (500).

## Accesibilidad

`:focus-visible` en todos los controles, enlace "Saltar al contenido", navegación por teclado con
elementos nativos (`<a>`, `<button>`), regiones `aria-live="polite"` para las respuestas de `fetch()`
y foco al título en cada cambio de vista.

## Calidad (ISO/IEC 25010)

Adecuación funcional (CRUD completo), eficiencia (JSON liviano, sin recargas), compatibilidad
(Front JS / API REST desacoplados), fiabilidad (try/catch de `PDOException` + códigos HTTP),
seguridad (BCRYPT, Prepared Statements, `$_SESSION`), usabilidad/accesibilidad y mantenibilidad (capas MVC).
