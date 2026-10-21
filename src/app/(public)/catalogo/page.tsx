import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import type { ProductoConVariantes, Categoria } from '@/types/database';
import CatalogoGrid from '@/components/CatalogoGrid';

export const metadata: Metadata = {
  title: 'Catálogo — Tropas Tunuyán',
  description:
    'Explorá nuestro catálogo completo de equipamiento táctico e indumentaria militar. ' +
    'Precios, talles y disponibilidad actualizados.',
};

/* Revalidar cada 60 segundos para mantener datos frescos */
export const revalidate = 60;

/**
 * Obtiene productos con variantes y categoría desde Supabase.
 * Server Component — sin estado del lado del cliente.
 */
async function getProductos(): Promise<ProductoConVariantes[]> {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      variantes (*),
      categorias (*)
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error al obtener productos:', error.message);
    return [];
  }

  return (data as ProductoConVariantes[]) ?? [];
}

/**
 * Obtiene todas las categorías.
 */
async function getCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true });

  if (error) {
    console.error('Error al obtener categorías:', error.message);
    return [];
  }

  return (data as Categoria[]) ?? [];
}

/**
 * Página del catálogo público.
 * Server Component que obtiene datos de Supabase y los pasa
 * al componente interactivo del grid.
 */
export default async function CatalogoPage() {
  const [productos, categorias] = await Promise.all([
    getProductos(),
    getCategorias(),
  ]);

  return (
    <div className="min-h-screen">
      {/* ─── Hero Banner Táctico Refinado ─── */}
      <section className="relative overflow-hidden border-b border-zinc-300 dark:border-zinc-800/80 bg-zinc-100/90 dark:bg-zinc-950 bg-tactical-grid py-12 sm:py-16 transition-colors">
        {/* Glows ambientales tácticos */}
        <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-militar-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -z-10 w-80 h-80 bg-militar-950/20 dark:bg-militar-950/40 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Tag técnico de división */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-militar-700 dark:text-militar-400 text-xs font-mono font-semibold tracking-wider uppercase mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-militar-500 animate-pulse" />
              División Fuerzas Armadas & Seguridad Privada
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight mb-4">
              Catálogo Operativo <span className="text-gradient">& Táctico</span>
            </h1>

            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed mb-6">
              Equipamiento homologado, indumentaria de alta resistencia y complementos tácticos para servicio activo y operaciones de campo.
            </p>

            {/* Banner de Aviso Legal y Credencial */}
            <div className="rounded-xl bg-white/95 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-800/90 p-4 sm:p-5 backdrop-blur-sm flex flex-col sm:flex-row items-start gap-3.5 shadow-md">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-700/40 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="text-xs sm:text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                    Control de Adquisición Regulada
                  </span>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/40">
                    Artículos con Credencial
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Los artículos señalados con la etiqueta de credencial (chalecos balísticos, fundas de retención, insignias) requieren acreditar condición de personal activo de fuerzas policiales, militares, penitenciarias o seguridad privada habilitada.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contenedor del Catálogo y Filtros ─── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CatalogoGrid productos={productos} categorias={categorias} />
        </div>
      </section>
    </div>
  );
}
