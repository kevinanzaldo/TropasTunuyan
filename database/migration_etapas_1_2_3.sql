-- ============================================================
-- Tropas Tunuyán — Migración SQL Etapas 1, 2 y 3 (Supabase)
-- ============================================================
-- Ejecutá este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/lqciqklmdersrisoamht/sql
-- ============================================================

-- 1. Agregar columnas de Costo y Margen de Ganancia a la tabla 'productos'
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS costo NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS porcentaje_ganancia NUMERIC(5, 2) DEFAULT 0;

-- 2. Crear tabla de Movimientos de Caja (Módulo Financiero / Etapa 4)
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

-- Índices para movimientos de caja
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(created_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja(tipo);

-- RLS para movimientos_caja
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura movimientos_caja"
  ON movimientos_caja FOR SELECT
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

-- 3. Configuración de Supabase Storage para imágenes de productos
-- Crear bucket público 'productos'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('productos', 'productos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acceso para el bucket 'productos'
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

-- Conceder permisos globales a los roles anon y authenticated
GRANT ALL ON TABLE movimientos_caja TO anon, authenticated;
