-- ============================================================
-- Tropas Tunuyán — Esquema de Base de Datos (Supabase / PostgreSQL)
-- ============================================================
-- Este esquema define las tablas principales para la gestión
-- de productos y sus variantes (talles, colores, stock).
-- ============================================================

-- Extensión para generar UUIDs automáticamente
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- TABLA: categorias
-- Categorías de producto (uniformes, calzado, etc.)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL UNIQUE,
  descripcion   TEXT,
  orden         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLA: productos
-- Catálogo principal de artículos
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre            TEXT NOT NULL,
  descripcion       TEXT,
  precio            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  exige_credencial  BOOLEAN NOT NULL DEFAULT FALSE,
  categoria_id      UUID REFERENCES categorias(id) ON DELETE SET NULL,
  imagen_url        TEXT,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLA: variantes
-- Variantes por producto (talle, color, stock)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS variantes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id   UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  talle         TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT 'Único',
  stock         INTEGER NOT NULL DEFAULT 0,
  stock_minimo  INTEGER NOT NULL DEFAULT 5,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Evitar variantes duplicadas para el mismo producto
  UNIQUE (producto_id, talle, color)
);

-- ──────────────────────────────────────────────
-- ÍNDICES para mejorar consultas frecuentes
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_variantes_stock ON variantes(stock);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS) & PERMISOS
-- ──────────────────────────────────────────────
-- Permisos de lectura y escritura para el panel de administración
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes ENABLE ROW LEVEL SECURITY;

-- Políticas de LECTURA pública
CREATE POLICY "Lectura pública de categorias"
  ON categorias FOR SELECT
  USING (true);

CREATE POLICY "Lectura pública de productos"
  ON productos FOR SELECT
  USING (true);

CREATE POLICY "Lectura pública de variantes"
  ON variantes FOR SELECT
  USING (true);

-- Políticas de ESCRITURA para el panel de administración
CREATE POLICY "Permitir insertar productos"
  ON productos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar productos"
  ON productos FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar productos"
  ON productos FOR DELETE
  USING (true);

CREATE POLICY "Permitir insertar variantes"
  ON variantes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar variantes"
  ON variantes FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar variantes"
  ON variantes FOR DELETE
  USING (true);

CREATE POLICY "Permitir insertar categorias"
  ON categorias FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar categorias"
  ON categorias FOR UPDATE
  USING (true);

-- ──────────────────────────────────────────────
-- DATOS INICIALES DE EJEMPLO (seed)
-- ──────────────────────────────────────────────

-- Categorías
INSERT INTO categorias (nombre, descripcion, orden) VALUES
  ('Uniformes',         'Uniformes tácticos y de servicio',         1),
  ('Calzado',           'Borceguíes, botas tácticas y zapatos',     2),
  ('Accesorios',        'Cinturones, fundas, guantes y más',        3),
  ('Protección',        'Chalecos, cascos y equipo de protección',  4),
  ('Insignias y Grados','Insignias, escudos y grados reglamentarios',5)
ON CONFLICT (nombre) DO NOTHING;

-- Productos de ejemplo
INSERT INTO productos (nombre, descripcion, precio, exige_credencial, categoria_id, imagen_url) VALUES
  (
    'Uniforme Táctico Ripstop',
    'Uniforme completo en tela ripstop reforzada, color verde oliva. Ideal para operaciones de campo.',
    45500.00,
    FALSE,
    (SELECT id FROM categorias WHERE nombre = 'Uniformes'),
    NULL
  ),
  (
    'Borceguí Táctico Cuero',
    'Borceguí de cuero vacuno con suela antideslizante y caña reforzada. Apto para todo terreno.',
    38900.00,
    FALSE,
    (SELECT id FROM categorias WHERE nombre = 'Calzado'),
    NULL
  ),
  (
    'Chaleco Antibalas Nivel IIIA',
    'Chaleco balístico certificado Nivel IIIA. Uso exclusivo para fuerzas de seguridad con credencial habilitante.',
    185000.00,
    TRUE,
    (SELECT id FROM categorias WHERE nombre = 'Protección'),
    NULL
  ),
  (
    'Cinturón Táctico Militar',
    'Cinturón táctico de nylon de alta resistencia con hebilla metálica de liberación rápida.',
    12500.00,
    FALSE,
    (SELECT id FROM categorias WHERE nombre = 'Accesorios'),
    NULL
  ),
  (
    'Funda Pistolera Nivel II',
    'Funda de retención nivel II para pistolas 9mm. Requiere presentación de credencial.',
    22800.00,
    TRUE,
    (SELECT id FROM categorias WHERE nombre = 'Accesorios'),
    NULL
  ),
  (
    'Insignia Escudo Nacional Bordada',
    'Insignia bordada del escudo nacional argentino para uniformes reglamentarios.',
    3200.00,
    FALSE,
    (SELECT id FROM categorias WHERE nombre = 'Insignias y Grados'),
    NULL
  )
ON CONFLICT DO NOTHING;

-- Variantes de ejemplo (talles y stock)
-- Uniforme Táctico Ripstop
INSERT INTO variantes (producto_id, talle, color, stock, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE nombre = 'Uniforme Táctico Ripstop'), 'S',  'Verde Oliva', 12, 5),
  ((SELECT id FROM productos WHERE nombre = 'Uniforme Táctico Ripstop'), 'M',  'Verde Oliva', 20, 5),
  ((SELECT id FROM productos WHERE nombre = 'Uniforme Táctico Ripstop'), 'L',  'Verde Oliva', 15, 5),
  ((SELECT id FROM productos WHERE nombre = 'Uniforme Táctico Ripstop'), 'XL', 'Verde Oliva', 8,  5),
  ((SELECT id FROM productos WHERE nombre = 'Uniforme Táctico Ripstop'), 'M',  'Negro',       10, 3),
  ((SELECT id FROM productos WHERE nombre = 'Uniforme Táctico Ripstop'), 'L',  'Negro',       7,  3)
ON CONFLICT DO NOTHING;

-- Borceguí Táctico Cuero
INSERT INTO variantes (producto_id, talle, color, stock, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE nombre = 'Borceguí Táctico Cuero'), '38', 'Negro', 6,  3),
  ((SELECT id FROM productos WHERE nombre = 'Borceguí Táctico Cuero'), '40', 'Negro', 14, 5),
  ((SELECT id FROM productos WHERE nombre = 'Borceguí Táctico Cuero'), '42', 'Negro', 11, 5),
  ((SELECT id FROM productos WHERE nombre = 'Borceguí Táctico Cuero'), '44', 'Negro', 4,  3),
  ((SELECT id FROM productos WHERE nombre = 'Borceguí Táctico Cuero'), '40', 'Marrón', 8, 3),
  ((SELECT id FROM productos WHERE nombre = 'Borceguí Táctico Cuero'), '42', 'Marrón', 5, 3)
ON CONFLICT DO NOTHING;

-- Chaleco Antibalas
INSERT INTO variantes (producto_id, talle, color, stock, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE nombre = 'Chaleco Antibalas Nivel IIIA'), 'M',  'Negro', 3, 2),
  ((SELECT id FROM productos WHERE nombre = 'Chaleco Antibalas Nivel IIIA'), 'L',  'Negro', 5, 2),
  ((SELECT id FROM productos WHERE nombre = 'Chaleco Antibalas Nivel IIIA'), 'XL', 'Negro', 2, 2)
ON CONFLICT DO NOTHING;

-- Cinturón Táctico
INSERT INTO variantes (producto_id, talle, color, stock, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE nombre = 'Cinturón Táctico Militar'), 'Único', 'Negro',       25, 10),
  ((SELECT id FROM productos WHERE nombre = 'Cinturón Táctico Militar'), 'Único', 'Verde Oliva', 18, 10)
ON CONFLICT DO NOTHING;

-- Funda Pistolera
INSERT INTO variantes (producto_id, talle, color, stock, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE nombre = 'Funda Pistolera Nivel II'), 'Diestro',  'Negro', 10, 5),
  ((SELECT id FROM productos WHERE nombre = 'Funda Pistolera Nivel II'), 'Zurdo',    'Negro', 4,  3)
ON CONFLICT DO NOTHING;

-- Insignia
INSERT INTO variantes (producto_id, talle, color, stock, stock_minimo) VALUES
  ((SELECT id FROM productos WHERE nombre = 'Insignia Escudo Nacional Bordada'), 'Único', 'Multicolor', 50, 15)
ON CONFLICT DO NOTHING;
