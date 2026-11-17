<?php
header('Content-Type: application/json; charset=utf-8');
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=ticketshow;charset=utf8mb4',
        'root', '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $stmt = $pdo->query('SELECT id, titulo, fecha FROM eventos');
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar a la base']);
}
