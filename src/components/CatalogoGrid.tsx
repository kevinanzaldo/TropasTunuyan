'use client';

import { useState, useMemo } from 'react';
import type { ProductoConVariantes, Categoria } from '@/types/database';
import ProductoCard from './ProductoCard';
import ProductoModal from './ProductoModal';

interface Props {
  productos: ProductoConVariantes[];
  categorias: Categoria[];
}

type TipoOrden = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre-asc';
type TipoFiltroCredencial = 'todos' | 'sin-credencial' | 'con-credencial';

/**
 * Grid de productos con barra sticky combinada:
 * Buscador en tiempo real, filtros de categorías, ordenamiento por precio/nombre
 * y toggle de credencial obligatoria, más Modal de Quick-View / Pedido.
 */
export default function CatalogoGrid({ productos, categorias }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [orden, setOrden] = useState<TipoOrden>('destacados');
  const [filtroCredencial, setFiltroCredencial] = useState<TipoFiltroCredencial>('todos');

  // Estado para el producto seleccionado en el Quick-View Modal
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoConVariantes | null>(null);

  // Filtrado y ordenamiento combinado
  const productosFiltrados = useMemo(() => {
    let resultado = [...productos];

    // 1. Filtro por categoría
    if (categoriaActiva) {
      resultado = resultado.filter((p) => p.categoria_id === categoriaActiva);
    }

    // 2. Filtro por credencial
    if (filtroCredencial === 'sin-credencial') {
      resultado = resultado.filter((p) => !p.exige_credencial);
    } else if (filtroCredencial === 'con-credencial') {
      resultado = resultado.filter((p) => p.exige_credencial);
    }

    // 3. Filtro por texto de búsqueda
    if (busqueda.trim()) {
      const query = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          p.descripcion?.toLowerCase().includes(query) ||
          p.variantes.some(
            (v) =>
              v.talle.toLowerCase().includes(query) ||
              v.color.toLowerCase().includes(query)
          )
      );
    }

    // 4. Ordenamiento
    switch (orden) {
      case 'precio-asc':
        resultado.sort((a, b) => a.precio - b.precio);
        break;
      case 'precio-desc':
        resultado.sort((a, b) => b.precio - a.precio);
        break;
      case 'nombre-asc':
        resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'destacados':
      default:
        // Mantener orden original o productos activos
        break;
    }

    return resultado;
  }, [productos, categoriaActiva, filtroCredencial, busqueda, orden]);

  // Contar productos por categoría
  const conteoCategoria = useMemo(() => {
    const conteo: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.categoria_id) {
        conteo[p.categoria_id] = (conteo[p.categoria_id] || 0) + 1;
      }
    });
    return conteo;
  }, [productos]);

  const hayFiltrosActivos = busqueda !== '' || categoriaActiva !== null || filtroCredencial !== 'todos' || orden !== 'destacados';

  return (
    <div>
      {/* ─── Barra Combinada Sticky: Búsqueda, Filtros y Orden ─── */}
      <div className="sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 mb-8 bg-white/95 dark:bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/80 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Fila 1: Buscador + Selector de Ordenamiento + Filtro de Credencial */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Buscador */}
            <div className="relative flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar indumentaria, borceguí, talle, color..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-sm bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-600 focus:ring-1 focus:ring-militar-600 transition-colors"
                id="catalogo-search"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Selector de Orden y Filtro de Credencial */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <label htmlFor="select-orden" className="text-xs text-zinc-500 font-medium whitespace-nowrap hidden md:inline">
                  Ordenar:
                </label>
                <select
                  id="select-orden"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as TipoOrden)}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-militar-600 transition-colors"
                >
                  <option value="destacados">Destacados</option>
                  <option value="precio-asc">Menor precio</option>
                  <option value="precio-desc">Mayor precio</option>
                  <option value="nombre-asc">Nombre A-Z</option>
                </select>
              </div>

              {/* Toggle Filtro de Credencial */}
              <div className="flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-0.5 text-xs font-semibold flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltroCredencial('todos')}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all text-xs ${
                    filtroCredencial === 'todos'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCredencial('sin-credencial')}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all text-xs ${
                    filtroCredencial === 'sin-credencial'
                      ? 'bg-militar-600 text-white shadow-sm font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title="Artículos de venta libre sin requisito de credencial"
                >
                  <span className="hidden sm:inline">Venta Libre</span>
                  <span className="sm:hidden">Libre</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroCredencial('con-credencial')}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all text-xs ${
                    filtroCredencial === 'con-credencial'
                      ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700/60 shadow-sm font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title="Artículos exclusivos que requieren credencial"
                >
                  <span className="hidden sm:inline">Con Credencial</span>
                  <span className="sm:hidden">Credencial</span>
                </button>
              </div>
            </div>
          </div>

          {/* Fila 2: Píldoras de Categorías (Swipe horizontal táctil edge-to-edge en mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 touch-pan-x">
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                categoriaActiva === null
                  ? 'bg-militar-600 text-white shadow-md shadow-militar-600/20'
                  : 'bg-zinc-100 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Todas ({productos.length})
            </button>
            {categorias.map((cat) => {
              const cantidad = conteoCategoria[cat.id] || 0;
              const esActiva = categoriaActiva === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(esActiva ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    esActiva
                      ? 'bg-militar-600 text-white shadow-md shadow-militar-600/20'
                      : 'bg-zinc-100 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {cat.nombre} ({cantidad})
                </button>
              );
            })}

            {hayFiltrosActivos && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setCategoriaActiva(null);
                  setFiltroCredencial('todos');
                  setOrden('destacados');
                }}
                className="text-xs text-militar-700 dark:text-militar-400 hover:text-militar-800 dark:hover:text-militar-300 font-semibold whitespace-nowrap ml-auto underline underline-offset-4 flex-shrink-0 pl-2"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Encabezado de Resultados ─── */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <p>
          Mostrando <strong className="text-zinc-900 dark:text-zinc-200">{productosFiltrados.length}</strong> de {productos.length} artículos
        </p>
        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-600 uppercase hidden sm:inline">
          Precios oficiales
        </span>
      </div>

      {/* ─── Grid de Tarjetas de Producto ─── */}
      {productosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {productosFiltrados.map((producto, index) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              index={index}
              onSelect={(p) => setProductoSeleccionado(p)}
            />
          ))}
        </div>
      ) : (
        /* Estado vacío */
        <div className="text-center py-20 px-4 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-4 text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
            No se encontraron artículos
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto mb-6">
            No encontramos productos con los filtros seleccionados. Probá modificando el término de búsqueda o la categoría.
          </p>
          <button
            onClick={() => {
              setBusqueda('');
              setCategoriaActiva(null);
              setFiltroCredencial('todos');
            }}
            className="btn-primary text-xs"
          >
            Ver todos los productos
          </button>
        </div>
      )}

      {/* ─── Modal Interactivo de Quick-View & Reserva ─── */}
      {productoSeleccionado && (
        <ProductoModal
          producto={productoSeleccionado}
          onClose={() => setProductoSeleccionado(null)}
        />
      )}
    </div>
  );
}
