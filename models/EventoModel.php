<?php
declare(strict_types=1);

/**
 * Acceso a datos de `eventos` y `tipos_entrada` (vía la vista v_tipos_entrada).
 * Solo PDO Prepared Statements con marcadores nombrados.
 *
 * CRUD completo (ISO 25010 — funcionalidad):
 *   Create  → crear()
 *   Read    → listarVigentes(), listarTodos(), buscarPorId(), entradasDeEvento()
 *   Update  → actualizar(), sincronizarEntradas()
 *   Delete  → eliminar()  (baja lógica: activo = 0)
 */
class EventoModel
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Cartelera pública: eventos activos y vigentes (o "A confirmar", con fecha NULL),
     * con el precio mínimo y el total de entradas disponibles.
     */
    public function listarVigentes(): array
    {
        $sql = 'SELECT e.id, e.titulo, e.fecha, e.lugar, e.imagen_url, e.artista,
                       MIN(t.precio)                AS precio_desde,
                       COALESCE(SUM(t.stock - t.vendidas), 0) AS disponibles
                FROM eventos e
                LEFT JOIN tipos_entrada t ON t.evento_id = e.id
                WHERE e.activo = 1
                  AND (e.fecha IS NULL OR e.fecha >= CURDATE())
                GROUP BY e.id
                ORDER BY (e.fecha IS NULL), e.fecha ASC';
        $filas = $this->pdo->query($sql)->fetchAll();

        return array_map(static function (array $f): array {
            return [
                'id'           => (int) $f['id'],
                'titulo'       => $f['titulo'],
                'fecha'        => $f['fecha'],
                'lugar'        => $f['lugar'],
                'imagen_url'   => $f['imagen_url'],
                'artista'      => $f['artista'],
                'precio_desde' => $f['precio_desde'] === null ? null : (float) $f['precio_desde'],
                'disponibles'  => (int) $f['disponibles'],
            ];
        }, $filas);
    }

    /**
     * Listado para administración: todos los eventos (activos e inactivos),
     * con contadores de tipos y stock disponible.
     */
    public function listarTodos(): array
    {
        $sql = 'SELECT e.id, e.titulo, e.fecha, e.lugar, e.imagen_url, e.artista,
                       e.descripcion, e.instagram, e.activo,
                       COUNT(t.id) AS tipos,
                       COALESCE(SUM(t.stock - t.vendidas), 0) AS disponibles
                FROM eventos e
                LEFT JOIN tipos_entrada t ON t.evento_id = e.id
                GROUP BY e.id
                ORDER BY e.id DESC';
        $filas = $this->pdo->query($sql)->fetchAll();

        return array_map(static function (array $f): array {
            return [
                'id'          => (int) $f['id'],
                'titulo'      => $f['titulo'],
                'fecha'       => $f['fecha'],
                'lugar'       => $f['lugar'],
                'imagen_url'  => $f['imagen_url'],
                'artista'     => $f['artista'],
                'descripcion' => $f['descripcion'],
                'instagram'   => $f['instagram'],
                'activo'      => (int) $f['activo'] === 1,
                'tipos'       => (int) $f['tipos'],
                'disponibles' => (int) $f['disponibles'],
            ];
        }, $filas);
    }

    /** Ficha de un evento activo, o null si no existe / está dado de baja. */
    public function buscarPorId(int $id): ?array
    {
        $sql = 'SELECT id, titulo, fecha, lugar, descripcion, imagen_url, artista, instagram
                FROM eventos
                WHERE id = :id AND activo = 1
                LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        $f = $stmt->fetch();
        if ($f === false) {
            return null;
        }
        $f['id'] = (int) $f['id'];
        return $f;
    }

    /** Ficha para admin (incluye inactivos). */
    public function buscarPorIdAdmin(int $id): ?array
    {
        $sql = 'SELECT id, titulo, fecha, lugar, descripcion, imagen_url, artista, instagram, activo
                FROM eventos
                WHERE id = :id
                LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);

        $f = $stmt->fetch();
        if ($f === false) {
            return null;
        }
        $f['id'] = (int) $f['id'];
        $f['activo'] = (int) $f['activo'] === 1;
        return $f;
    }

    /** Tipos de entrada de un evento, con la cantidad disponible. */
    public function entradasDeEvento(int $eventoId): array
    {
        $sql = 'SELECT id, nombre, precio, disponibles
                FROM v_tipos_entrada
                WHERE evento_id = :evento_id
                ORDER BY precio ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':evento_id' => $eventoId]);

        return array_map(static function (array $f): array {
            return [
                'id'          => (int) $f['id'],
                'nombre'      => $f['nombre'],
                'precio'      => (float) $f['precio'],
                'disponibles' => (int) $f['disponibles'],
            ];
        }, $stmt->fetchAll());
    }

    /** Tipos con stock/vendidas (para edición admin). */
    public function entradasAdminDeEvento(int $eventoId): array
    {
        $sql = 'SELECT id, nombre, precio, stock, vendidas,
                       (stock - vendidas) AS disponibles
                FROM tipos_entrada
                WHERE evento_id = :evento_id
                ORDER BY precio ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':evento_id' => $eventoId]);

        return array_map(static function (array $f): array {
            return [
                'id'          => (int) $f['id'],
                'nombre'      => $f['nombre'],
                'precio'      => (float) $f['precio'],
                'stock'       => (int) $f['stock'],
                'vendidas'    => (int) $f['vendidas'],
                'disponibles' => (int) $f['disponibles'],
            ];
        }, $stmt->fetchAll());
    }

    /**
     * CREATE — Alta de evento + tipos de entrada en una transacción.
     *
     * @param array $datos  Campos del evento
     * @param array $entradas  Lista de { nombre, precio, stock }
     * @return int id del evento creado
     */
    public function crear(array $datos, array $entradas): int
    {
        $this->pdo->beginTransaction();
        try {
            $sql = 'INSERT INTO eventos
                        (titulo, fecha, lugar, descripcion, imagen_url, artista, instagram, activo)
                    VALUES
                        (:titulo, :fecha, :lugar, :descripcion, :imagen_url, :artista, :instagram, 1)';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':titulo'      => $datos['titulo'],
                ':fecha'       => $datos['fecha'],
                ':lugar'       => $datos['lugar'],
                ':descripcion' => $datos['descripcion'],
                ':imagen_url'  => $datos['imagen_url'],
                ':artista'     => $datos['artista'],
                ':instagram'   => $datos['instagram'],
            ]);
            $eventoId = (int) $this->pdo->lastInsertId();

            $this->insertarEntradas($eventoId, $entradas);

            $this->pdo->commit();
            return $eventoId;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * UPDATE — Modifica cabecera del evento y sincroniza tipos de entrada.
     * Las entradas existentes se actualizan por id; las nuevas se insertan;
     * las omitidas se eliminan solo si no tienen ventas (vendidas = 0).
     *
     * @return bool true si existía y se actualizó
     */
    public function actualizar(int $id, array $datos, array $entradas): bool
    {
        if ($this->buscarPorIdAdmin($id) === null) {
            return false;
        }

        $this->pdo->beginTransaction();
        try {
            $sql = 'UPDATE eventos SET
                        titulo      = :titulo,
                        fecha       = :fecha,
                        lugar       = :lugar,
                        descripcion = :descripcion,
                        imagen_url  = :imagen_url,
                        artista     = :artista,
                        instagram   = :instagram,
                        activo      = :activo
                    WHERE id = :id';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':titulo'      => $datos['titulo'],
                ':fecha'       => $datos['fecha'],
                ':lugar'       => $datos['lugar'],
                ':descripcion' => $datos['descripcion'],
                ':imagen_url'  => $datos['imagen_url'],
                ':artista'     => $datos['artista'],
                ':instagram'   => $datos['instagram'],
                ':activo'      => !empty($datos['activo']) ? 1 : 0,
                ':id'          => $id,
            ]);

            $this->sincronizarEntradas($id, $entradas);

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * DELETE — Baja lógica (activo = 0). No borra filas ni historial de ventas.
     */
    public function eliminar(int $id): bool
    {
        $sql = 'UPDATE eventos SET activo = 0 WHERE id = :id AND activo = 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    /** Actualiza solo el stock de un tipo de entrada (panel Stock). */
    public function actualizarStockTipo(int $tipoId, int $stock): bool
    {
        $sql = 'UPDATE tipos_entrada
                SET stock = :stock
                WHERE id = :id AND :stock >= vendidas';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':stock' => $stock, ':id' => $tipoId]);
        return $stmt->rowCount() > 0;
    }

    /* ---------- Privados ---------- */

    private function insertarEntradas(int $eventoId, array $entradas): void
    {
        $sql = 'INSERT INTO tipos_entrada (evento_id, nombre, precio, stock, vendidas)
                VALUES (:evento_id, :nombre, :precio, :stock, 0)';
        $stmt = $this->pdo->prepare($sql);
        foreach ($entradas as $e) {
            $stmt->execute([
                ':evento_id' => $eventoId,
                ':nombre'    => $e['nombre'],
                ':precio'    => $e['precio'],
                ':stock'     => $e['stock'],
            ]);
        }
    }

    private function sincronizarEntradas(int $eventoId, array $entradas): void
    {
        $actuales = $this->entradasAdminDeEvento($eventoId);
        $porId = [];
        foreach ($actuales as $a) {
            $porId[$a['id']] = $a;
        }

        $idsVistos = [];

        $sqlUp = 'UPDATE tipos_entrada
                  SET nombre = :nombre, precio = :precio, stock = :stock
                  WHERE id = :id AND evento_id = :evento_id AND :stock >= vendidas';
        $up = $this->pdo->prepare($sqlUp);

        $sqlIn = 'INSERT INTO tipos_entrada (evento_id, nombre, precio, stock, vendidas)
                  VALUES (:evento_id, :nombre, :precio, :stock, 0)';
        $in = $this->pdo->prepare($sqlIn);

        foreach ($entradas as $e) {
            $eid = isset($e['id']) ? (int) $e['id'] : 0;
            if ($eid > 0 && isset($porId[$eid])) {
                $up->execute([
                    ':nombre'    => $e['nombre'],
                    ':precio'    => $e['precio'],
                    ':stock'     => $e['stock'],
                    ':id'        => $eid,
                    ':evento_id' => $eventoId,
                ]);
                if ($up->rowCount() === 0 && $e['stock'] < $porId[$eid]['vendidas']) {
                    throw new RuntimeException(
                        "El stock de \"{$e['nombre']}\" no puede ser menor a las {$porId[$eid]['vendidas']} vendidas."
                    );
                }
                $idsVistos[$eid] = true;
            } else {
                $in->execute([
                    ':evento_id' => $eventoId,
                    ':nombre'    => $e['nombre'],
                    ':precio'    => $e['precio'],
                    ':stock'     => $e['stock'],
                ]);
            }
        }

        $sqlDel = 'DELETE FROM tipos_entrada
                   WHERE id = :id AND evento_id = :evento_id AND vendidas = 0';
        $del = $this->pdo->prepare($sqlDel);
        foreach ($porId as $id => $a) {
            if (!isset($idsVistos[$id])) {
                if ($a['vendidas'] > 0) {
                    continue;
                }
                $del->execute([':id' => $id, ':evento_id' => $eventoId]);
            }
        }
    }
}
