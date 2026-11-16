<?php
declare(strict_types=1);

/**
 * Acceso a datos puro de la tabla `usuarios`.
 * Solo PDO Prepared Statements con marcadores nombrados: nada de concatenar SQL.
 * No decide nada de negocio ni responde HTTP: eso es del controlador (/api).
 */
class UsuarioModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /** Devuelve el usuario (con su hash) o null si no existe. */
    public function buscarPorEmail(string $email): ?array
    {
        $sql = 'SELECT id, email, password_hash, rol, nombre, apellido
                FROM usuarios
                WHERE email = :email
                LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':email' => $email]);

        $fila = $stmt->fetch();
        return $fila === false ? null : $fila;
    }

    /** Inserta un usuario con rol 'cliente' y devuelve el id generado. */
    public function crear(array $d): int
    {
        $sql = 'INSERT INTO usuarios
                    (email, password_hash, rol, nombre, apellido, pais, telefono,
                     tipo_doc, documento, nacimiento, genero, newsletter)
                VALUES
                    (:email, :password_hash, :rol, :nombre, :apellido, :pais, :telefono,
                     :tipo_doc, :documento, :nacimiento, :genero, :newsletter)';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':email'         => $d['email'],
            ':password_hash' => $d['password_hash'],
            ':rol'           => 'cliente', // el rol nunca viene del cliente
            ':nombre'        => $d['nombre'],
            ':apellido'      => $d['apellido'],
            ':pais'          => $d['pais'],
            ':telefono'      => $d['telefono'],
            ':tipo_doc'      => $d['tipo_doc'],
            ':documento'     => $d['documento'],
            ':nacimiento'    => $d['nacimiento'],
            ':genero'        => $d['genero'],
            ':newsletter'    => $d['newsletter'],
        ]);

        return (int) $this->pdo->lastInsertId();
    }
}
