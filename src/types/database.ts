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

/* ─── Tipado del esquema de Supabase v2 ─── */
export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: Categoria;
        Insert: Partial<Categoria>;
        Update: Partial<Categoria>;
        Relationships: [];
      };
      productos: {
        Row: Producto;
        Insert: Partial<Producto>;
        Update: Partial<Producto>;
        Relationships: [];
      };
      variantes: {
        Row: Variante;
        Insert: Partial<Variante>;
        Update: Partial<Variante>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

