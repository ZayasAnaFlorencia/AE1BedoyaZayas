<?php
declare(strict_types=1);

/**
 * Acceso a datos de `resenas`. Solo PDO Prepared Statements con marcadores nombrados.
 */
class ResenaModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /** Últimas reseñas de un evento, con el nombre de pila de quien opina. */
    public function listarPorEvento(int $eventoId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT r.id, r.puntaje, r.comentario, r.verificada, r.creada_en, u.nombre
             FROM resenas r
             INNER JOIN usuarios u ON u.id = r.usuario_id
             WHERE r.evento_id = :evento_id
             ORDER BY r.creada_en DESC, r.id DESC
             LIMIT 50'
        );
        $stmt->execute([':evento_id' => $eventoId]);

        return array_map(static function (array $f): array {
            return [
                'id'         => (int) $f['id'],
                'puntaje'    => (int) $f['puntaje'],
                'comentario' => $f['comentario'],
                'verificada' => (int) $f['verificada'] === 1,
                'creada_en'  => $f['creada_en'],
                'nombre'     => $f['nombre'],
            ];
        }, $stmt->fetchAll());
    }

    /** Cantidad de reseñas y promedio (0 si no hay). */
    public function resumen(int $eventoId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total, COALESCE(AVG(puntaje), 0) AS promedio
             FROM resenas WHERE evento_id = :evento_id'
        );
        $stmt->execute([':evento_id' => $eventoId]);
        $f = $stmt->fetch();
        return ['total' => (int) $f['total'], 'promedio' => round((float) $f['promedio'], 1)];
    }

    /** ¿El usuario compró entradas de este evento? (reseña "verificada") */
    public function compro(int $usuarioId, int $eventoId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT 1 FROM ordenes o
             INNER JOIN tipos_entrada t ON t.id = o.tipo_entrada_id
             WHERE o.usuario_id = :usuario_id AND t.evento_id = :evento_id
             LIMIT 1'
        );
        $stmt->execute([':usuario_id' => $usuarioId, ':evento_id' => $eventoId]);
        return $stmt->fetchColumn() !== false;
    }

    /** Alta de reseña. Una por usuario y evento (UNIQUE): si ya existe lanza PDOException 23000. */
    public function crear(int $eventoId, int $usuarioId, int $puntaje, ?string $comentario, bool $verificada): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO resenas (evento_id, usuario_id, puntaje, comentario, verificada)
             VALUES (:evento_id, :usuario_id, :puntaje, :comentario, :verificada)'
        );
        $stmt->execute([
            ':evento_id'  => $eventoId,
            ':usuario_id' => $usuarioId,
            ':puntaje'    => $puntaje,
            ':comentario' => $comentario,
            ':verificada' => $verificada ? 1 : 0,
        ]);
        return (int) $this->pdo->lastInsertId();
    }
}
