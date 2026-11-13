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
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre              TEXT NOT NULL,
  descripcion         TEXT,
  precio              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  costo               NUMERIC(10, 2) DEFAULT 0,
  porcentaje_ganancia NUMERIC(5, 2) DEFAULT 0,
  exige_credencial    BOOLEAN NOT NULL DEFAULT FALSE,
  categoria_id        UUID REFERENCES categorias(id) ON DELETE SET NULL,
  imagen_url          TEXT,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
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
-- TABLA: movimientos_caja
-- Control de caja, ingresos, egresos y pagos
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo            TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto           NUMERIC(10, 2) NOT NULL,
  concepto        TEXT NOT NULL,
  categoria_caja  TEXT DEFAULT 'general',
  metodo_pago     TEXT DEFAULT 'efectivo',
  producto_id     UUID REFERENCES productos(id) ON DELETE SET NULL,
  cantidad        INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLA: turnos_caja (Arqueo ciego por turno - HU 3.3)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos_caja (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cajero_nombre           TEXT NOT NULL,
  monto_apertura          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monto_cierre_declarado  NUMERIC(10, 2),
  monto_cierre_esperado   NUMERIC(10, 2),
  diferencia              NUMERIC(10, 2),
  estado                  TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  observaciones           TEXT,
  fecha_apertura          TIMESTAMPTZ DEFAULT NOW(),
  fecha_cierre            TIMESTAMPTZ
);

-- ──────────────────────────────────────────────
-- TABLA: ventas (Punto de Venta POS - HU 3.1 & 3.2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_ticket           TEXT NOT NULL UNIQUE,
  cajero_nombre           TEXT NOT NULL,
  turno_id                UUID REFERENCES turnos_caja(id) ON DELETE SET NULL,
  total                   NUMERIC(10, 2) NOT NULL,
  metodo_pago             TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia_alias', 'tarjeta_postnet', 'combinado')),
  monto_efectivo          NUMERIC(10, 2) DEFAULT 0,
  monto_digital           NUMERIC(10, 2) DEFAULT 0,
  nro_comprobante_digital TEXT,
  exigio_credencial       BOOLEAN NOT NULL DEFAULT FALSE,
  fuerza_institucion      TEXT,
  credencial_verificada   BOOLEAN DEFAULT FALSE,
  legajo_comprador        TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABLA: venta_detalles (Ítems y variantes de venta)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venta_detalles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id        UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id     UUID REFERENCES productos(id) ON DELETE SET NULL,
  variante_id     UUID REFERENCES variantes(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  talle           TEXT NOT NULL,
  color           TEXT NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  cantidad        INTEGER NOT NULL DEFAULT 1,
  subtotal        NUMERIC(10, 2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- ÍNDICES para mejorar consultas frecuentes
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_variantes_stock ON variantes(stock);
CREATE INDEX IF NOT EXISTS idx_ventas_turno ON ventas(turno_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at);
CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos_caja(estado);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_venta ON venta_detalles(venta_id);

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
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_detalles ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Lectura pública de movimientos_caja"
  ON movimientos_caja FOR SELECT
  USING (true);

CREATE POLICY "Lectura pública de turnos_caja"
  ON turnos_caja FOR SELECT
  USING (true);

CREATE POLICY "Lectura pública de ventas"
  ON ventas FOR SELECT
  USING (true);

CREATE POLICY "Lectura pública de venta_detalles"
  ON venta_detalles FOR SELECT
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

CREATE POLICY "Permitir eliminar categorias"
  ON categorias FOR DELETE
  USING (true);

CREATE POLICY "Permitir insertar movimientos_caja"
  ON movimientos_caja FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar movimientos_caja"
  ON movimientos_caja FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar movimientos_caja"
  ON movimientos_caja FOR DELETE
  USING (true);

CREATE POLICY "Permitir insertar turnos_caja"
  ON turnos_caja FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar turnos_caja"
  ON turnos_caja FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar turnos_caja"
  ON turnos_caja FOR DELETE
  USING (true);

CREATE POLICY "Permitir insertar ventas"
  ON ventas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar ventas"
  ON ventas FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar ventas"
  ON ventas FOR DELETE
  USING (true);

CREATE POLICY "Permitir insertar venta_detalles"
  ON venta_detalles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar venta_detalles"
  ON venta_detalles FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar venta_detalles"
  ON venta_detalles FOR DELETE
  USING (true);

-- ──────────────────────────────────────────────
-- SUPABASE STORAGE: Bucket 'productos' para imágenes
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) 
VALUES ('productos', 'productos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Acceso público de lectura a imágenes de productos" ON storage.objects;
CREATE POLICY "Acceso público de lectura a imágenes de productos" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "Permitir subida de imágenes a admin y anon" ON storage.objects;
CREATE POLICY "Permitir subida de imágenes a admin y anon" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'productos');

DROP POLICY IF EXISTS "Permitir actualización de imágenes en productos" ON storage.objects;
CREATE POLICY "Permitir actualización de imágenes en productos" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'productos');

DROP POLICY IF EXISTS "Permitir borrado de imágenes en productos" ON storage.objects;
CREATE POLICY "Permitir borrado de imágenes en productos" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'productos');

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
