'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { ProductoConVariantes, MovimientoCaja } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { formatPrecio } from '@/lib/utils';

interface Props {
  initialProductos: ProductoConVariantes[];
  initialMovimientos: MovimientoCaja[];
}

// Movimientos iniciales de muestra representativos si la caja está vacía
const MOVIMIENTOS_SEED: MovimientoCaja[] = [
  {
    id: 'mov-1',
    tipo: 'ingreso',
    monto: 185000,
    concepto: 'Venta Chaleco Antibalas Nivel IIIA a personal policial',
    categoria_caja: 'Ventas Especiales',
    metodo_pago: 'transferencia',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'mov-2',
    tipo: 'ingreso',
    monto: 77800,
    concepto: 'Venta 2x Borceguí Táctico Cuero (T.40 y T.42)',
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: 'efectivo',
    producto_id: null,
    cantidad: 2,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'mov-3',
    tipo: 'egreso',
    monto: 34500,
    concepto: 'Reposición insumos y flete de fábrica militar',
    categoria_caja: 'Proveedores',
    metodo_pago: 'transferencia',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: 'mov-4',
    tipo: 'ingreso',
    monto: 45500,
    concepto: 'Venta 1x Uniforme Táctico Ripstop Verde Oliva',
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: 'tarjeta',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
  {
    id: 'mov-5',
    tipo: 'ingreso',
    monto: 37500,
    concepto: 'Venta 3x Cinturón Táctico Militar Hebilla Rápida',
    categoria_caja: 'Ventas Mostrador',
    metodo_pago: 'efectivo',
    producto_id: null,
    cantidad: 3,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
  {
    id: 'mov-6',
    tipo: 'egreso',
    monto: 12000,
    concepto: 'Mantenimiento y materiales de empaque y logística',
    categoria_caja: 'Gastos Operativos',
    metodo_pago: 'efectivo',
    producto_id: null,
    cantidad: 1,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'mov-7',
    tipo: 'ingreso',
    monto: 45600,
    concepto: 'Venta 2x Funda Pistolera Nivel II',
    categoria_caja: 'Ventas Especiales',
    metodo_pago: 'transferencia',
    producto_id: null,
    cantidad: 2,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
];

export default function AdminFinanzasClient({
  initialProductos,
  initialMovimientos,
}: Props) {
  const [productos] = useState<ProductoConVariantes[]>(initialProductos);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>(() => {
    if (initialMovimientos && initialMovimientos.length > 0) {
      return initialMovimientos;
    }
    return MOVIMIENTOS_SEED;
  });

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'egreso'>('todos');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modales y notificaciones
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [mensajeToast, setMensajeToast] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' = 'exito') => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  // Cargar de localStorage si no había en Supabase
  useEffect(() => {
    try {
      const guardados = localStorage.getItem('tropas_movimientos_caja');
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMovimientos(parsed);
        }
      }
    } catch {
      // Ignorar
    }
  }, []);

  // Guardar en localStorage cuando cambie
  const actualizarMovimientos = (nuevos: MovimientoCaja[]) => {
    setMovimientos(nuevos);
    try {
      localStorage.setItem('tropas_movimientos_caja', JSON.stringify(nuevos));
    } catch {
      // Ignorar
    }
  };

  // ─── KPIs Calculados ───
  const totalIngresos = useMemo(() => {
    return movimientos
      .filter((m) => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);
  }, [movimientos]);

  const totalEgresos = useMemo(() => {
    return movimientos
      .filter((m) => m.tipo === 'egreso')
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);
  }, [movimientos]);

  const saldoCaja = totalIngresos - totalEgresos;
  const margenOperativo = totalIngresos > 0 ? Math.round(((totalIngresos - totalEgresos) / totalIngresos) * 100) : 0;

  // ─── Ranking de Productos Más Vendidos en el Mes ───
  const rankingMasVendidos = useMemo(() => {
    // Mapa para acumular unidades e ingresos por producto
    const mapaProductos: Record<
      string,
      { nombre: string; unidades: number; ingresos: number; ganancia: number; imagen: string | null }
    > = {};

    // 1. Inicializar con los productos de la tienda
    productos.forEach((p) => {
      mapaProductos[p.id] = {
        nombre: p.nombre,
        unidades: 0,
        ingresos: 0,
        ganancia: 0,
        imagen: p.imagen_url,
      };
    });

    // 2. Procesar movimientos de tipo ingreso vinculados
    movimientos
      .filter((m) => m.tipo === 'ingreso')
      .forEach((m) => {
        const cant = m.cantidad || 1;
        // Si tiene producto_id
        if (m.producto_id && mapaProductos[m.producto_id]) {
          mapaProductos[m.producto_id].unidades += cant;
          mapaProductos[m.producto_id].ingresos += Number(m.monto);
          return;
        }

        // Si no tiene producto_id, buscar coincidencia por nombre en el concepto
        const prodEncontrado = productos.find((p) =>
          m.concepto.toLowerCase().includes(p.nombre.toLowerCase())
        );

        if (prodEncontrado && mapaProductos[prodEncontrado.id]) {
          mapaProductos[prodEncontrado.id].unidades += cant;
          mapaProductos[prodEncontrado.id].ingresos += Number(m.monto);
        }
      });

    // 3. Convertir a lista y ordenar por unidades e ingresos descendentes
    const lista = Object.values(mapaProductos)
      .filter((item) => item.unidades > 0 || item.ingresos > 0)
      .sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos);

    // Si aún no hay suficientes ventas registradas para el ranking, agregar simuladas del seed
    if (lista.length === 0) {
      return [
        { nombre: 'Chaleco Antibalas Nivel IIIA', unidades: 6, ingresos: 1110000, ganancia: 333000, imagen: '/productos/chaleco.png' },
        { nombre: 'Borceguí Táctico Cuero', unidades: 14, ingresos: 544600, ganancia: 163380, imagen: '/productos/borcegui.png' },
        { nombre: 'Uniforme Táctico Ripstop', unidades: 11, ingresos: 500500, ganancia: 150150, imagen: '/productos/uniforme.png' },
        { nombre: 'Cinturón Táctico Militar', unidades: 18, ingresos: 225000, ganancia: 90000, imagen: '/productos/cinturon.png' },
        { nombre: 'Funda Pistolera Nivel II', unidades: 8, ingresos: 182400, ganancia: 54720, imagen: '/productos/funda.png' },
      ];
    }

    return lista;
  }, [movimientos, productos]);

  const maxUnidades = rankingMasVendidos[0]?.unidades || 1;

  // ─── Filtrado de Movimientos ───
  const movimientosFiltrados = useMemo(() => {
    let res = [...movimientos];

    if (filtroTipo !== 'todos') {
      res = res.filter((m) => m.tipo === filtroTipo);
    }

    if (filtroMetodo !== 'todos') {
      res = res.filter((m) => m.metodo_pago === filtroMetodo);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter(
        (m) =>
          m.concepto.toLowerCase().includes(q) ||
          m.categoria_caja.toLowerCase().includes(q) ||
          m.metodo_pago.toLowerCase().includes(q)
      );
    }

    return res;
  }, [movimientos, filtroTipo, filtroMetodo, busqueda]);

  // ─── Acción: Copiar Cierre de Caja ───
  const handleCopiarCierreCaja = () => {
    const fecha = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let texto = `*TROPAS TUNUYÁN — CIERRE DIARIO DE CAJA*\n`;
    texto += `Fecha: ${fecha}\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `💰 Saldo Total en Caja: ${formatPrecio(saldoCaja)}\n`;
    texto += `📈 Total Ingresos:      ${formatPrecio(totalIngresos)}\n`;
    texto += `📉 Total Egresos:       ${formatPrecio(totalEgresos)}\n`;
    texto += `📊 Margen Operativo:    ${margenOperativo}%\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    texto += `*ÚLTIMOS MOVIMIENTOS REGISTRADOS:*\n`;
    movimientos.slice(0, 8).forEach((m) => {
      const signo = m.tipo === 'ingreso' ? '+' : '-';
      texto += `${signo} ${formatPrecio(m.monto)} | ${m.concepto} [${m.metodo_pago.toUpperCase()}]\n`;
    });

    texto += `\n*TOP 3 MÁS VENDIDOS:*\n`;
    rankingMasVendidos.slice(0, 3).forEach((item, idx) => {
      texto += `${idx + 1}. ${item.nombre}: ${item.unidades} u. (${formatPrecio(item.ingresos)})\n`;
    });

    navigator.clipboard.writeText(texto);
    mostrarToast('Cierre de caja copiado al portapapeles');
  };

  // ─── Acción: Eliminar Movimiento ───
  const handleEliminarMovimiento = async (id: string, concepto: string) => {
    if (!confirm(`¿Estás seguro de anular el movimiento "${concepto}"?`)) return;

    const actualizados = movimientos.filter((m) => m.id !== id);
    actualizarMovimientos(actualizados);

    try {
      await supabase.from('movimientos_caja').delete().eq('id', id);
    } catch {
      // Ignorar si no existe tabla en Supabase
    }

    mostrarToast(`Movimiento anulado`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
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

      {/* ─── Encabezado Táctico ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-militar-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-militar-600 dark:text-militar-400">
              Terminal de Control Financiero
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-zinc-900 dark:text-white tracking-tight">
            Caja, Ingresos & Rentabilidad
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Supervisión de liquidez, ingresos por ventas de equipamiento, costos y balance mensual.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={handleCopiarCierreCaja}
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5"
            title="Copiar balance para reporte diario de WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            Cierre de Caja
          </button>

          <button
            onClick={() => setModalNuevoAbierto(true)}
            className="btn-primary text-xs sm:text-sm px-4 py-2.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            + Registrar Movimiento
          </button>
        </div>
      </div>

      {/* ─── 4 KPIs Financieros ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo en Caja */}
        <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo en Caja</span>
            <div className="p-2 rounded-lg bg-militar-50 dark:bg-militar-600/20 text-militar-700 dark:text-militar-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-display font-black tracking-tight ${saldoCaja >= 0 ? 'text-zinc-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
            {formatPrecio(saldoCaja)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            {saldoCaja >= 0 ? '✓ Liquidez operativa positiva' : '⚠ Déficit de caja temporal'}
          </div>
        </div>

        {/* KPI 2: Ingresos Totales */}
        <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingresos (Ventas)</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
            +{formatPrecio(totalIngresos)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            {movimientos.filter((m) => m.tipo === 'ingreso').length} transacciones registradas
          </div>
        </div>

        {/* KPI 3: Egresos Totales */}
        <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Egresos / Gastos</span>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-red-700 dark:text-red-400 tracking-tight">
            -{formatPrecio(totalEgresos)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            {movimientos.filter((m) => m.tipo === 'egreso').length} compras y costos operativos
          </div>
        </div>

        {/* KPI 4: Margen Operativo */}
        <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Margen Operativo</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-militar-700 dark:text-militar-400 tracking-tight">
            {margenOperativo}%
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono">
            Eficiencia neta sobre ventas
          </div>
        </div>
      </div>

      {/* ─── Sección 1: Ranking de Productos Más Vendidos del Mes ─── */}
      <div className="card p-5 sm:p-6 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-base sm:text-lg font-display font-bold text-zinc-900 dark:text-white">
                Ranking Táctico: Productos Más Vendidos en el Mes
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Demanda de equipamiento táctico e indumentaria según salidas registradas
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-militar-50 dark:bg-militar-950/40 border border-militar-200 dark:border-militar-800/50 text-militar-700 dark:text-militar-400 self-start sm:self-auto">
            Período: Mes en Curso
          </span>
        </div>

        <div className="space-y-3">
          {rankingMasVendidos.map((prod, index) => {
            const porcentaje = Math.round((prod.unidades / maxUnidades) * 100);
            const esTop1 = index === 0;

            return (
              <div
                key={prod.nombre}
                className="p-3 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-militar-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Badge de Posición */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs flex-shrink-0 shadow-xs ${
                      esTop1
                        ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-400/50'
                        : index === 1
                        ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                        {prod.nombre}
                      </span>
                      {esTop1 && (
                        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                          ★ Líder de Ventas
                        </span>
                      )}
                    </div>

                    {/* Barra de Progreso Visual */}
                    <div className="mt-2 w-full max-w-md h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-militar-600 to-militar-500 transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Métricas del Producto */}
                <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center text-xs font-mono">
                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px] uppercase">Unidades</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">
                      {prod.unidades} u.
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px] uppercase">Facturación</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatPrecio(prod.ingresos)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Sección 2: Libro Diario de Movimientos de Caja ─── */}
      <div className="card p-5 sm:p-6 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold text-zinc-900 dark:text-white">
              Libro Diario de Caja
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Registro secuencial de ingresos por venta de artículos y egresos operativos
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtros Tipo */}
            <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFiltroTipo('todos')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filtroTipo === 'todos'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Todos ({movimientos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('ingreso')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filtroTipo === 'ingreso'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Ingresos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('egreso')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  filtroTipo === 'egreso'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Egresos
              </button>
            </div>

            {/* Selector de Método de Pago */}
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="todos">Todos los Métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta / QR</option>
            </select>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
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
            placeholder="Buscar movimiento por concepto, categoría o detalle..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
          />
        </div>

        {/* Tabla / Lista de Movimientos */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/40">
          {movimientosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs sm:text-sm">
              No se encontraron movimientos con los filtros seleccionados.
            </div>
          ) : (
            movimientosFiltrados.map((mov) => {
              const esIngreso = mov.tipo === 'ingreso';
              const fechaStr = new Date(mov.created_at).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={mov.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Icono Táctico de Ingreso/Egreso */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        esIngreso
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                      }`}
                    >
                      {esIngreso ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                          {mov.concepto}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {mov.categoria_caja}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-militar-50 dark:bg-militar-950 text-militar-700 dark:text-militar-400 border border-militar-200 dark:border-militar-800/40">
                          {mov.metodo_pago}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
                        {fechaStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center">
                    <span
                      className={`text-sm sm:text-base font-display font-black tracking-tight ${
                        esIngreso ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {esIngreso ? '+' : '-'} {formatPrecio(mov.monto)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleEliminarMovimiento(mov.id, mov.concepto)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Anular movimiento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MODAL: Registrar Movimiento de Caja ─── */}
      {modalNuevoAbierto && (
        <ModalNuevoMovimiento
          productos={productos}
          onClose={() => setModalNuevoAbierto(false)}
          onCreado={(nuevoMov) => {
            actualizarMovimientos([nuevoMov, ...movimientos]);
            setModalNuevoAbierto(false);
            mostrarToast('Movimiento registrado en caja correctamente');
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-Modal: Alta de Movimiento de Caja
// ─────────────────────────────────────────────────────────────
function ModalNuevoMovimiento({
  productos,
  onClose,
  onCreado,
}: {
  productos: ProductoConVariantes[];
  onClose: () => void;
  onCreado: (m: MovimientoCaja) => void;
}) {
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [monto, setMonto] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('');
  const [categoriaCaja, setCategoriaCaja] = useState<string>('Ventas Mostrador');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'otro'>('efectivo');
  const [productoId, setProductoId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [guardando, setGuardando] = useState(false);

  // Cuando se selecciona un producto, sugerir monto y concepto automáticamente
  const handleSeleccionarProducto = (pId: string) => {
    setProductoId(pId);
    if (!pId) return;

    const prod = productos.find((p) => p.id === pId);
    if (prod) {
      if (!concepto.trim() || concepto.startsWith('Venta')) {
        setConcepto(`Venta ${cantidad}x ${prod.nombre}`);
      }
      setMonto((prod.precio * cantidad).toString());
    }
  };

  // Manejar cambio en cantidad
  const handleCantidadChange = (nuevaCant: number) => {
    setCantidad(nuevaCant);
    if (productoId) {
      const prod = productos.find((p) => p.id === productoId);
      if (prod) {
        setMonto((prod.precio * nuevaCant).toString());
        setConcepto(`Venta ${nuevaCant}x ${prod.nombre}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto) || 0;
    if (montoNum <= 0) {
      alert('Ingresá un monto válido mayor a 0');
      return;
    }

    setGuardando(true);

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      tipo,
      monto: montoNum,
      concepto: concepto.trim() || (tipo === 'ingreso' ? 'Ingreso a caja' : 'Egreso operativo'),
      categoria_caja: categoriaCaja,
      metodo_pago: metodoPago,
      producto_id: productoId || null,
      cantidad: productoId ? cantidad : null,
      created_at: new Date().toISOString(),
    };

    // Intentar persistir en Supabase
    try {
      await supabase.from('movimientos_caja').insert({
        tipo: nuevoMov.tipo,
        monto: nuevoMov.monto,
        concepto: nuevoMov.concepto,
        categoria_caja: nuevoMov.categoria_caja,
        metodo_pago: nuevoMov.metodo_pago,
        producto_id: nuevoMov.producto_id,
        cantidad: nuevoMov.cantidad,
      });
    } catch {
      // Ignorar si la tabla aún no existe en Supabase
    }

    setGuardando(false);
    onCreado(nuevoMov);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-white">
              Registrar Movimiento de Caja
            </h3>
            <p className="text-xs text-zinc-500">Ingreso por ventas o egreso operativo</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Selector de Tipo: Ingreso / Egreso */}
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1.5">
              Tipo de Movimiento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipo('ingreso');
                  setCategoriaCaja('Ventas Mostrador');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  tipo === 'ingreso'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <span>↑</span>
                <span>Ingreso (+ Dinero)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipo('egreso');
                  setCategoriaCaja('Proveedores');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  tipo === 'egreso'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <span>↓</span>
                <span>Egreso (- Gasto)</span>
              </button>
            </div>
          </div>

          {/* Monto ($) */}
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              Monto en Pesos ($) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 font-mono font-bold">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 text-sm font-mono font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
              />
            </div>
          </div>

          {/* Vincular Producto del Catálogo (Opcional) */}
          {tipo === 'ingreso' && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Vincular a Artículo del Catálogo (Opcional)
                </label>
                <span className="text-[10px] text-militar-600 dark:text-militar-400 font-mono">
                  Alimenta ranking de ventas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <select
                    value={productoId}
                    onChange={(e) => handleSeleccionarProducto(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
                  >
                    <option value="">Seleccionar artículo vendido...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({formatPrecio(p.precio)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Cantidad"
                    value={cantidad}
                    onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Concepto / Descripción */}
          <div>
            <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              Concepto / Detalle *
            </label>
            <input
              type="text"
              required
              placeholder={tipo === 'ingreso' ? 'Ej. Venta 2x Borceguíes Tácticos' : 'Ej. Compra tela Ripstop / Pago de flete'}
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
          </div>

          {/* Método de Pago y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
              >
                <option value="efectivo">Efectivo en Caja</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="tarjeta">Tarjeta Débito/Crédito</option>
                <option value="otro">QR / MercadoPago / Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                Categoría Financiera
              </label>
              <input
                type="text"
                value={categoriaCaja}
                onChange={(e) => setCategoriaCaja(e.target.value)}
                placeholder="Ventas, Proveedores, etc."
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`text-xs px-5 py-2.5 rounded-lg font-bold text-white transition-all ${
                tipo === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {guardando ? 'Guardando...' : tipo === 'ingreso' ? '+ Guardar Ingreso' : '- Guardar Egreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
