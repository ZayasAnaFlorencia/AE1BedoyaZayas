<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/EventoModel.php';

/**
 * CRUD de eventos (ISO 25010) — endpoint protegido (rol admin).
 *
 * GET    /api/admin_eventos.php           → listado completo (activos e inactivos)
 * GET    /api/admin_eventos.php?id=3      → detalle + tipos (con stock/vendidas)
 * POST   /api/admin_eventos.php           → crear evento + entradas
 * PUT    /api/admin_eventos.php?id=3      → actualizar evento + sincronizar entradas
 * DELETE /api/admin_eventos.php?id=3      → baja lógica (activo = 0)
 *
 * PATCH  /api/admin_eventos.php?stock=1   → body { tipo_entrada_id, stock } (ajuste de stock)
 *
 * Códigos: 200/201 ok | 400 validación | 401 sin sesión | 403 sin rol admin
 *          404 no existe | 409 conflicto stock | 500 error interno
 */

exigirRol('admin');

$metodo = $_SERVER['REQUEST_METHOD'];
$modelo = null;

try {
    $modelo = new EventoModel(Conexion::getInstancia());
} catch (PDOException $e) {
    error_log('[admin_eventos] conexion: ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}

/** Valida y normaliza el cuerpo de alta/edición. */
function validarPayloadEvento(array $d): array
{
    $errores = [];

    $titulo = trim((string) ($d['titulo'] ?? ''));
    if ($titulo === '' || mb_strlen($titulo) > 120) {
        $errores['titulo'] = 'El título es obligatorio (máx. 120 caracteres).';
    }

    $imagen = trim((string) ($d['imagen_url'] ?? $d['imagen'] ?? ''));
    if ($imagen === '' || !preg_match('#^https?://#i', $imagen)) {
        $errores['imagen_url'] = 'La imagen debe ser una URL http(s).';
    }

    $fecha = $d['fecha'] ?? null;
    if ($fecha === '' || $fecha === null) {
        $fecha = null;
    } else {
        $dt = DateTime::createFromFormat('Y-m-d', (string) $fecha);
        if ($dt === false || $dt->format('Y-m-d') !== $fecha) {
            $errores['fecha'] = 'Fecha inválida (AAAA-MM-DD).';
        }
    }

    $lugar = trim((string) ($d['lugar'] ?? ''));
    if (mb_strlen($lugar) > 150) {
        $errores['lugar'] = 'El lugar admite hasta 150 caracteres.';
    }

    $descripcion = trim((string) ($d['descripcion'] ?? ''));
    if ($descripcion === '') {
        $descripcion = 'Próximamente más información.';
    }

    $artista = trim((string) ($d['artista'] ?? ''));
    $instagram = trim((string) ($d['instagram'] ?? ''));
    if ($instagram !== '' && !preg_match('#^https?://#i', $instagram)) {
        $errores['instagram'] = 'El enlace de red social debe ser una URL http(s).';
    }

    $activo = array_key_exists('activo', $d) ? (bool) $d['activo'] : true;

    $entradasIn = $d['entradas'] ?? null;
    if (!is_array($entradasIn) || count($entradasIn) < 1) {
        $errores['entradas'] = 'Agregá al menos un tipo de entrada.';
        $entradas = [];
    } else {
        $entradas = [];
        foreach ($entradasIn as $i => $e) {
            if (!is_array($e)) {
                $errores["entradas.$i"] = 'Formato de entrada inválido.';
                continue;
            }
            $nombre = trim((string) ($e['nombre'] ?? ''));
            $precio = filter_var($e['precio'] ?? null, FILTER_VALIDATE_FLOAT);
            $stock  = filter_var($e['stock'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            $idTipo = isset($e['id']) ? filter_var($e['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : null;

            if ($nombre === '') {
                $errores["entradas.$i.nombre"] = 'Cada tipo necesita un nombre.';
            }
            if ($precio === false || $precio < 0) {
                $errores["entradas.$i.precio"] = "Precio inválido en \"$nombre\".";
            }
            if ($stock === false) {
                $errores["entradas.$i.stock"] = "Stock inválido en \"$nombre\".";
            }

            $item = [
                'nombre' => $nombre,
                'precio' => (float) $precio,
                'stock'  => (int) $stock,
            ];
            if ($idTipo !== false && $idTipo !== null) {
                $item['id'] = (int) $idTipo;
            }
            $entradas[] = $item;
        }
    }

    if ($errores) {
        responder(400, ['errores' => $errores]);
    }

    return [
        'datos' => [
            'titulo'      => $titulo,
            'fecha'       => $fecha,
            'lugar'       => $lugar !== '' ? $lugar : null,
            'descripcion' => $descripcion,
            'imagen_url'  => $imagen,
            'artista'     => $artista !== '' ? $artista : null,
            'instagram'   => $instagram !== '' ? $instagram : null,
            'activo'      => $activo,
        ],
        'entradas' => $entradas,
    ];
}

try {
    // ---- Ajuste de stock (PATCH) ----
    if ($metodo === 'PATCH') {
        $d = leerJson();
        $tipoId = filter_var($d['tipo_entrada_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $stock  = filter_var($d['stock'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
        if ($tipoId === false || $stock === false) {
            responder(400, ['error' => 'tipo_entrada_id y stock (entero ≥ 0) son obligatorios.']);
        }
        if (!$modelo->actualizarStockTipo($tipoId, $stock)) {
            responder(409, ['error' => 'No se pudo actualizar el stock (¿menor a las vendidas o tipo inexistente?).']);
        }
        responder(200, ['ok' => true, 'tipo_entrada_id' => $tipoId, 'stock' => $stock]);
    }

    // ---- Listado / detalle (GET) ----
    if ($metodo === 'GET') {
        if (!isset($_GET['id'])) {
            responder(200, ['eventos' => $modelo->listarTodos()]);
        }
        $id = filter_var($_GET['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            responder(400, ['error' => 'El id del evento es inválido.']);
        }
        $evento = $modelo->buscarPorIdAdmin($id);
        if ($evento === null) {
            responder(404, ['error' => 'El evento no existe.']);
        }
        $evento['entradas'] = $modelo->entradasAdminDeEvento($id);
        responder(200, ['evento' => $evento]);
    }

    // ---- CREATE (POST) ----
    if ($metodo === 'POST') {
        $payload = validarPayloadEvento(leerJson());
        $nuevoId = $modelo->crear($payload['datos'], $payload['entradas']);
        $evento = $modelo->buscarPorIdAdmin($nuevoId);
        $evento['entradas'] = $modelo->entradasAdminDeEvento($nuevoId);
        responder(201, ['evento' => $evento]);
    }

    // ---- UPDATE (PUT) ----
    if ($metodo === 'PUT') {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            responder(400, ['error' => 'Indicá el id del evento a actualizar (?id=).']);
        }
        $payload = validarPayloadEvento(leerJson());
        try {
            $ok = $modelo->actualizar($id, $payload['datos'], $payload['entradas']);
        } catch (RuntimeException $e) {
            responder(409, ['error' => $e->getMessage()]);
        }
        if (!$ok) {
            responder(404, ['error' => 'El evento no existe.']);
        }
        $evento = $modelo->buscarPorIdAdmin($id);
        $evento['entradas'] = $modelo->entradasAdminDeEvento($id);
        responder(200, ['evento' => $evento]);
    }

    // ---- DELETE (baja lógica) ----
    if ($metodo === 'DELETE') {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            responder(400, ['error' => 'Indicá el id del evento a eliminar (?id=).']);
        }
        if (!$modelo->eliminar($id)) {
            responder(404, ['error' => 'El evento no existe o ya estaba dado de baja.']);
        }
        responder(200, ['ok' => true, 'id' => $id]);
    }

    header('Allow: GET, POST, PUT, PATCH, DELETE');
    responder(405, ['error' => 'Método no permitido.']);
} catch (PDOException $e) {
    error_log('[admin_eventos] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
