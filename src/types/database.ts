/**
 * Tipos TypeScript para la base de datos de Tropas Tunuyán.
 * Reflejan el esquema definido en database/schema.sql.
 */

/* ─── Categoría ─── */
export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  created_at: string;
}

/* ─── Producto ─── */
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  exige_credencial: boolean;
  categoria_id: string | null;
  imagen_url: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Producto con sus variantes y categoría anidada (para consultas con join) */
export interface ProductoConVariantes extends Producto {
  variantes: Variante[];
  categorias: Categoria | null;
}

/* ─── Variante ─── */
export interface Variante {
  id: string;
  producto_id: string;
  talle: string;
  color: string;
  stock: number;
  stock_minimo: number;
  created_at: string;
  updated_at: string;
}

/* ─── Tipos auxiliares para formularios ─── */
export interface ProductoFormData {
  nombre: string;
  descripcion: string;
  precio: number;
  exige_credencial: boolean;
  categoria_id: string;
  imagen_url: string;
}

export interface VarianteFormData {
  producto_id: string;
  talle: string;
  color: string;
  stock: number;
  stock_minimo: number;
}

/* ─── Filtros del catálogo ─── */
export interface FiltrosCatalogo {
  categoria: string | null;
  busqueda: string;
}

/* ─── Tipado del esquema de Supabase (simplificado) ─── */
export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: Categoria;
        Insert: Omit<Categoria, 'id' | 'created_at'>;
        Update: Partial<Omit<Categoria, 'id' | 'created_at'>>;
      };
      productos: {
        Row: Producto;
        Insert: Omit<Producto, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Producto, 'id' | 'created_at' | 'updated_at'>>;
      };
      variantes: {
        Row: Variante;
        Insert: Omit<Variante, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Variante, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
