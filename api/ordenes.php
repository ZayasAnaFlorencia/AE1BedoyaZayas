<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/OrdenModel.php';

/**
 * Endpoint PROTEGIDO: sin sesión activa responde 401.
 *
 * GET  /api/ordenes.php  → "Mis entradas"
 *      200 { "ordenes": [ { codigo, evento, fecha, lugar, tipo_entrada, cantidad,
 *                           precio_unitario, total, estado, creada_en, tickets: [...] } ] }
 *
 * POST /api/ordenes.php  → comprar entradas
 *      Entrada: { "tipo_entrada_id", "cantidad" (1-8), "medio_pago",
 *                 "cliente_nombre", "cliente_email",
 *                 "cliente_telefono"?, "cliente_direccion"? }
 *      201 { "orden": { codigo, cantidad, precio_unitario, total, estado, tickets: [...] } }
 *      400 datos inválidos | 401 sin sesión | 404 tipo de entrada inexistente
 *      409 sin stock / evento finalizado | 500 error interno
 */

$usuarioId = exigirLogin(); // corta con 401 si no hay sesión

$metodo = $_SERVER['REQUEST_METHOD'];
if ($metodo !== 'GET' && $metodo !== 'POST') {
    header('Allow: GET, POST');
    responder(405, ['error' => 'Método no permitido.']);
}

try {
    $modelo = new OrdenModel(Conexion::getInstancia());

    if ($metodo === 'GET') {
        responder(200, ['ordenes' => $modelo->listarPorUsuario($usuarioId)]);
    }

    // ---- POST: validación de entrada ----
    $d = leerJson();

    $tipoId   = filter_var($d['tipo_entrada_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $cantidad = filter_var($d['cantidad'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 8]]);
    $medio    = trim((string) ($d['medio_pago'] ?? ''));
    $nombre   = trim((string) ($d['cliente_nombre'] ?? ''));
    $email    = strtolower(trim((string) ($d['cliente_email'] ?? '')));
    $telefono = trim((string) ($d['cliente_telefono'] ?? ''));
    $direccion = trim((string) ($d['cliente_direccion'] ?? ''));

    $errores = [];
    if ($tipoId === false)   { $errores['tipo_entrada_id'] = 'Elegí un tipo de entrada válido.'; }
    if ($cantidad === false) { $errores['cantidad'] = 'La cantidad debe ser entre 1 y 8.'; }
    if ($medio === '' || mb_strlen($medio) > 20) { $errores['medio_pago'] = 'Elegí un medio de pago.'; }
    if ($nombre === '' || mb_strlen($nombre) > 100) { $errores['cliente_nombre'] = 'El nombre es obligatorio (máx. 100 caracteres).'; }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) { $errores['cliente_email'] = 'Ingresá un email válido.'; }
    if ($telefono !== '' && !preg_match('/^[0-9+\-\s()]{6,30}$/', $telefono)) { $errores['cliente_telefono'] = 'Teléfono inválido.'; }
    if (mb_strlen($direccion) > 150) { $errores['cliente_direccion'] = 'La dirección admite hasta 150 caracteres.'; }

    if ($errores) {
        responder(400, ['errores' => $errores]);
    }

    $orden = $modelo->comprar($usuarioId, [
        'tipo_entrada_id'   => $tipoId,
        'cantidad'          => $cantidad,
        'medio_pago'        => $medio,
        'cliente_nombre'    => $nombre,
        'cliente_email'     => $email,
        'cliente_telefono'  => $telefono === '' ? null : $telefono,
        'cliente_direccion' => $direccion === '' ? null : $direccion,
    ]);

    responder(201, ['orden' => $orden]);
} catch (ReglaNegocioException $e) {
    responder($e->http, ['error' => $e->getMessage()]);
} catch (PDOException $e) {
    error_log('[ordenes] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
