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
  costo?: number | null;
  porcentaje_ganancia?: number | null;
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

/* ─── Movimiento de Caja (Módulo Financiero) ─── */
export interface MovimientoCaja {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  concepto: string;
  categoria_caja: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  producto_id?: string | null;
  cantidad?: number | null;
  created_at: string;
}

/* ─── Turno de Caja (Arqueo Ciego - HU 3.3) ─── */
export interface TurnoCaja {
  id: string;
  cajero_nombre: string;
  monto_apertura: number;
  monto_cierre_declarado: number | null;
  monto_cierre_esperado: number | null;
  diferencia: number | null;
  estado: 'abierto' | 'cerrado';
  observaciones?: string | null;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  total_ventas_efectivo?: number;
  total_ventas_digital?: number;
  cantidad_ventas?: number;
}

/* ─── Métodos de Pago ─── */
export type MetodoPagoTipo = 'efectivo' | 'transferencia_alias' | 'tarjeta_postnet' | 'combinado';

/* ─── Venta en Mostrador (POS - HU 3.1 & 3.2) ─── */
export interface Venta {
  id: string;
  numero_ticket: string;
  cajero_nombre: string;
  turno_id?: string | null;
  total: number;
  metodo_pago: MetodoPagoTipo;
  monto_efectivo?: number;
  monto_digital?: number;
  nro_comprobante_digital?: string | null;
  exigio_credencial: boolean;
  fuerza_institucion?: string | null;
  credencial_verificada?: boolean;
  legajo_comprador?: string | null;
  detalles?: VentaDetalle[];
  created_at: string;
}

/* ─── Detalle de Venta ─── */
export interface VentaDetalle {
  id: string;
  venta_id: string;
  producto_id?: string | null;
  variante_id?: string | null;
  nombre_producto: string;
  talle: string;
  color: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  created_at?: string;
}

/* ─── Ítem del Carrito en el Punto de Venta (POS) ─── */
export interface VentaItemCarrito {
  variante_id: string;
  producto_id: string;
  nombre: string;
  talle: string;
  color: string;
  precio: number;
  cantidad: number;
  subtotal: number;
  exige_credencial: boolean;
  imagen_url: string | null;
  stock_disponible: number;
}

/* ─── Tipos auxiliares para formularios ─── */
export interface ProductoFormData {
  nombre: string;
  descripcion: string;
  precio: number;
  costo?: number;
  porcentaje_ganancia?: number;
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
      movimientos_caja: {
        Row: MovimientoCaja;
        Insert: Partial<MovimientoCaja>;
        Update: Partial<MovimientoCaja>;
        Relationships: [];
      };
      turnos_caja: {
        Row: TurnoCaja;
        Insert: Partial<TurnoCaja>;
        Update: Partial<TurnoCaja>;
        Relationships: [];
      };
      ventas: {
        Row: Venta;
        Insert: Partial<Venta>;
        Update: Partial<Venta>;
        Relationships: [];
      };
      venta_detalles: {
        Row: VentaDetalle;
        Insert: Partial<VentaDetalle>;
        Update: Partial<VentaDetalle>;
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

