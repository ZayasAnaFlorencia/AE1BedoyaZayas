<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../models/UsuarioModel.php';

/**
 * POST /api/login.php
 * Entrada:  { "email": "...", "password": "..." }
 * Salida:   200 { "usuario": { id, email, nombre, rol } }
 *           400 datos faltantes | 401 credenciales inválidas | 500 error interno
 */

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
    $modelo  = new UsuarioModel(Conexion::getInstancia());
    $usuario = $modelo->buscarPorEmail($email);

    // password_verify compara la clave contra el hash BCRYPT guardado en la BD.
    $hash = $usuario['password_hash'] ?? HASH_RELLENO;
    $ok   = password_verify($password, $hash);

    if ($usuario === null || !$ok) {
        // Mensaje genérico: no se aclara si falló el email o la clave.
        responder(401, ['error' => 'Credenciales inválidas.']);
    }

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
