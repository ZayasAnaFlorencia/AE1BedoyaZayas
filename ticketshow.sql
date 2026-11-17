-- =========================================================
-- TicketShow — script de base de datos (MySQL / MariaDB, XAMPP)
-- Importar desde phpMyAdmin (pestaña "Importar") o con:
--     mysql -u root < ticketshow.sql
-- Cada tabla anota el Caso de Uso (CU) de la AE1 que respalda.
-- =========================================================

CREATE DATABASE IF NOT EXISTS ticketshow
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ticketshow;

DROP VIEW  IF EXISTS v_tipos_entrada;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS ordenes;
DROP TABLE IF EXISTS tipos_entrada;
DROP TABLE IF EXISTS eventos;
DROP TABLE IF EXISTS medios_pago;
DROP TABLE IF EXISTS usuarios;

-- CU: Registrarse / Iniciar sesión / Administrar eventos (rol admin)
CREATE TABLE usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,              -- BCRYPT (password_hash)
  rol           ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  nombre        VARCHAR(60)  NOT NULL,
  apellido      VARCHAR(60)  NULL,
  pais          VARCHAR(60)  NULL,
  telefono      VARCHAR(30)  NULL,
  tipo_doc      VARCHAR(20)  NULL,
  documento     VARCHAR(30)  NULL,
  nacimiento    DATE         NULL,
  genero        VARCHAR(30)  NULL,
  newsletter    TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- CU: Ver cartelera / Ver detalle de un show / Gestionar eventos (CRUD admin)
CREATE TABLE eventos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo      VARCHAR(120) NOT NULL,
  fecha       DATE         NULL,                    -- NULL = "A confirmar"
  lugar       VARCHAR(150) NULL,
  descripcion TEXT         NOT NULL,
  imagen_url  VARCHAR(500) NOT NULL,
  artista     VARCHAR(120) NULL,
  instagram   VARCHAR(255) NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,      -- baja lógica (DELETE de la API)
  PRIMARY KEY (id),
  KEY ix_eventos_activo_fecha (activo, fecha)
) ENGINE=InnoDB;

-- CU: Elegir tipo de entrada / Gestionar stock
CREATE TABLE tipos_entrada (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento_id INT UNSIGNED NOT NULL,
  nombre    VARCHAR(80)  NOT NULL,
  precio    DECIMAL(10,2) NOT NULL,
  stock     INT UNSIGNED NOT NULL,
  vendidas  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_tipos_evento FOREIGN KEY (evento_id) REFERENCES eventos (id),
  CONSTRAINT ck_tipos_stock  CHECK (vendidas <= stock),
  KEY ix_tipos_evento (evento_id)
) ENGINE=InnoDB;

-- CU: Comprar entradas (medio de pago)
CREATE TABLE medios_pago (
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  activo TINYINT(1)  NOT NULL DEFAULT 1,
  PRIMARY KEY (codigo)
) ENGINE=InnoDB;

-- CU: Comprar entradas / Ver mis entradas
CREATE TABLE ordenes (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo            VARCHAR(20)  NOT NULL,
  usuario_id        INT UNSIGNED NOT NULL,
  tipo_entrada_id   INT UNSIGNED NOT NULL,
  medio_pago        VARCHAR(20)  NOT NULL,
  cantidad          TINYINT UNSIGNED NOT NULL,
  precio_unitario   DECIMAL(10,2) NOT NULL,         -- foto del precio al comprar
  total             DECIMAL(12,2) NOT NULL,
  estado            VARCHAR(20)  NOT NULL DEFAULT 'Confirmada',
  cliente_nombre    VARCHAR(100) NOT NULL,
  cliente_email     VARCHAR(120) NOT NULL,
  cliente_telefono  VARCHAR(30)  NULL,
  cliente_direccion VARCHAR(150) NULL,
  creada_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ordenes_codigo (codigo),
  CONSTRAINT fk_ordenes_usuario FOREIGN KEY (usuario_id)      REFERENCES usuarios (id),
  CONSTRAINT fk_ordenes_tipo    FOREIGN KEY (tipo_entrada_id) REFERENCES tipos_entrada (id),
  CONSTRAINT fk_ordenes_medio   FOREIGN KEY (medio_pago)      REFERENCES medios_pago (codigo),
  KEY ix_ordenes_usuario (usuario_id, creada_en)
) ENGINE=InnoDB;

-- CU: Ver mis entradas / Validar ticket en puerta
CREATE TABLE tickets (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id INT UNSIGNED NOT NULL,
  codigo   VARCHAR(20)  NOT NULL,
  usado    TINYINT(1)   NOT NULL DEFAULT 0,
  usado_en TIMESTAMP    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_codigo (codigo),
  CONSTRAINT fk_tickets_orden FOREIGN KEY (orden_id) REFERENCES ordenes (id)
) ENGINE=InnoDB;

-- Disponibilidad calculada (la usa EventoModel::entradasDeEvento)
CREATE VIEW v_tipos_entrada AS
  SELECT id, evento_id, nombre, precio, (stock - vendidas) AS disponibles
  FROM tipos_entrada;

-- ---------------------------------------------------------
-- Datos iniciales
-- ---------------------------------------------------------
INSERT INTO medios_pago (codigo, nombre) VALUES
  ('mercadopago',   'Mercado Pago'),
  ('visa',          'Visa'),
  ('mastercard',    'Mastercard'),
  ('amex',          'American Express'),
  ('transferencia', 'Transferencia bancaria'),
  ('efectivo',      'Efectivo (Pago Fácil / Rapipago)');

-- Administrador de prueba:  admin@ticketshow.com  /  admin1234   (cambiar en producción)
INSERT INTO usuarios (email, password_hash, rol, nombre, apellido) VALUES
  ('admin@ticketshow.com',
   '$2y$10$g9gFawOSK3FFcchnrNHJneepz8ov5w2gmCWmpYSCYpd5tnFTJATua',
   'admin', 'Admin', 'TicketShow');

INSERT INTO eventos (titulo, fecha, lugar, descripcion, imagen_url, artista, instagram) VALUES
  ('BTS World Tour ARIRANG', '2027-03-21', 'Estadio Único de La Plata, Buenos Aires',
   'BTS, acrónimo de Bangtan Sonyeondan, es una boyband surcoreana nominada al GRAMMY que conquistó a millones de fans desde su debut en 2013.',
   'https://cdn.getcrowder.com/images/b66dd286-ad48-4a83-bed7-eeae6da7b866-bts.jpeg',
   'BTS', 'https://www.instagram.com/bts.bighitofficial/'),
  ('Lollapalooza Argentina 2027', '2027-03-26', 'Hipódromo de San Isidro, Buenos Aires',
   'Tres días de música en vivo con artistas locales e internacionales.',
   'https://cdn.getcrowder.com/images/1a485529-f1b3-4fed-9e69-21e89ab848cd-6c4bf4ab-415f-45ba-84f8-07bcc4485772-venta-lolla27-banners1920x720aa-1.jpg?w=960&format=webp',
   NULL, NULL),
  ('Show a confirmar', NULL, NULL,
   'Próximamente más información.',
   'https://cdn.getcrowder.com/images/b66dd286-ad48-4a83-bed7-eeae6da7b866-bts.jpeg',
   NULL, NULL);

INSERT INTO tipos_entrada (evento_id, nombre, precio, stock, vendidas) VALUES
  (1, 'Campo General',      45000.00, 500, 0),
  (1, 'Platea Baja',        60000.00, 300, 0),
  (1, 'VIP + Meet & Greet', 120000.00,  60, 0),
  (2, 'Pase 1 día',         90000.00, 800, 0),
  (2, 'Pase 3 días',       210000.00, 400, 0),
  (3, 'Entrada general',    30000.00, 100, 0);
