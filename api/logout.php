<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/helpers.php';

/**
 * POST /api/logout.php
 * Destruye la sesión en el servidor y borra la cookie del navegador.
 *   200 { "ok": true }
 * Es idempotente: si no había sesión, también responde 200.
 */

exigirMetodo('POST');
iniciarSesionSegura();

$_SESSION = [];                       // vacía los datos de la sesión

if (ini_get('session.use_cookies')) { // expira la cookie PHPSESSID en el navegador
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 3600,
        'path'     => $p['path'],
        'domain'   => $p['domain'],
        'secure'   => $p['secure'],
        'httponly' => $p['httponly'],
        'samesite' => 'Lax',
    ]);
}

session_destroy();                    // elimina la sesión del servidor

responder(200, ['ok' => true]);
