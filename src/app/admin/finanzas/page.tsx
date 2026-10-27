import { supabase } from '@/lib/supabase';
import type { ProductoConVariantes, MovimientoCaja } from '@/types/database';
import AdminFinanzasClient from './AdminFinanzasClient';

export const revalidate = 0; // Datos siempre frescos para el control financiero

async function getFinanzasData(): Promise<{
  productos: ProductoConVariantes[];
  movimientos: MovimientoCaja[];
}> {
  // 1. Obtener productos para relacionar ventas, costos y catálogo
  const { data: productos } = await supabase
    .from('productos')
    .select('*, variantes (*), categorias (*)')
    .order('nombre', { ascending: true });

  // 2. Intentar obtener movimientos de caja desde Supabase
  let movimientos: MovimientoCaja[] = [];
  try {
    const { data: movData, error } = await supabase
      .from('movimientos_caja')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && movData) {
      movimientos = movData as MovimientoCaja[];
    }
  } catch (err) {
    console.warn('Tabla movimientos_caja no accesible en Supabase:', err);
  }

  return {
    productos: (productos as ProductoConVariantes[]) || [],
    movimientos,
  };
}

export default async function AdminFinanzasPage() {
  const { productos, movimientos } = await getFinanzasData();

  return (
    <AdminFinanzasClient
      initialProductos={productos}
      initialMovimientos={movimientos}
    />
  );
}
