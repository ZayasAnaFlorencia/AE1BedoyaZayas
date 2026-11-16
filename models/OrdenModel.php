<?php
declare(strict_types=1);

/**
 * Error de regla de negocio (stock agotado, evento finalizado, etc.).
 * Lleva el código HTTP con el que el controlador debe responder.
 */
class ReglaNegocioException extends Exception
{
    public int $http;

    public function __construct(string $mensaje, int $http)
    {
        parent::__construct($mensaje);
        $this->http = $http;
    }
}

/**
 * Acceso a datos de `ordenes` y `tickets`.
 * La compra es una transacción: o se guarda todo (stock + orden + tickets) o nada.
 */
class OrdenModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Compra de entradas. $d trae: tipo_entrada_id, cantidad, medio_pago,
     * cliente_nombre, cliente_email, cliente_telefono, cliente_direccion.
     * Devuelve los datos de la orden creada con los códigos de sus tickets.
     *
     * @throws ReglaNegocioException  400/404/409 según la regla que falle
     * @throws PDOException           error de base de datos (el controlador responde 500)
     */
    public function comprar(int $usuarioId, array $d): array
    {
        $this->pdo->beginTransaction();

        try {
            // 1) El precio sale SIEMPRE de la BD, nunca del cliente.
            $stmt = $this->pdo->prepare(
                'SELECT t.precio, e.fecha
                 FROM tipos_entrada t
                 INNER JOIN eventos e ON e.id = t.evento_id
                 WHERE t.id = :id AND e.activo = 1'
            );
            $stmt->execute([':id' => $d['tipo_entrada_id']]);
            $tipo = $stmt->fetch();

            if ($tipo === false) {
                throw new ReglaNegocioException('El tipo de entrada no existe.', 404);
            }
            if ($tipo['fecha'] !== null && $tipo['fecha'] < date('Y-m-d')) {
                throw new ReglaNegocioException('El evento ya finalizó.', 409);
            }

            // 2) El medio de pago tiene que existir y estar activo.
            $stmt = $this->pdo->prepare(
                'SELECT 1 FROM medios_pago WHERE codigo = :codigo AND activo = 1'
            );
            $stmt->execute([':codigo' => $d['medio_pago']]);
            if ($stmt->fetchColumn() === false) {
                throw new ReglaNegocioException('El medio de pago no es válido.', 400);
            }

            // 3) Descuento de stock ATÓMICO: la condición vive en el propio UPDATE,
            //    así dos compras simultáneas no pueden sobrevender.
            $stmt = $this->pdo->prepare(
                'UPDATE tipos_entrada
                 SET vendidas = vendidas + :sumar
                 WHERE id = :id AND (stock - vendidas) >= :minimo'
            );
            $stmt->execute([
                ':sumar'  => $d['cantidad'],
                ':minimo' => $d['cantidad'],
                ':id'     => $d['tipo_entrada_id'],
            ]);
            if ($stmt->rowCount() === 0) {
                throw new ReglaNegocioException('No hay entradas suficientes disponibles.', 409);
            }

            // 4) Orden. precio_unitario y total quedan como "foto" del momento de la compra.
            $precio = (float) $tipo['precio'];
            $total  = round($precio * $d['cantidad'], 2);

            $stmtOrden = $this->pdo->prepare(
                'INSERT INTO ordenes
                    (codigo, usuario_id, tipo_entrada_id, medio_pago, cantidad,
                     precio_unitario, total, cliente_nombre, cliente_email,
                     cliente_telefono, cliente_direccion)
                 VALUES
                    (:codigo, :usuario_id, :tipo_entrada_id, :medio_pago, :cantidad,
                     :precio_unitario, :total, :cliente_nombre, :cliente_email,
                     :cliente_telefono, :cliente_direccion)'
            );
            $codigoOrden = $this->insertarConCodigo($stmtOrden, [
                ':usuario_id'        => $usuarioId,
                ':tipo_entrada_id'   => $d['tipo_entrada_id'],
                ':medio_pago'        => $d['medio_pago'],
                ':cantidad'          => $d['cantidad'],
                ':precio_unitario'   => $precio,
                ':total'             => $total,
                ':cliente_nombre'    => $d['cliente_nombre'],
                ':cliente_email'     => $d['cliente_email'],
                ':cliente_telefono'  => $d['cliente_telefono'],
                ':cliente_direccion' => $d['cliente_direccion'],
            ], 'ORD-', 6);
            $ordenId = (int) $this->pdo->lastInsertId();

            // 5) Un ticket por cada entrada comprada.
            $stmtTicket = $this->pdo->prepare(
                'INSERT INTO tickets (orden_id, codigo) VALUES (:orden_id, :codigo)'
            );
            $tickets = [];
            for ($i = 0; $i < $d['cantidad']; $i++) {
                $tickets[] = $this->insertarConCodigo($stmtTicket, [':orden_id' => $ordenId], 'TS-', 10);
            }

            $this->pdo->commit();

            return [
                'codigo'          => $codigoOrden,
                'cantidad'        => $d['cantidad'],
                'precio_unitario' => $precio,
                'total'           => $total,
                'estado'          => 'Confirmada',
                'tickets'         => $tickets,
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack(); // cualquier fallo deshace el stock descontado
            }
            throw $e;
        }
    }

    /** Órdenes del usuario (las más nuevas primero), cada una con sus tickets. */
    public function listarPorUsuario(int $usuarioId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT o.id, o.codigo, o.cantidad, o.precio_unitario, o.total, o.estado, o.creada_en,
                    t.nombre AS tipo_entrada, e.titulo AS evento, e.fecha, e.lugar
             FROM ordenes o
             INNER JOIN tipos_entrada t ON t.id = o.tipo_entrada_id
             INNER JOIN eventos e       ON e.id = t.evento_id
             WHERE o.usuario_id = :usuario_id
             ORDER BY o.creada_en DESC, o.id DESC'
        );
        $stmt->execute([':usuario_id' => $usuarioId]);
        $ordenes = $stmt->fetchAll();

        $stmtTickets = $this->pdo->prepare(
            'SELECT codigo, usado FROM tickets WHERE orden_id = :orden_id ORDER BY id'
        );

        $resultado = [];
        foreach ($ordenes as $o) {
            $stmtTickets->execute([':orden_id' => $o['id']]);
            $tickets = array_map(static function (array $t): array {
                return ['codigo' => $t['codigo'], 'usado' => (bool) $t['usado']];
            }, $stmtTickets->fetchAll());

            $resultado[] = [
                'codigo'          => $o['codigo'],
                'evento'          => $o['evento'],
                'fecha'           => $o['fecha'],
                'lugar'           => $o['lugar'],
                'tipo_entrada'    => $o['tipo_entrada'],
                'cantidad'        => (int) $o['cantidad'],
                'precio_unitario' => (float) $o['precio_unitario'],
                'total'           => (float) $o['total'],
                'estado'          => $o['estado'],
                'creada_en'       => $o['creada_en'],
                'tickets'         => $tickets,
            ];
        }
        return $resultado;
    }

    /**
     * Ejecuta un INSERT con un código aleatorio (prefijo + caracteres).
     * Si el código ya existe (UNIQUE, error 23000) prueba con otro, hasta 5 veces.
     */
    private function insertarConCodigo(PDOStatement $stmt, array $params, string $prefijo, int $largo): string
    {
        for ($intento = 1; $intento <= 5; $intento++) {
            $codigo = $prefijo . $this->codigoAleatorio($largo);
            try {
                $stmt->execute($params + [':codigo' => $codigo]);
                return $codigo;
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000' || $intento === 5) {
                    throw $e;
                }
            }
        }
        throw new RuntimeException('No se pudo generar un código único.');
    }

    /** Caracteres al azar (criptográficamente seguros), sin 0/O/1/I para no confundirse. */
    private function codigoAleatorio(int $largo): string
    {
        $alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $max = strlen($alfabeto) - 1;
        $codigo = '';
        for ($i = 0; $i < $largo; $i++) {
            $codigo .= $alfabeto[random_int(0, $max)];
        }
        return $codigo;
    }
}
