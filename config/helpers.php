<?php
declare(strict_types=1);

/**
 * Funciones comunes a todos los endpoints de /api.
 * Cada endpoint emite igualmente su propio header Content-Type.
 */

/** Responde en JSON con el código HTTP indicado y corta la ejecución. */
function responder(int $codigo, array $datos): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Acepta solo el método HTTP indicado; si no, responde 405. */
function exigirMetodo(string $metodo): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $metodo) {
        header('Allow: ' . $metodo);
        responder(405, ['error' => 'Método no permitido.']);
    }
}

/** Lee el cuerpo de la petición como JSON; si es inválido responde 400. */
function leerJson(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responder(400, ['error' => 'El cuerpo debe ser un JSON válido.']);
    }
    return $datos;
}

/** Inicia la sesión con cookie HttpOnly y SameSite (mitiga robo de cookie y CSRF básico). */
function iniciarSesionSegura(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}
