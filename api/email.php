<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/conexion.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../models/OrdenModel.php';
require_once __DIR__ . '/../models/ComunicacionModel.php';

/**
 * POST /api/email.php   (requiere sesión)
 * Envía por e-mail los códigos de los tickets de una compra propia.
 * Entrada: { "orden_codigo": "ORD-XXXXXX" }
 * Salida:  200 { "ok": true, "destinatario": "..." }
 *          400 código inválido | 401 sin sesión | 404 la compra no existe o no es tuya
 *          503 el servidor no pudo enviar el correo | 500 error interno
 *
 * El destinatario sale SIEMPRE de la orden guardada en la BD (nunca del cliente), así el
 * endpoint no sirve para mandar correo a terceros ni permite inyección de cabeceras.
 * Cada intento queda registrado en `correos_enviados`.
 *
 * Nota XAMPP: mail() solo funciona si configurás sendmail/SMTP en php.ini
 * (ver README). Sin eso responde 503 y queda registrado como "fallido".
 */

exigirMetodo('POST');
$usuarioId = exigirLogin();
$d = leerJson();

$codigo = trim((string) ($d['orden_codigo'] ?? ''));
if ($codigo === '' || mb_strlen($codigo) > 20) {
    responder(400, ['errores' => ['orden_codigo' => 'Código de orden inválido.']]);
}

/** Quita saltos de línea (evita inyección de cabeceras en asunto/nombre). */
function sinSaltos(string $s): string
{
    return trim(preg_replace('/[\r\n]+/', ' ', $s));
}

try {
    $pdo   = Conexion::getInstancia();
    $orden = (new OrdenModel($pdo))->buscarPorCodigo($usuarioId, $codigo);
    if ($orden === null) {
        responder(404, ['error' => 'La compra no existe.']);
    }

    $destino = $orden['cliente_email'];
    $asunto  = 'Tus entradas para ' . sinSaltos($orden['evento']);
    $lineas  = [
        'Hola ' . sinSaltos($orden['cliente_nombre']) . ',',
        '',
        '¡Gracias por tu compra en TicketShow!',
        '',
        'Show:    ' . $orden['evento'],
        'Fecha:   ' . ($orden['fecha'] ?? 'A confirmar'),
        'Lugar:   ' . ($orden['lugar'] ?? 'A confirmar'),
        'Entrada: ' . $orden['tipo_entrada'] . ' × ' . $orden['cantidad'],
        'Compra:  ' . $orden['codigo'],
        '',
        'Tus códigos (uno por persona):',
    ];
    foreach ($orden['tickets'] as $t) {
        $lineas[] = '  • ' . $t;
    }
    $lineas[] = '';
    $lineas[] = 'Ingresá a "Mis tickets" para ver el QR y descargar el PDF.';

    $cabeceras = "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nFrom: TicketShow <no-reply@ticketshow.local>";
    $asuntoMime = '=?UTF-8?B?' . base64_encode($asunto) . '?=';

    $enviado = @mail($destino, $asuntoMime, implode("\r\n", $lineas), $cabeceras);

    (new ComunicacionModel($pdo))->registrarCorreo($usuarioId, $orden['id'], $destino, mb_substr($asunto, 0, 150), $enviado);

    if (!$enviado) {
        responder(503, ['error' => 'El servidor no pudo enviar el correo (¿está configurado el envío de e-mail?). El intento quedó registrado.']);
    }
    responder(200, ['ok' => true, 'destinatario' => $destino]);
} catch (PDOException $e) {
    error_log('[email] ' . $e->getMessage());
    responder(500, ['error' => 'Error interno del servidor.']);
}
