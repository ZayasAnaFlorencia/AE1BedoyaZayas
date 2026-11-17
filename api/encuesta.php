<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/OrdenModel.php';
require_once __DIR__ . '/../models/ComunicacionModel.php';

/**
 * POST /api/encuesta.php   (requiere sesión)
 * Entrada: { "orden_codigo": "ORD-XXXXXX", "puntaje" (1-5), "comentario"? (máx. 500) }
 * Salida:  201 { "ok": true } | 400 datos inválidos | 401 sin sesión
 *          404 la orden no existe o no es tuya | 409 ya respondiste la encuesta | 500
 */

exigirMetodo('POST');
$usuarioId = exigirLogin();
$d = leerJson();

$codigo     = trim((string) ($d['orden_codigo'] ?? ''));
$puntaje    = filter_var($d['puntaje'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
$comentario = trim((string) ($d['comentario'] ?? ''));

$errores = [];
if ($codigo === '' || mb_strlen($codigo) > 20) { $errores['orden_codigo'] = 'Código de orden inválido.'; }
if ($puntaje === false) { $errores['puntaje'] = 'Elegí un puntaje de 1 a 5.'; }
if (mb_strlen($comentario) > 500) { $errores['comentario'] = 'El comentario admite hasta 500 caracteres.'; }
if ($errores) {
    responder(400, ['errores' => $errores]);
}

try {
    $pdo = Conexion::getInstancia();
    // La orden se busca con el usuario de la SESIÓN: nadie responde por compras ajenas.
    $orden = (new OrdenModel($pdo))->buscarPorCodigo($usuarioId, $codigo);
    if ($orden === null) {
        responder(404, ['error' => 'La compra no existe.']);
    }

    (new ComunicacionModel($pdo))->guardarEncuesta($orden['id'], $usuarioId, $puntaje, $comentario === '' ? null : $comentario);
    responder(201, ['ok' => true]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') { // UNIQUE (orden_id)
        responder(409, ['error' => 'Ya respondiste la encuesta de esta compra.']);
    }
    error_log('[encuesta] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
