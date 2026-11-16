<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../models/UsuarioModel.php';

/**
 * POST /api/registro.php
 * Entrada:  { "email", "password", "nombre" (obligatorios),
 *             "apellido", "pais", "telefono", "tipo_doc", "documento",
 *             "nacimiento" (YYYY-MM-DD), "genero", "newsletter" (opcionales) }
 * Salida:   201 { "id": n } | 400 { "errores": {campo: mensaje} }
 *           409 email ya registrado | 500 error interno
 */

exigirMetodo('POST');

$d = leerJson();

/** Texto opcional: recortado, o null si viene vacío. */
function textoOpcional(array $d, string $campo): ?string
{
    $v = trim((string) ($d[$campo] ?? ''));
    return $v === '' ? null : $v;
}

$email      = strtolower(trim((string) ($d['email'] ?? '')));
$password   = (string) ($d['password'] ?? '');
$nombre     = trim((string) ($d['nombre'] ?? ''));
$apellido   = textoOpcional($d, 'apellido');
$pais       = textoOpcional($d, 'pais');
$telefono   = textoOpcional($d, 'telefono');
$tipoDoc    = textoOpcional($d, 'tipo_doc');
$documento  = textoOpcional($d, 'documento');
$nacimiento = textoOpcional($d, 'nacimiento');
$genero     = textoOpcional($d, 'genero');
$newsletter = !empty($d['newsletter']) ? 1 : 0;

// ---- Validación de entrada (si algo falla: 400 con el detalle por campo) ----
$errores = [];

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 120) {
    $errores['email'] = 'Ingresá un email válido.';
}
// BCRYPT solo usa los primeros 72 bytes, por eso ese es el máximo.
if (strlen($password) < 8 || strlen($password) > 72) {
    $errores['password'] = 'La contraseña debe tener entre 8 y 72 caracteres.';
}
if ($nombre === '' || mb_strlen($nombre) > 60) {
    $errores['nombre'] = 'El nombre es obligatorio (máx. 60 caracteres).';
}
if ($apellido !== null && mb_strlen($apellido) > 60) {
    $errores['apellido'] = 'El apellido admite hasta 60 caracteres.';
}
if ($pais !== null && mb_strlen($pais) > 60) {
    $errores['pais'] = 'El país admite hasta 60 caracteres.';
}
if ($telefono !== null && !preg_match('/^[0-9+\-\s()]{6,30}$/', $telefono)) {
    $errores['telefono'] = 'Teléfono inválido.';
}
if ($tipoDoc !== null && mb_strlen($tipoDoc) > 20) {
    $errores['tipo_doc'] = 'Tipo de documento inválido.';
}
if ($documento !== null && !preg_match('/^[A-Za-z0-9.\-]{4,30}$/', $documento)) {
    $errores['documento'] = 'Documento inválido.';
}
if ($nacimiento !== null) {
    $fecha = DateTime::createFromFormat('Y-m-d', $nacimiento);
    $valida = $fecha !== false && $fecha->format('Y-m-d') === $nacimiento && $fecha <= new DateTime('today');
    if (!$valida) {
        $errores['nacimiento'] = 'Fecha de nacimiento inválida (formato AAAA-MM-DD).';
    }
}
if ($genero !== null && mb_strlen($genero) > 30) {
    $errores['genero'] = 'Género inválido.';
}

if ($errores) {
    responder(400, ['errores' => $errores]);
}

try {
    $modelo = new UsuarioModel(Conexion::getInstancia());

    if ($modelo->buscarPorEmail($email) !== null) {
        responder(409, ['error' => 'Ese email ya está registrado.']);
    }

    $id = $modelo->crear([
        'email'         => $email,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT), // BCRYPT, nunca la clave en texto plano
        'nombre'        => $nombre,
        'apellido'      => $apellido,
        'pais'          => $pais,
        'telefono'      => $telefono,
        'tipo_doc'      => $tipoDoc,
        'documento'     => $documento,
        'nacimiento'    => $nacimiento,
        'genero'        => $genero,
        'newsletter'    => $newsletter,
    ]);

    responder(201, ['id' => $id]);
} catch (PDOException $e) {
    // 23000 = violación de UNIQUE: dos registros simultáneos con el mismo email.
    if ($e->getCode() === '23000') {
        responder(409, ['error' => 'Ese email ya está registrado.']);
    }
    error_log('[registro] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
