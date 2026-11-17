<?php
declare(strict_types=1);

/**
 * Acceso a datos de `intentos_login` (límite de fuerza bruta, OWASP A07).
 * Solo se guardan los intentos FALLIDOS; un login correcto borra los del email.
 * Solo PDO Prepared Statements con marcadores nombrados (sin repetir ninguno:
 * con prepares nativos PDO no permite usar el mismo nombre dos veces).
 */
class IntentoLoginModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Fallos del email en la ventana. Devuelve [cantidad, segundos que faltan
     * para que el fallo más viejo salga de la ventana y se libere un cupo].
     */
    public function fallosPorEmail(string $email, int $ventanaMin): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total,
                    TIMESTAMPDIFF(SECOND, NOW(), MIN(creado_en) + INTERVAL :min_espera MINUTE) AS espera
             FROM intentos_login
             WHERE email = :email AND creado_en > (NOW() - INTERVAL :min_ventana MINUTE)'
        );
        $stmt->execute([':min_espera' => $ventanaMin, ':email' => $email, ':min_ventana' => $ventanaMin]);
        return $this->resultado($stmt->fetch());
    }

    /** Lo mismo, por dirección IP (frena a quien prueba muchos emails distintos). */
    public function fallosPorIp(string $ip, int $ventanaMin): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total,
                    TIMESTAMPDIFF(SECOND, NOW(), MIN(creado_en) + INTERVAL :min_espera MINUTE) AS espera
             FROM intentos_login
             WHERE ip = :ip AND creado_en > (NOW() - INTERVAL :min_ventana MINUTE)'
        );
        $stmt->execute([':min_espera' => $ventanaMin, ':ip' => $ip, ':min_ventana' => $ventanaMin]);
        return $this->resultado($stmt->fetch());
    }

    public function registrarFallo(string $email, string $ip): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO intentos_login (email, ip) VALUES (:email, :ip)');
        $stmt->execute([':email' => $email, ':ip' => $ip]);

        // Mantenimiento: la tabla no crece sin límite (se borra lo de más de un día).
        $this->pdo->prepare('DELETE FROM intentos_login WHERE creado_en < (NOW() - INTERVAL :dias DAY)')
            ->execute([':dias' => 1]);
    }

    /** Tras un login correcto se perdonan los fallos previos de ese email. */
    public function limpiar(string $email): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM intentos_login WHERE email = :email');
        $stmt->execute([':email' => $email]);
    }

    private function resultado($fila): array
    {
        $total  = (int) ($fila['total'] ?? 0);
        $espera = max(1, (int) ($fila['espera'] ?? 0));
        return [$total, $espera];
    }
}
