<?php
declare(strict_types=1);

/**
 * Acceso a datos de `encuestas`, `correos_enviados` y `consultas_soporte`.
 * Solo PDO Prepared Statements con marcadores nombrados.
 */
class ComunicacionModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /** Guarda la encuesta de una compra. Una por orden (UNIQUE): si ya existe lanza PDOException 23000. */
    public function guardarEncuesta(int $ordenId, int $usuarioId, int $puntaje, ?string $comentario): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO encuestas (orden_id, usuario_id, puntaje, comentario)
             VALUES (:orden_id, :usuario_id, :puntaje, :comentario)'
        );
        $stmt->execute([
            ':orden_id'   => $ordenId,
            ':usuario_id' => $usuarioId,
            ':puntaje'    => $puntaje,
            ':comentario' => $comentario,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    /** Bitácora de cada intento de envío de tickets por e-mail. */
    public function registrarCorreo(int $usuarioId, int $ordenId, string $destinatario, string $asunto, bool $enviado): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO correos_enviados (usuario_id, orden_id, destinatario, asunto, estado)
             VALUES (:usuario_id, :orden_id, :destinatario, :asunto, :estado)'
        );
        $stmt->execute([
            ':usuario_id'   => $usuarioId,
            ':orden_id'     => $ordenId,
            ':destinatario' => $destinatario,
            ':asunto'       => $asunto,
            ':estado'       => $enviado ? 'enviado' : 'fallido',
        ]);
    }

    /** Consulta a soporte (el usuario es opcional: la puede enviar alguien sin sesión). */
    public function guardarConsulta(?int $usuarioId, string $nombre, string $email, string $mensaje): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO consultas_soporte (usuario_id, nombre, email, mensaje)
             VALUES (:usuario_id, :nombre, :email, :mensaje)'
        );
        $stmt->execute([
            ':usuario_id' => $usuarioId,
            ':nombre'     => $nombre,
            ':email'      => $email,
            ':mensaje'    => $mensaje,
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}
