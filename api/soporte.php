<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../models/ComunicacionModel.php';

/**
 * POST /api/soporte.php   (público; si hay sesión se asocia al usuario)
 * Entrada: { "nombre", "email", "mensaje" (10-1000 caracteres) }
 * Salida:  201 { "id": n } | 400 { "errores": {campo: mensaje} } | 500
 */

exigirMetodo('POST');
$d = leerJson();

$nombre  = trim((string) ($d['nombre'] ?? ''));
$email   = strtolower(trim((string) ($d['email'] ?? '')));
$mensaje = trim((string) ($d['mensaje'] ?? ''));

$errores = [];
if ($nombre === '' || mb_strlen($nombre) > 100) { $errores['nombre'] = 'El nombre es obligatorio (máx. 100 caracteres).'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) { $errores['email'] = 'Ingresá un email válido.'; }
if (mb_strlen($mensaje) < 10 || mb_strlen($mensaje) > 1000) { $errores['mensaje'] = 'El mensaje debe tener entre 10 y 1000 caracteres.'; }
if ($errores) {
    responder(400, ['errores' => $errores]);
}

try {
    iniciarSesionSegura();
    $usuarioId = empty($_SESSION['usuario_id']) ? null : (int) $_SESSION['usuario_id'];

    $id = (new ComunicacionModel(Conexion::getInstancia()))->guardarConsulta($usuarioId, $nombre, $email, $mensaje);
    responder(201, ['id' => $id]);
} catch (PDOException $e) {
    error_log('[soporte] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
