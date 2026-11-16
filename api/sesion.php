<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/helpers.php';

/**
 * GET /api/sesion.php
 * Le dice a la SPA, al cargar, si hay un usuario logueado.
 *   200 { "autenticado": true,  "usuario": { id, nombre, rol } }
 *   200 { "autenticado": false }
 * Devuelve 200 en ambos casos a propósito: "no hay sesión" es un estado normal
 * y no un error (así la consola del navegador queda limpia).
 */

exigirMetodo('GET');
iniciarSesionSegura();

if (empty($_SESSION['usuario_id'])) {
    responder(200, ['autenticado' => false]);
}

responder(200, [
    'autenticado' => true,
    'usuario'     => [
        'id'     => (int) $_SESSION['usuario_id'],
        'nombre' => $_SESSION['nombre'],
        'rol'    => $_SESSION['rol'],
    ],
]);
