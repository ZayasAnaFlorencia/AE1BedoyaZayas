-- =========================================================
-- TicketShow — tablas nuevas (reseñas, encuesta, e-mails, soporte, límite de login)
-- Para una base `ticketshow` YA importada: pestaña SQL/Importar de phpMyAdmin.
-- No toca datos existentes (CREATE TABLE IF NOT EXISTS).
-- =========================================================
USE ticketshow;

-- CU: Valorar un show (reseñas 1-5 ★; "verificada" si el usuario compró entradas)
CREATE TABLE IF NOT EXISTS resenas (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  evento_id   INT UNSIGNED NOT NULL,
  usuario_id  INT UNSIGNED NOT NULL,
  puntaje     TINYINT UNSIGNED NOT NULL,
  comentario  VARCHAR(500) NULL,
  verificada  TINYINT(1)   NOT NULL DEFAULT 0,
  creada_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resena_usuario_evento (evento_id, usuario_id),   -- una reseña por persona y show
  CONSTRAINT fk_resenas_evento  FOREIGN KEY (evento_id)  REFERENCES eventos (id),
  CONSTRAINT fk_resenas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT ck_resenas_puntaje CHECK (puntaje BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- CU: Responder la encuesta de satisfacción al finalizar una compra
CREATE TABLE IF NOT EXISTS encuestas (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id    INT UNSIGNED NOT NULL,
  usuario_id  INT UNSIGNED NOT NULL,
  puntaje     TINYINT UNSIGNED NOT NULL,
  comentario  VARCHAR(500) NULL,
  creada_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_encuesta_orden (orden_id),                       -- una encuesta por compra
  CONSTRAINT fk_encuestas_orden   FOREIGN KEY (orden_id)   REFERENCES ordenes (id),
  CONSTRAINT fk_encuestas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT ck_encuestas_puntaje CHECK (puntaje BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- CU: Enviar tickets por e-mail (bitácora de envíos)
CREATE TABLE IF NOT EXISTS correos_enviados (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id   INT UNSIGNED NOT NULL,
  orden_id     INT UNSIGNED NOT NULL,
  destinatario VARCHAR(120) NOT NULL,
  asunto       VARCHAR(150) NOT NULL,
  estado       ENUM('enviado','fallido') NOT NULL,
  creado_en    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_correos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_correos_orden   FOREIGN KEY (orden_id)   REFERENCES ordenes (id)
) ENGINE=InnoDB;

-- CU: Contactar con soporte
CREATE TABLE IF NOT EXISTS consultas_soporte (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL,
  mensaje    VARCHAR(1000) NOT NULL,
  creada_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_soporte_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;

-- Seguridad (OWASP A07): intentos de login fallidos, para limitar la fuerza bruta
CREATE TABLE IF NOT EXISTS intentos_login (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email     VARCHAR(120) NOT NULL,
  ip        VARCHAR(45)  NOT NULL,
  creado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_intentos_email (email, creado_en),
  KEY ix_intentos_ip (ip, creado_en)
) ENGINE=InnoDB;
