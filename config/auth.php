<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

/**
 * Control de acceso (OWASP A01 / A07) para endpoints protegidos.
 * Si no se cumple la condición, corta la ejecución con el código HTTP que corresponde.
 */

/**
 * Exige sesión activa. Sin sesión: 401 Unauthorized.
 * Devuelve el id del usuario logueado.
 */
function exigirLogin(): int
{
    iniciarSesionSegura();

    if (empty($_SESSION['usuario_id'])) {
        responder(401, ['error' => 'Necesitás iniciar sesión.']);
    }
    return (int) $_SESSION['usuario_id'];
}

/**
 * Exige sesión activa Y un rol determinado (ej. 'admin').
 * Sin sesión: 401. Con sesión pero sin permiso: 403 Forbidden.
 */
function exigirRol(string $rol): int
{
    $id = exigirLogin();

    if (($_SESSION['rol'] ?? '') !== $rol) {
        responder(403, ['error' => 'No tenés permisos para esta acción.']);
    }
    return $id;
}
