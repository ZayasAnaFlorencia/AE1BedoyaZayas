<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/ResenaModel.php';
require_once __DIR__ . '/../models/EventoModel.php';

/**
 * GET  /api/resenas.php?evento_id=3   (público)
 *      200 { "resumen": { total, promedio }, "resenas": [ { id, puntaje, comentario, verificada, creada_en, nombre } ] }
 *      400 evento_id inválido | 404 el evento no existe | 500
 * POST /api/resenas.php               (requiere sesión)
 *      Entrada: { "evento_id", "puntaje" (1-5), "comentario"? (máx. 500) }
 *      201 { "id": n, "verificada": bool } | 400 datos inválidos | 401 sin sesión
 *      404 el evento no existe | 409 ya valoraste este show | 500
 */

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo !== 'GET' && $metodo !== 'POST') {
    header('Allow: GET, POST');
    responder(405, ['error' => 'Método no permitido.']);
}

try {
    $pdo     = Conexion::getInstancia();
    $resenas = new ResenaModel($pdo);
    $eventos = new EventoModel($pdo);

    if ($metodo === 'GET') {
        $eventoId = filter_var($_GET['evento_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($eventoId === false) {
            responder(400, ['error' => 'El id del evento es inválido.']);
        }
        if ($eventos->buscarPorId($eventoId) === null) {
            responder(404, ['error' => 'El evento no existe.']);
        }
        responder(200, [
            'resumen' => $resenas->resumen($eventoId),
            'resenas' => $resenas->listarPorEvento($eventoId),
        ]);
    }

    // ---- POST ----
    $usuarioId = exigirLogin();
    $d = leerJson();

    $eventoId   = filter_var($d['evento_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $puntaje    = filter_var($d['puntaje'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
    $comentario = trim((string) ($d['comentario'] ?? ''));

    $errores = [];
    if ($eventoId === false) { $errores['evento_id'] = 'El id del evento es inválido.'; }
    if ($puntaje === false)  { $errores['puntaje'] = 'Elegí un puntaje de 1 a 5.'; }
    if (mb_strlen($comentario) > 500) { $errores['comentario'] = 'El comentario admite hasta 500 caracteres.'; }
    if ($errores) {
        responder(400, ['errores' => $errores]);
    }

    if ($eventos->buscarPorId($eventoId) === null) {
        responder(404, ['error' => 'El evento no existe.']);
    }

    $verificada = $resenas->compro($usuarioId, $eventoId);
    $id = $resenas->crear($eventoId, $usuarioId, $puntaje, $comentario === '' ? null : $comentario, $verificada);
    responder(201, ['id' => $id, 'verificada' => $verificada]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') { // UNIQUE (evento_id, usuario_id)
        responder(409, ['error' => 'Ya valoraste este show.']);
    }
    error_log('[resenas] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
