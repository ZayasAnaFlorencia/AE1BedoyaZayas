<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../models/UsuarioModel.php';
require_once __DIR__ . '/../models/IntentoLoginModel.php';

/**
 * POST /api/login.php
 * Entrada:  { "email": "...", "password": "..." }
 * Salida:   200 { "usuario": { id, email, nombre, rol } }
 *           400 datos faltantes | 401 credenciales inválidas
 *           429 demasiados intentos fallidos (cabecera Retry-After) | 500 error interno
 *
 * Límite de fuerza bruta (OWASP A07): en una ventana de 15 minutos se admiten hasta
 * 5 fallos por email y 20 por IP. Superado el tope se responde 429 SIN verificar la
 * contraseña (aunque sea la correcta) hasta que venza la ventana. Un login correcto
 * borra los fallos de ese email.
 */

const MAX_FALLOS_EMAIL = 5;
const MAX_FALLOS_IP    = 20;
const VENTANA_MINUTOS  = 15;

// Hash BCRYPT de relleno: se verifica igual cuando el email no existe, para que
// la respuesta tarde parecido y no se pueda adivinar qué emails están registrados.
const HASH_RELLENO = '$2y$10$4eOMI6b94lvw0szqSiUP9eKpgZvbhAlJf437xPLi36yn4hlLe60cO';

exigirMetodo('POST');

$datos    = leerJson();
$email    = strtolower(trim((string) ($datos['email'] ?? '')));
$password = (string) ($datos['password'] ?? '');

if ($email === '' || $password === '') {
    responder(400, ['error' => 'Email y contraseña son obligatorios.']);
}

try {
    $pdo       = Conexion::getInstancia();
    $intentos  = new IntentoLoginModel($pdo);
    $ip        = (string) ($_SERVER['REMOTE_ADDR'] ?? '');   // no se confía en X-Forwarded-For
    $emailClave = mb_substr($email, 0, 120);

    // 1) ¿Está bloqueado? Se decide ANTES de mirar la contraseña.
    [$fallosEmail, $esperaEmail] = $intentos->fallosPorEmail($emailClave, VENTANA_MINUTOS);
    [$fallosIp, $esperaIp]       = $intentos->fallosPorIp($ip, VENTANA_MINUTOS);
    if ($fallosEmail >= MAX_FALLOS_EMAIL || $fallosIp >= MAX_FALLOS_IP) {
        $espera = max($fallosEmail >= MAX_FALLOS_EMAIL ? $esperaEmail : 0, $fallosIp >= MAX_FALLOS_IP ? $esperaIp : 0);
        header('Retry-After: ' . $espera);
        responder(429, ['error' => 'Demasiados intentos fallidos. Probá de nuevo en ' . max(1, (int) ceil($espera / 60)) . ' minuto(s).']);
    }

    $modelo  = new UsuarioModel($pdo);
    $usuario = $modelo->buscarPorEmail($email);

    // password_verify compara la clave contra el hash BCRYPT guardado en la BD.
    $hash = $usuario['password_hash'] ?? HASH_RELLENO;
    $ok   = password_verify($password, $hash);

    if ($usuario === null || !$ok) {
        // Se cuenta el fallo exista o no el email (mismo comportamiento: no se filtra qué cuentas existen).
        $intentos->registrarFallo($emailClave, $ip);
        // Mensaje genérico: no se aclara si falló el email o la clave.
        responder(401, ['error' => 'Credenciales inválidas.']);
    }

    $intentos->limpiar($emailClave); // login correcto: se perdonan los fallos anteriores

    iniciarSesionSegura();
    session_regenerate_id(true); // nuevo id de sesión tras el login: previene session fixation

    $_SESSION['usuario_id'] = (int) $usuario['id'];
    $_SESSION['rol']        = $usuario['rol'];
    $_SESSION['nombre']     = $usuario['nombre'];

    responder(200, [
        'usuario' => [
            'id'     => (int) $usuario['id'],
            'email'  => $usuario['email'],
            'nombre' => $usuario['nombre'],
            'rol'    => $usuario['rol'],
        ],
    ]);
} catch (PDOException $e) {
    error_log('[login] ' . $e->getMessage()); // el detalle queda en el log del servidor
    responder(500, ['error' => 'Error interno del servidor.']);
}
