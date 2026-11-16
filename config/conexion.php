<?php
declare(strict_types=1);

/**
 * Conexión PDO Singleton a MySQL.
 * Una sola instancia de PDO por petición, con excepciones activadas.
 * Los errores (PDOException) los captura quien llama, para no exponer
 * datos del servidor al cliente.
 */
final class Conexion
{
    // Valores por defecto de XAMPP. Cambiarlos si tu entorno es distinto.
    private const HOST    = 'localhost';
    private const BD      = 'ticketshow';
    private const USUARIO = 'root';
    private const CLAVE   = '';

    private static ?PDO $instancia = null;

    // Constructor y clone privados: nadie puede crear otra conexión por fuera.
    private function __construct() {}
    private function __clone() {}

    public static function getInstancia(): PDO
    {
        if (self::$instancia === null) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', self::HOST, self::BD);

            self::$instancia = new PDO($dsn, self::USUARIO, self::CLAVE, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // errores como excepciones
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // filas como arrays asociativos
                PDO::ATTR_EMULATE_PREPARES   => false,                    // prepared statements reales
            ]);
        }
        return self::$instancia;
    }
}
