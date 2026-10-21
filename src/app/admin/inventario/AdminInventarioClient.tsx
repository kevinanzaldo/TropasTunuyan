'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ProductoConVariantes, Categoria, Variante } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { formatPrecio } from '@/lib/utils';

interface Props {
  initialProductos: ProductoConVariantes[];
  categorias: Categoria[];
}

const DEFAULT_IMAGES: Record<string, string> = {
  'Uniforme Táctico Ripstop': '/productos/uniforme.png',
  'Borceguí Táctico Cuero': '/productos/borcegui.png',
  'Chaleco Antibalas Nivel IIIA': '/productos/chaleco.png',
  'Cinturón Táctico Militar': '/productos/cinturon.png',
  'Funda Pistolera Nivel II': '/productos/funda.png',
};

const CATEGORIA_META: Record<string, { desc: string; badgeColor: string }> = {
  'Calzado': {
    desc: 'Borceguíes tácticos de cuero, botas de asalto y calzado reglamentario',
    badgeColor: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/40',
  },
  'Protección': {
    desc: 'Chalecos balísticos certificados Nivel IIIA, placas y blindaje de alta resistencia',
    badgeColor: 'text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/40',
  },
  'Uniformes': {
    desc: 'Indumentaria técnica ripstop antidesgarro, pantalones de combate y chaquetillas',
    badgeColor: 'text-militar-800 dark:text-militar-300 bg-militar-50 dark:bg-militar-950/40 border-militar-300 dark:border-militar-800/40',
  },
  'Accesorios': {
    desc: 'Cinturones tácticos de rescate, fundas pistoleras de polímero y correaje reglamentario',
    badgeColor: 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/40',
  },
  'Insignias y Grados': {
    desc: 'Escudos nacionales bordados, parches velcrados oficiales y jerarquías institucionales',
    badgeColor: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/40',
  },
};

export default function AdminInventarioClient({ initialProductos, categorias }: Props) {
  const [productos, setProductos] = useState<ProductoConVariantes[]>(initialProductos);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos' | 'bajo-stock' | 'credencial'>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [vistaModo, setVistaModo] = useState<'agrupado' | 'plano'>('agrupado');

  // Estados de modales
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState<ProductoConVariantes | null>(null);
  const [productoAjusteStock, setProductoAjusteStock] = useState<ProductoConVariantes | null>(null);

  // Estado de mensajes y loading
  const [mensajeToast, setMensajeToast] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' = 'exito') => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  // Helper para obtener nombre de categoría
  const getNombreCategoria = (p: ProductoConVariantes) => {
    return p.categorias?.nombre || categorias.find((c) => c.id === p.categoria_id)?.nombre || 'General';
  };

  // ─── KPIs Calculados ───
  const totalVariantes = productos.reduce((sum, p) => sum + (p.variantes?.length || 0), 0);
  const totalStock = productos.reduce(
    (sum, p) => sum + (p.variantes?.reduce((vSum, v) => vSum + v.stock, 0) || 0),
    0
  );
  const conCredencial = productos.filter((p) => p.exige_credencial).length;
  const variantesBajoStock = productos.flatMap((p) =>
    (p.variantes || []).filter((v) => v.stock <= v.stock_minimo)
  ).length;

  // ─── Filtrado de productos ───
  const productosFiltrados = useMemo(() => {
    let res = [...productos];

    if (categoriaFiltro) {
      res = res.filter((p) => getNombreCategoria(p) === categoriaFiltro);
    }

    if (filtroAlerta === 'bajo-stock') {
      res = res.filter((p) => p.variantes?.some((v) => v.stock <= v.stock_minimo));
    } else if (filtroAlerta === 'credencial') {
      res = res.filter((p) => p.exige_credencial);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q) ||
          getNombreCategoria(p).toLowerCase().includes(q) ||
          p.variantes?.some((v) => v.talle.toLowerCase().includes(q) || v.color.toLowerCase().includes(q))
      );
    }

    return res;
  }, [productos, categoriaFiltro, filtroAlerta, busqueda]);

  // ─── Agrupación por Categorías ───
  const gruposPorCategoria = useMemo(() => {
    const grupos: Record<string, ProductoConVariantes[]> = {};

    // Inicializar grupos con las categorías disponibles en el orden establecido
    categorias.forEach((cat) => {
      grupos[cat.nombre] = [];
    });

    productosFiltrados.forEach((prod) => {
      const catNombre = getNombreCategoria(prod);
      if (!grupos[catNombre]) {
        grupos[catNombre] = [];
      }
      grupos[catNombre].push(prod);
    });

    // Devolver solo las categorías que tienen productos que coinciden con los filtros
    return Object.entries(grupos).filter(([nombre, prods]) => {
      if (categoriaFiltro) return nombre === categoriaFiltro;
      return prods.length > 0;
    });
  }, [productosFiltrados, categorias, categoriaFiltro]);

  // ─── Acción: Copiar Resumen de Stock ───
  const handleCopiarReporteStock = () => {
    let texto = `*INVENTARIO OPERATIVO - TROPAS TUNUYÁN*\n`;
    texto += `Fecha: ${new Date().toLocaleDateString('es-AR')}\n`;
    texto += `Total Unidades en Depósito: ${totalStock} | Artículos: ${productos.length}\n`;
    texto += `Variantes Bajo Stock: ${variantesBajoStock}\n\n`;

    const todasCategorias = Array.from(new Set(productos.map(getNombreCategoria)));
    todasCategorias.forEach((catNombre) => {
      const prods = productos.filter((p) => getNombreCategoria(p) === catNombre);
      const subtotal = prods.reduce((sum, p) => sum + (p.variantes?.reduce((vSum, v) => vSum + v.stock, 0) || 0), 0);
      texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `[${catNombre.toUpperCase()}] (${subtotal} unidades en stock):\n`;
      prods.forEach((p) => {
        const pTotal = p.variantes?.reduce((vSum, v) => vSum + v.stock, 0) || 0;
        const talles = p.variantes?.map((v) => `T.${v.talle}:${v.stock}`).join(' ') || 'Sin stock';
        texto += `• ${p.nombre} [Total: ${pTotal}]: ${talles}\n`;
      });
      texto += `\n`;
    });

    navigator.clipboard.writeText(texto);
    mostrarToast('Resumen de inventario copiado al portapapeles');
  };

  // ─── Acción: Toggle Credencial en 1 clic ───
  const handleToggleCredencial = async (producto: ProductoConVariantes) => {
    const nuevoValor = !producto.exige_credencial;
    // Optimista
    setProductos((prev) =>
      prev.map((p) => (p.id === producto.id ? { ...p, exige_credencial: nuevoValor } : p))
    );

    const { error } = await supabase
      .from('productos')
      .update({ exige_credencial: nuevoValor })
      .eq('id', producto.id);

    if (error) {
      mostrarToast(`Error al actualizar: ${error.message}`, 'error');
      // Revertir
      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, exige_credencial: !nuevoValor } : p))
      );
    } else {
      mostrarToast(`Requisito de credencial ${nuevoValor ? 'activado' : 'desactivado'}`);
    }
  };

  // ─── Acción: Ajuste rápido de stock de una variante ───
  const handleModificarStockVariante = async (varianteId: string, nuevoStock: number) => {
    if (nuevoStock < 0) return;

    // Actualización optimista
    setProductos((prev) =>
      prev.map((p) => ({
        ...p,
        variantes: p.variantes.map((v) => (v.id === varianteId ? { ...v, stock: nuevoStock } : v)),
      }))
    );

    if (productoAjusteStock) {
      setProductoAjusteStock((prev) =>
        prev
          ? {
              ...prev,
              variantes: prev.variantes.map((v) =>
                v.id === varianteId ? { ...v, stock: nuevoStock } : v
              ),
            }
          : null
      );
    }

    const { error } = await supabase
      .from('variantes')
      .update({ stock: nuevoStock })
      .eq('id', varianteId);

    if (error) {
      mostrarToast(`Error al guardar stock: ${error.message}`, 'error');
    } else {
      mostrarToast('Stock actualizado correctamente');
    }
  };

  // ─── Acción: Eliminar Producto ───
  const handleEliminarProducto = async (productoId: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"? Se borrarán también todas sus variantes.`)) {
      return;
    }

    setProductos((prev) => prev.filter((p) => p.id !== productoId));

    const { error } = await supabase.from('productos').delete().eq('id', productoId);

    if (error) {
      mostrarToast(`Error al eliminar: ${error.message}`, 'error');
    } else {
      mostrarToast(`"${nombre}" eliminado`);
    }
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {mensajeToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold transition-all animate-slide-up ${
            mensajeToast.tipo === 'error'
              ? 'bg-red-950 border border-red-700 text-red-200'
              : 'bg-emerald-950 border border-emerald-700 text-emerald-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          {mensajeToast.texto}
        </div>
      )}

      {/* ─── Encabezado ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-militar-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-militar-400">
              Panel de Administración
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white dark:text-white text-zinc-900 tracking-tight">
            Control de Inventario & Stock
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Gestión en tiempo real de artículos, precios oficiales, variantes y stock mínimo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalNuevoAbierto(true)}
            className="btn-primary text-xs sm:text-sm px-4 py-2.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Nuevo Producto
          </button>
          <Link
            href="/catalogo"
            className="btn-secondary text-xs sm:text-sm px-4 py-2.5"
            target="_blank"
          >
            Ver Catálogo
          </Link>
        </div>
      </div>

      {/* ─── 4 KPIs Métricas ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Productos */}
        <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Productos</span>
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-display font-black text-zinc-900 dark:text-white">{productos.length}</div>
          <div className="text-xs text-zinc-500 mt-1 font-medium">{categorias.length} categorías activas</div>
        </div>

        {/* KPI 2: Total Unidades */}
        <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock en Depósito</span>
            <div className="p-2 rounded-lg bg-militar-50 dark:bg-militar-600/20 text-militar-700 dark:text-militar-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-display font-black text-militar-700 dark:text-militar-400">{totalStock}</div>
          <div className="text-xs text-zinc-500 mt-1 font-medium">Unidades en {totalVariantes} variantes</div>
        </div>

        {/* KPI 3: Alertas de Stock Bajo */}
        <div
          onClick={() => setFiltroAlerta(filtroAlerta === 'bajo-stock' ? 'todos' : 'bajo-stock')}
          className={`card p-5 cursor-pointer transition-all ${
            filtroAlerta === 'bajo-stock'
              ? 'border-amber-300 dark:border-amber-500/80 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-400 dark:ring-amber-500/50'
              : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alertas de Stock</span>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-display font-black text-amber-700 dark:text-amber-400">{variantesBajoStock}</div>
          <div className="text-xs text-zinc-500 mt-1 font-medium">
            {filtroAlerta === 'bajo-stock' ? 'Filtrando bajo stock (Clic para reset)' : 'Variantes en o bajo stock mínimo'}
          </div>
        </div>

        {/* KPI 4: Con Credencial */}
        <div
          onClick={() => setFiltroAlerta(filtroAlerta === 'credencial' ? 'todos' : 'credencial')}
          className={`card p-5 cursor-pointer transition-all ${
            filtroAlerta === 'credencial'
              ? 'border-red-300 dark:border-red-500/80 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400 dark:ring-red-500/50'
              : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Uso Regulado</span>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-display font-black text-red-700 dark:text-red-400">{conCredencial}</div>
          <div className="text-xs text-zinc-500 mt-1 font-medium">
            {filtroAlerta === 'credencial' ? 'Filtrando regulados (Clic para reset)' : 'Artículos con control de credencial'}
          </div>
        </div>
      </div>

      {/* ─── Barra de Filtros, Búsqueda & Categorías ─── */}
      <div className="space-y-4">
        {/* Fila 1: Búsqueda y Filtros de Estado */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
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
              placeholder="Buscar por artículo, categoría, talle..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-600 transition-colors shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
            <button
              onClick={() => setFiltroAlerta('todos')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filtroAlerta === 'todos'
                  ? 'bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-900 dark:border-zinc-700 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Todos ({productos.length})
            </button>
            <button
              onClick={() => setFiltroAlerta('bajo-stock')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filtroAlerta === 'bajo-stock'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Bajo Stock ({variantesBajoStock})
            </button>
            <button
              onClick={() => setFiltroAlerta('credencial')}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filtroAlerta === 'credencial'
                  ? 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 border-red-300 dark:border-red-700 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Con Credencial ({conCredencial})
            </button>
          </div>
        </div>

        {/* Fila 2: Pestañas de Categorías & Selector de Vista */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Pestañas por Categoría (Swipe horizontal táctil en mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap sm:flex-wrap touch-pan-x -mx-2 px-2 sm:mx-0 sm:px-0">
            <button
              onClick={() => setCategoriaFiltro(null)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex-shrink-0 ${
                categoriaFiltro === null
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>Todas</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${categoriaFiltro === null ? 'bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                {productos.length}
              </span>
            </button>

            {categorias.map((cat) => {
              const count = productos.filter((p) => getNombreCategoria(p) === cat.nombre).length;
              const isSelected = categoriaFiltro === cat.nombre;

              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaFiltro(isSelected ? null : cat.nombre)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex-shrink-0 ${
                    isSelected
                      ? 'bg-militar-700 dark:bg-militar-500 text-white border-militar-700 dark:border-militar-500 shadow-xs ring-1 ring-militar-600'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <span>{cat.nombre}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-militar-900/40 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Acciones Rápidas & Switch de Modo */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            {/* Botón Copiar Resumen de Stock */}
            <button
              onClick={handleCopiarReporteStock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-xs"
              title="Copiar resumen detallado de stock al portapapeles para WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              <span>Copiar Reporte Stock</span>
            </button>

            {/* Alternar Vista */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => setVistaModo('agrupado')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  vistaModo === 'agrupado'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Dividir en secciones por categorías"
              >
                <span>Por Categorías</span>
              </button>
              <button
                onClick={() => setVistaModo('plano')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                  vistaModo === 'plano'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Mostrar tabla continua"
              >
                <span>Lista Continua</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── VISTA 1: DIVISIÓN POR CATEGORÍAS ─── */}
      {vistaModo === 'agrupado' && (
        <div className="space-y-6">
          {gruposPorCategoria.length === 0 ? (
            <div className="card p-12 text-center border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-zinc-400 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">No se encontraron artículos</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                No hay productos que coincidan con la búsqueda &quot;{busqueda}&quot; o los filtros seleccionados.
              </p>
              <button
                onClick={() => {
                  setBusqueda('');
                  setCategoriaFiltro(null);
                  setFiltroAlerta('todos');
                }}
                className="btn-secondary text-xs mt-4 px-4 py-1.5"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            gruposPorCategoria.map(([catNombre, prods]) => {
              const meta = CATEGORIA_META[catNombre] || {
                desc: 'Equipamiento táctico e indumentaria de servicio',
                badgeColor: 'text-zinc-800 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700',
              };
              const totalStockCat = prods.reduce(
                (sum, p) => sum + (p.variantes?.reduce((vSum, v) => vSum + v.stock, 0) || 0),
                0
              );

              return (
                <div
                  key={catNombre}
                  className="card overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm"
                >
                  {/* Encabezado de la Categoría */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-50 via-zinc-50/80 to-white dark:from-zinc-900/90 dark:via-zinc-900/70 dark:to-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-militar-500 flex-shrink-0" />
                        <h2 className="text-base sm:text-lg font-display font-black text-zinc-900 dark:text-white tracking-tight uppercase">
                          {catNombre}
                        </h2>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
                          {prods.length} {prods.length === 1 ? 'artículo' : 'artículos'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 pl-5">
                        {meta.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-2xs">
                        Stock en {catNombre}:{' '}
                        <span className="text-militar-700 dark:text-militar-400 font-extrabold">{totalStockCat}</span> unids
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Artículos de la Categoría */}
                  <div className="overflow-x-auto touch-pan-x">
                    <table className="w-full text-left text-xs sm:text-sm min-w-[620px]">
                      <thead className="bg-zinc-50/90 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="py-3 px-4">Artículo</th>
                          <th className="py-3 px-4">Precio</th>
                          <th className="py-3 px-4">Credencial</th>
                          <th className="py-3 px-4">Existencias por Talle</th>
                          <th className="py-3 px-4 text-center">Total</th>
                          <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                        {prods.map((producto) => {
                          const stockItemTotal = producto.variantes?.reduce((s, v) => s + v.stock, 0) || 0;
                          const imagenSrc = producto.imagen_url || DEFAULT_IMAGES[producto.nombre];

                          return (
                            <tr key={producto.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                              {/* Artículo con foto */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white flex-shrink-0 flex items-center justify-center shadow-xs">
                                    {imagenSrc ? (
                                      <Image src={imagenSrc} alt={producto.nombre} fill className="object-contain p-1" />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                        TT
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-zinc-900 dark:text-white text-sm">{producto.nombre}</div>
                                    {producto.descripcion && (
                                      <div className="text-[11px] text-zinc-500 line-clamp-1 max-w-xs">
                                        {producto.descripcion}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Precio */}
                              <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                                {formatPrecio(producto.precio)}
                              </td>

                              {/* Toggle Credencial */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleCredencial(producto)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                    producto.exige_credencial
                                      ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700/60 hover:bg-red-200 dark:hover:bg-red-900'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white'
                                  }`}
                                  title="Clic para cambiar requisito de credencial"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${producto.exige_credencial ? 'bg-red-500' : 'bg-zinc-400'}`} />
                                  {producto.exige_credencial ? 'Obligatoria' : 'Libre'}
                                </button>
                              </td>

                              {/* Variantes & Stock Pills */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1.5 max-w-md">
                                  {producto.variantes?.map((v) => {
                                    const esCritico = v.stock === 0;
                                    const esBajo = v.stock <= v.stock_minimo;
                                    return (
                                      <span
                                        key={v.id}
                                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                          esCritico
                                            ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800/60'
                                            : esBajo
                                            ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                                            : 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                                        }`}
                                        title={`${v.color} | Mín: ${v.stock_minimo}`}
                                      >
                                        T.{v.talle}: {v.stock}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Total Stock */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                                {stockItemTotal}
                              </td>

                              {/* Acciones */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Botón Ajustar Stock */}
                                  <button
                                    onClick={() => setProductoAjusteStock(producto)}
                                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-militar-600 dark:hover:bg-militar-600 text-zinc-700 dark:text-zinc-300 hover:text-white dark:hover:text-white border border-zinc-300 dark:border-transparent transition-colors shadow-xs"
                                    title="Ajustar stock de variantes"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    </svg>
                                  </button>

                                  {/* Botón Editar Producto */}
                                  <button
                                    onClick={() => setProductoAEditar(producto)}
                                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-transparent transition-colors shadow-xs"
                                    title="Editar producto"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    </svg>
                                  </button>

                                  {/* Botón Eliminar */}
                                  <button
                                    onClick={() => handleEliminarProducto(producto.id, producto.nombre)}
                                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-900/60 text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-200 border border-zinc-300 dark:border-transparent transition-colors shadow-xs"
                                    title="Eliminar producto"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 6h18" />
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── VISTA 2: LISTA CONTINUA TRADICIONAL ─── */}
      {vistaModo === 'plano' && (
        <div className="card overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-left text-xs sm:text-sm min-w-[680px]">
              <thead className="bg-zinc-50 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Artículo</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Precio</th>
                  <th className="py-3.5 px-4">Credencial</th>
                  <th className="py-3.5 px-4">Existencias por Talle</th>
                  <th className="py-3.5 px-4 text-center">Total</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No se encontraron artículos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((producto) => {
                    const stockItemTotal = producto.variantes?.reduce((s, v) => s + v.stock, 0) || 0;
                    const imagenSrc = producto.imagen_url || DEFAULT_IMAGES[producto.nombre];
                    const catNombre = getNombreCategoria(producto);

                    return (
                      <tr key={producto.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                        {/* Artículo con foto */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white flex-shrink-0 flex items-center justify-center shadow-xs">
                              {imagenSrc ? (
                                <Image src={imagenSrc} alt={producto.nombre} fill className="object-contain p-1" />
                              ) : (
                                <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                  TT
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white text-sm">{producto.nombre}</div>
                              {producto.descripcion && (
                                <div className="text-[11px] text-zinc-500 line-clamp-1 max-w-xs">
                                  {producto.descripcion}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap font-medium">
                          {catNombre}
                        </td>

                        {/* Precio */}
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {formatPrecio(producto.precio)}
                        </td>

                        {/* Toggle Credencial */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleCredencial(producto)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                              producto.exige_credencial
                                ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700/60 hover:bg-red-200 dark:hover:bg-red-900'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                            title="Clic para cambiar requisito de credencial"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${producto.exige_credencial ? 'bg-red-500' : 'bg-zinc-400'}`} />
                            {producto.exige_credencial ? 'Obligatoria' : 'Libre'}
                          </button>
                        </td>

                        {/* Variantes & Stock Pills */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {producto.variantes?.map((v) => {
                              const esCritico = v.stock === 0;
                              const esBajo = v.stock <= v.stock_minimo;
                              return (
                                <span
                                  key={v.id}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                    esCritico
                                      ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800/60'
                                      : esBajo
                                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                                      : 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                                  }`}
                                  title={`${v.color} | Mín: ${v.stock_minimo}`}
                                >
                                  T.{v.talle}: {v.stock}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Total Stock */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {stockItemTotal}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botón Ajustar Stock */}
                            <button
                              onClick={() => setProductoAjusteStock(producto)}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-militar-600 dark:hover:bg-militar-600 text-zinc-700 dark:text-zinc-300 hover:text-white dark:hover:text-white border border-zinc-300 dark:border-transparent transition-colors shadow-xs"
                              title="Ajustar stock de variantes"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              </svg>
                            </button>

                            {/* Botón Editar Producto */}
                            <button
                              onClick={() => setProductoAEditar(producto)}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-transparent transition-colors shadow-xs"
                              title="Editar producto"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                            </button>

                            {/* Botón Eliminar */}
                            <button
                              onClick={() => handleEliminarProducto(producto.id, producto.nombre)}
                              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-900/60 text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-200 border border-zinc-300 dark:border-transparent transition-colors shadow-xs"
                              title="Eliminar producto"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Ajuste de Stock por Variante ─── */}
      {productoAjusteStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white">
                  Ajuste de Stock — {productoAjusteStock.nombre}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Sumá o restá existencias por cada talle.</p>
              </div>
              <button
                onClick={() => setProductoAjusteStock(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            {/* Lista de variantes */}
            <div className="space-y-3">
              {productoAjusteStock.variantes?.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-white text-sm">
                      Talle {v.talle} <span className="text-xs text-zinc-500 font-normal">({v.color})</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">Mínimo alertado: {v.stock_minimo} unds.</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleModificarStockVariante(v.id, Math.max(0, v.stock - 5))}
                      className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300"
                      title="Restar 5"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => handleModificarStockVariante(v.id, Math.max(0, v.stock - 1))}
                      className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300"
                      title="Restar 1"
                    >
                      -1
                    </button>
                    <span className="w-12 text-center font-mono font-black text-sm text-zinc-900 dark:text-white">
                      {v.stock}
                    </span>
                    <button
                      onClick={() => handleModificarStockVariante(v.id, v.stock + 1)}
                      className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300"
                      title="Sumar 1"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleModificarStockVariante(v.id, v.stock + 5)}
                      className="px-2 py-1 rounded bg-militar-100 dark:bg-militar-600/30 hover:bg-militar-600 text-xs font-mono font-bold text-militar-800 dark:text-militar-300 hover:text-white"
                      title="Sumar 5"
                    >
                      +5
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button onClick={() => setProductoAjusteStock(null)} className="btn-primary text-xs">
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Editar Producto ─── */}
      {productoAEditar && (
        <ModalEditarProducto
          producto={productoAEditar}
          categorias={categorias}
          onClose={() => setProductoAEditar(null)}
          onGuardado={(prodActualizado) => {
            setProductos((prev) => prev.map((p) => (p.id === prodActualizado.id ? prodActualizado : p)));
            setProductoAEditar(null);
            mostrarToast('Producto actualizado correctamente');
          }}
        />
      )}

      {/* ─── MODAL 3: Alta de Nuevo Producto ─── */}
      {modalNuevoAbierto && (
        <ModalNuevoProducto
          categorias={categorias}
          onClose={() => setModalNuevoAbierto(false)}
          onCreado={(nuevoProd) => {
            setProductos((prev) => [nuevoProd, ...prev]);
            setModalNuevoAbierto(false);
            mostrarToast('Nuevo producto creado exitosamente');
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-Modal: Editar Producto
// ─────────────────────────────────────────────────────────────
function ModalEditarProducto({
  producto,
  categorias,
  onClose,
  onGuardado,
}: {
  producto: ProductoConVariantes;
  categorias: Categoria[];
  onClose: () => void;
  onGuardado: (p: ProductoConVariantes) => void;
}) {
  const [nombre, setNombre] = useState(producto.nombre);
  const [descripcion, setDescripcion] = useState(producto.descripcion || '');
  const [precio, setPrecio] = useState(producto.precio.toString());
  const [categoriaId, setCategoriaId] = useState(producto.categoria_id || '');
  const [exigeCredencial, setExigeCredencial] = useState(producto.exige_credencial);
  const [imagenUrl, setImagenUrl] = useState(producto.imagen_url || '');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const precioNum = parseFloat(precio) || 0;

    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre,
        descripcion,
        precio: precioNum,
        categoria_id: categoriaId || null,
        exige_credencial: exigeCredencial,
        imagen_url: imagenUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', producto.id)
      .select('*, variantes (*), categorias (*)')
      .single();

    setGuardando(false);

    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else {
      onGuardado(data as ProductoConVariantes);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Editar Producto</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Nombre del Producto</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Precio Oficial ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-militar-500"
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">URL de Imagen</label>
            <input
              type="text"
              placeholder="/productos/borcegui.png o https://..."
              value={imagenUrl}
              onChange={(e) => setImagenUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">Podés colocar la ruta local (/productos/...) o cualquier enlace web.</p>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Descripción</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="edit-credencial"
              checked={exigeCredencial}
              onChange={(e) => setExigeCredencial(e.target.checked)}
              className="w-4 h-4 rounded text-militar-600 focus:ring-militar-500 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="edit-credencial" className="text-zinc-800 dark:text-zinc-300 font-semibold">
              Requiere Credencial Obligatoria (Uso exclusivo Fuerzas)
            </label>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primary text-xs">
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-Modal: Nuevo Producto + Variantes Iniciales
// ─────────────────────────────────────────────────────────────
function ModalNuevoProducto({
  categorias,
  onClose,
  onCreado,
}: {
  categorias: Categoria[];
  onClose: () => void;
  onCreado: (p: ProductoConVariantes) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id || '');
  const [exigeCredencial, setExigeCredencial] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Variantes dinámicas a crear
  const [variantes, setVariantes] = useState<Array<{ talle: string; color: string; stock: number; stock_minimo: number }>>([
    { talle: 'M', color: 'Negro', stock: 10, stock_minimo: 3 },
    { talle: 'L', color: 'Negro', stock: 10, stock_minimo: 3 },
  ]);

  const agregarFilaVariante = () => {
    setVariantes([...variantes, { talle: 'XL', color: 'Negro', stock: 5, stock_minimo: 2 }]);
  };

  const quitarFilaVariante = (index: number) => {
    setVariantes(variantes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const precioNum = parseFloat(precio) || 0;

    // 1. Insertar Producto
    const { data: productoData, error: prodError } = await supabase
      .from('productos')
      .insert({
        nombre,
        descripcion,
        precio: precioNum,
        categoria_id: categoriaId || null,
        exige_credencial: exigeCredencial,
        imagen_url: imagenUrl || null,
        activo: true,
      })
      .select('*, categorias (*)')
      .single();

    if (prodError || !productoData) {
      alert(`Error al crear producto: ${prodError?.message}`);
      setGuardando(false);
      return;
    }

    // 2. Insertar Variantes
    const variantesAInsertar = variantes.map((v) => ({
      producto_id: productoData.id,
      talle: v.talle,
      color: v.color,
      stock: v.stock,
      stock_minimo: v.stock_minimo,
    }));

    const { data: varData, error: varError } = await supabase
      .from('variantes')
      .insert(variantesAInsertar)
      .select('*');

    setGuardando(false);

    if (varError) {
      alert(`Producto creado pero hubo error en variantes: ${varError.message}`);
    }

    const productoCompleto: ProductoConVariantes = {
      ...productoData,
      variantes: (varData as Variante[]) || [],
    };

    onCreado(productoCompleto);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white">Alta de Nuevo Producto</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Nombre</label>
              <input
                type="text"
                required
                placeholder="Ej. Guantes Tácticos Reforzados"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-500"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Precio Oficial ($)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-militar-500"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">URL de Imagen</label>
              <input
                type="text"
                placeholder="/productos/... o https://..."
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-zinc-400 font-semibold mb-1">Descripción</label>
            <textarea
              rows={2}
              placeholder="Características técnicas, materiales y uso..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-militar-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="new-credencial"
              checked={exigeCredencial}
              onChange={(e) => setExigeCredencial(e.target.checked)}
              className="w-4 h-4 rounded text-militar-600 focus:ring-militar-500 bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="new-credencial" className="text-zinc-800 dark:text-zinc-300 font-semibold">
              Requiere Credencial Obligatoria (Uso exclusivo Fuerzas)
            </label>
          </div>

          {/* Variantes Iniciales */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-wider">
                Variantes Iniciales (Talles / Colores / Stock)
              </label>
              <button
                type="button"
                onClick={agregarFilaVariante}
                className="text-xs text-militar-700 dark:text-militar-400 hover:text-militar-800 dark:hover:text-militar-300 font-semibold"
              >
                + Agregar Talle
              </button>
            </div>

            <div className="space-y-2">
              {variantes.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Talle"
                    value={v.talle}
                    onChange={(e) => {
                      const next = [...variantes];
                      next[i].talle = e.target.value;
                      setVariantes(next);
                    }}
                    className="w-20 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Color"
                    value={v.color}
                    onChange={(e) => {
                      const next = [...variantes];
                      next[i].color = e.target.value;
                      setVariantes(next);
                    }}
                    className="w-28 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) => {
                      const next = [...variantes];
                      next[i].stock = parseInt(e.target.value) || 0;
                      setVariantes(next);
                    }}
                    className="w-20 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Mínimo"
                    title="Stock mínimo para alerta"
                    value={v.stock_minimo}
                    onChange={(e) => {
                      const next = [...variantes];
                      next[i].stock_minimo = parseInt(e.target.value) || 0;
                      setVariantes(next);
                    }}
                    className="w-20 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-mono"
                  />
                  {variantes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarFilaVariante(i)}
                      className="p-1 text-zinc-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primary text-xs">
              {guardando ? 'Creando...' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
