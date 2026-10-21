import { supabase } from '@/lib/supabase';
import type { ProductoConVariantes, Categoria } from '@/types/database';
import AdminInventarioClient from './AdminInventarioClient';

export const revalidate = 0; // Datos siempre en vivo para el administrador

async function getAdminData(): Promise<{
  productos: ProductoConVariantes[];
  categorias: Categoria[];
}> {
  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase
      .from('productos')
      .select('*, variantes (*), categorias (*)')
      .order('nombre', { ascending: true }),
    supabase.from('categorias').select('*').order('orden', { ascending: true }),
  ]);

  return {
    productos: (productos as ProductoConVariantes[]) || [],
    categorias: (categorias as Categoria[]) || [],
  };
}

/**
 * Página de Inventario del Panel de Administración.
 * Server Component que obtiene datos de Supabase y los pasa
 * al cliente interactivo con formularios, modales y ajuste de stock.
 */
export default async function AdminInventarioPage() {
  const { productos, categorias } = await getAdminData();

  return (
    <AdminInventarioClient
      initialProductos={productos}
      categorias={categorias}
    />
  );
}
