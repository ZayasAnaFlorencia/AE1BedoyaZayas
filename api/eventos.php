<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../models/EventoModel.php';

/**
 * GET /api/eventos.php            → cartelera
 *     200 { "eventos": [ { id, titulo, fecha, lugar, imagen_url, artista, precio_desde, disponibles } ] }
 * GET /api/eventos.php?id=3       → detalle con tipos de entrada
 *     200 { "evento": { ..., "entradas": [ { id, nombre, precio, disponibles } ] } }
 *     400 id inválido | 404 evento inexistente | 500 error interno
 * Es un endpoint público: no requiere sesión.
 */

exigirMetodo('GET');

try {
    $modelo = new EventoModel(Conexion::getInstancia());

    // Sin parámetro id: se devuelve la cartelera.
    if (!isset($_GET['id'])) {
        responder(200, ['eventos' => $modelo->listarVigentes()]);
    }

    // Con id: se valida que sea un entero positivo antes de tocar la BD.
    $id = filter_var($_GET['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) {
        responder(400, ['error' => 'El id del evento es inválido.']);
    }

    $evento = $modelo->buscarPorId($id);
    if ($evento === null) {
        responder(404, ['error' => 'El evento no existe.']);
    }

    $evento['entradas'] = $modelo->entradasDeEvento($id);
    responder(200, ['evento' => $evento]);
} catch (PDOException $e) {
    error_log('[eventos] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
