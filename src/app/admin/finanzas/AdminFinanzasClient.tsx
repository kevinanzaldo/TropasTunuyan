'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { ProductoConVariantes, MovimientoCaja, TurnoCaja } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { formatPrecio } from '@/lib/utils';
import {
  sincronizarMovimientos,
  guardarListaMovimientos,
  EVENTO_FINANZAS_ACTUALIZADAS,
  obtenerVentasHistorial,
  obtenerHistorialTurnos,
  obtenerTurnoActivo,
  EVENTO_TURNO_ACTUALIZADO,
  MOVIMIENTOS_SEED,
} from '@/lib/finanzas';

interface Props {
  initialProductos: ProductoConVariantes[];
  initialMovimientos: MovimientoCaja[];
}

export default function AdminFinanzasClient({
  initialProductos,
  initialMovimientos,
}: Props) {
  const [productos] = useState<ProductoConVariantes[]>(initialProductos);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>(() =>
    sincronizarMovimientos(initialMovimientos)
  );

  // Pestaña activa: Movimientos vs Auditoría de Turnos (HU 3.3)
  const [vistaActiva, setVistaActiva] = useState<'movimientos' | 'turnos'>('movimientos');
  const [turnos, setTurnos] = useState<TurnoCaja[]>(() => {
    if (typeof window !== 'undefined') {
      return obtenerHistorialTurnos();
    }
    return [];
  });
  const [turnoActivo, setTurnoActivo] = useState<TurnoCaja | null>(null);

  // Filtros de movimientos
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

  // Función para sincronizar con almacenamiento local y eventos del POS
  const sincronizarDatosCaja = useCallback(() => {
    const sincronizados = sincronizarMovimientos(initialMovimientos);
    setMovimientos(sincronizados);
  }, [initialMovimientos]);

  const actualizarTurnos = useCallback(() => {
    setTurnos(obtenerHistorialTurnos());
    setTurnoActivo(obtenerTurnoActivo());
  }, []);

  // Suscribirse a cambios en tiempo real desde el POS o eventos de storage
  useEffect(() => {
    sincronizarDatosCaja();
    actualizarTurnos();

    window.addEventListener(EVENTO_FINANZAS_ACTUALIZADAS, sincronizarDatosCaja);
    window.addEventListener(EVENTO_TURNO_ACTUALIZADO, actualizarTurnos);
    window.addEventListener('storage', () => {
      sincronizarDatosCaja();
      actualizarTurnos();
    });
    window.addEventListener('focus', () => {
      sincronizarDatosCaja();
      actualizarTurnos();
    });

    return () => {
      window.removeEventListener(EVENTO_FINANZAS_ACTUALIZADAS, sincronizarDatosCaja);
      window.removeEventListener(EVENTO_TURNO_ACTUALIZADO, actualizarTurnos);
      window.removeEventListener('storage', sincronizarDatosCaja);
      window.removeEventListener('focus', sincronizarDatosCaja);
    };
  }, [sincronizarDatosCaja, actualizarTurnos]);

  // Guardar y propagar cambios de movimientos
  const actualizarMovimientos = (nuevos: MovimientoCaja[]) => {
    setMovimientos(nuevos);
    guardarListaMovimientos(nuevos);
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

    // 2. Procesar el historial de ventas reales del POS
    const ventasHistorial = obtenerVentasHistorial();
    ventasHistorial.forEach((vta) => {
      (vta.items || []).forEach((it) => {
        let targetId = it.producto_id;
        if (!targetId || !mapaProductos[targetId]) {
          const match = productos.find(
            (p) => p.nombre.toLowerCase().trim() === it.nombre.toLowerCase().trim()
          );
          if (match) targetId = match.id;
        }

        if (targetId && mapaProductos[targetId]) {
          mapaProductos[targetId].unidades += it.cantidad;
          mapaProductos[targetId].ingresos += it.subtotal;
          const prodRef = productos.find((p) => p.id === targetId);
          const costoUnitario = prodRef?.costo || it.precio * 0.65;
          mapaProductos[targetId].ganancia += (it.precio - costoUnitario) * it.cantidad;
        }
      });
    });

    // 3. Procesar movimientos de tipo ingreso que no correspondan a una venta POS ya computada
    movimientos
      .filter((m) => m.tipo === 'ingreso' && !m.concepto.startsWith('Venta Mostrador TT-'))
      .forEach((m) => {
        const cant = m.cantidad || 1;
        if (m.producto_id && mapaProductos[m.producto_id]) {
          mapaProductos[m.producto_id].unidades += cant;
          mapaProductos[m.producto_id].ingresos += Number(m.monto);
          return;
        }

        const prodEncontrado = productos.find((p) =>
          m.concepto.toLowerCase().includes(p.nombre.toLowerCase())
        );

        if (prodEncontrado && mapaProductos[prodEncontrado.id]) {
          mapaProductos[prodEncontrado.id].unidades += cant;
          mapaProductos[prodEncontrado.id].ingresos += Number(m.monto);
        }
      });

    // 4. Convertir a lista y ordenar por unidades e ingresos descendentes
    const lista = Object.values(mapaProductos)
      .filter((item) => item.unidades > 0 || item.ingresos > 0)
      .sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos);

    // Si aún no hay ventas registradas para el ranking, agregar simuladas del seed
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

  // ─── KPIs de Turnos y Arqueos Ciegos (HU 3.3) ───
  const metricasTurnos = useMemo(() => {
    const cerrados = turnos.filter((t) => t.estado === 'cerrado');
    const totalCerrados = cerrados.length;
    const exactos = cerrados.filter((t) => (t.diferencia ?? 0) === 0).length;
    const dentroTolerancia = cerrados.filter((t) => {
      const esperado = t.monto_cierre_esperado || 1;
      const desvioPct = (Math.abs(t.diferencia ?? 0) / esperado) * 100;
      return desvioPct <= 0.5;
    }).length;
    const porcentajeCumplimiento = totalCerrados > 0 ? Math.round((dentroTolerancia / totalCerrados) * 100) : 100;
    const desvioNeto = cerrados.reduce((sum, t) => sum + (t.diferencia ?? 0), 0);

    return {
      total: turnos.length,
      cerrados: totalCerrados,
      exactos,
      porcentajeCumplimiento,
      desvioNeto,
    };
  }, [turnos]);

  // ─── Acción: Exportación a Excel / CSV Oficial (HU 4.3) ───
  const handleExportarExcelCSV = () => {
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Encabezado con BOM (\uFEFF) para compatibilidad nativa con Microsoft Excel en español (acentos y monedas)
    let csv = '\uFEFF';
    csv += 'TROPAS TUNUYÁN — REPORTE FINANCIERO Y AUDITORÍA DE CAJA\r\n';
    csv += `Fecha y Hora de Emisión;${new Date().toLocaleString('es-AR')}\r\n`;
    csv += `Saldo en Caja;${saldoCaja}\r\n`;
    csv += `Total Ingresos;${totalIngresos}\r\n`;
    csv += `Total Egresos;${totalEgresos}\r\n`;
    csv += `Margen Operativo;${margenOperativo}%\r\n\r\n`;

    csv += '====================================================================\r\n';
    csv += 'LIBRO DIARIO DE MOVIMIENTOS DE CAJA\r\n';
    csv += '====================================================================\r\n';
    csv += 'ID;Fecha;Tipo;Concepto;Categoría;Método de Pago;Monto ($)\r\n';

    movimientos.forEach((m) => {
      const fecha = new Date(m.created_at).toLocaleString('es-AR');
      const tipo = m.tipo.toUpperCase();
      const concepto = `"${(m.concepto || '').replace(/"/g, '""')}"`;
      const cat = `"${(m.categoria_caja || '').replace(/"/g, '""')}"`;
      const metodo = (m.metodo_pago || '').toUpperCase();
      const monto = m.monto;
      csv += `${m.id};${fecha};${tipo};${concepto};${cat};${metodo};${monto}\r\n`;
    });

    csv += '\r\n====================================================================\r\n';
    csv += 'AUDITORÍA DE TURNOS Y ARQUEOS CIEGOS (HU 3.3)\r\n';
    csv += '====================================================================\r\n';
    csv += 'ID Turno;Cajero;Fecha Apertura;Fecha Cierre;Fondo Inicial;Ventas Efectivo;Ventas Digitales;Esperado en Cajón;Declarado Ciego;Diferencia ($);Estado;Cumple KPI (<=0.5%);Observaciones\r\n';

    turnos.forEach((t) => {
      const ap = t.fecha_apertura ? new Date(t.fecha_apertura).toLocaleString('es-AR') : '-';
      const ci = t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleString('es-AR') : 'Turno Abierto';
      const esperado = t.monto_cierre_esperado ?? (t.monto_apertura + (t.total_ventas_efectivo || 0));
      const declarado = t.monto_cierre_declarado !== null ? t.monto_cierre_declarado : '-';
      const dif = t.diferencia !== null ? t.diferencia : '-';
      const desvioPct = esperado > 0 && typeof dif === 'number' ? (Math.abs(dif) / esperado) * 100 : 0;
      const cumpleKPI = typeof dif === 'number' ? (desvioPct <= 0.5 ? 'SÍ (Excelente)' : 'NO (Alerta de Desvío)') : '-';
      const obs = `"${(t.observaciones || '').replace(/"/g, '""')}"`;
      csv += `${t.id};${t.cajero_nombre};${ap};${ci};${t.monto_apertura};${t.total_ventas_efectivo || 0};${t.total_ventas_digital || 0};${esperado};${declarado};${dif};${t.estado.toUpperCase()};${cumpleKPI};${obs}\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tropas_Tunuyan_Caja_Finanzas_${fechaHoy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarToast('Planilla CSV descargada para Excel');
  };

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
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
            Supervisión de liquidez, ingresos por ventas de equipamiento, costos y auditoría ciega de turnos.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <Link
            href="/admin/pos"
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 flex items-center gap-1.5"
            title="Abrir Punto de Venta en mostrador"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-militar-600 dark:text-militar-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Ir a POS</span>
          </Link>

          <button
            onClick={handleExportarExcelCSV}
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 flex items-center gap-1.5 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 transition-colors"
            title="Exportar reporte de movimientos y turnos a Excel / CSV (HU 4.3)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleCopiarCierreCaja}
            className="btn-secondary text-xs sm:text-sm px-3.5 py-2.5 flex items-center gap-1.5"
            title="Copiar balance para reporte diario de WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            <span>Cierre Diario</span>
          </button>

          <button
            onClick={() => setModalNuevoAbierto(true)}
            className="btn-primary text-xs sm:text-sm px-4 py-2.5 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>+ Movimiento</span>
          </button>
        </div>
      </div>

      {/* ─── Pestañas Principales: Movimientos vs Auditoría de Turnos (HU 3.3) ─── */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 sm:gap-6 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setVistaActiva('movimientos')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            vistaActiva === 'movimientos'
              ? 'border-militar-600 text-militar-700 dark:text-militar-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Movimientos & Rentabilidad
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {movimientos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setVistaActiva('turnos')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            vistaActiva === 'turnos'
              ? 'border-militar-600 text-militar-700 dark:text-militar-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Auditoría de Turnos & Arqueos Ciegos (HU 3.3)
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-militar-100 dark:bg-militar-950 text-militar-800 dark:text-militar-300 border border-militar-200 dark:border-militar-800/40">
            {turnos.length}
          </span>
          {turnoActivo && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Turno activo en mostrador" />
          )}
        </button>
      </div>

      {/* ─── VISTA 1: MOVIMIENTOS & RENTABILIDAD GENERAL ─── */}
      {vistaActiva === 'movimientos' ? (
        <div className="space-y-8 animate-fade-in">
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
                  <option value="transferencia">Transferencia (Alias MP)</option>
                  <option value="tarjeta">Tarjeta (Postnet)</option>
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
        </div>
      ) : (
        /* ─── VISTA 2: AUDITORÍA DE TURNOS Y ARQUEOS CIEGOS (HU 3.3) ─── */
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* 4 KPIs de Turnos & Arqueo Ciego */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metrica 1: Total Turnos Auditados */}
            <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Turnos Auditados</span>
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-zinc-900 dark:text-white tracking-tight">
                {metricasTurnos.total}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                {metricasTurnos.cerrados} cerrados y auditados
              </div>
            </div>

            {/* Metrica 2: Arqueos Exactos */}
            <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Arqueos Exactos ($0)</span>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                {metricasTurnos.exactos}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                Desviación nula en rendición
              </div>
            </div>

            {/* Metrica 3: Cumplimiento SMART KPI (<= 0.5%) */}
            <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Cumplimiento KPI SMART</span>
                <div className="p-2 rounded-lg bg-militar-50 dark:bg-militar-600/20 text-militar-700 dark:text-militar-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-display font-black text-militar-700 dark:text-militar-400 tracking-tight">
                {metricasTurnos.porcentajeCumplimiento}%
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                Tolerancia de desvío ≤ 0,5%
              </div>
            </div>

            {/* Metrica 4: Desvío Neto Total */}
            <div className="card p-5 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Desvío Acumulado</span>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" x2="12" y1="2" y2="22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-display font-black tracking-tight ${
                  metricasTurnos.desvioNeto === 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : metricasTurnos.desvioNeto > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {metricasTurnos.desvioNeto > 0 ? '+' : ''}
                {formatPrecio(metricasTurnos.desvioNeto)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                {metricasTurnos.desvioNeto >= 0 ? 'Sobrante compensado' : 'Faltante de caja'}
              </div>
            </div>
          </div>

          {/* Banner de Turno Activo en Mostrador */}
          {turnoActivo ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white">
                      Turno Activo en Mostrador #{turnoActivo.id.replace('turno-', '')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      En Curso
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Operador: <strong className="text-zinc-900 dark:text-zinc-200">{turnoActivo.cajero_nombre}</strong> · Fondo de cambio:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">{formatPrecio(turnoActivo.monto_apertura)}</strong> · Iniciado:{' '}
                    {new Date(turnoActivo.fecha_apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                  </p>
                </div>
              </div>

              <Link
                href="/admin/pos"
                className="btn-primary text-xs sm:text-sm px-4 py-2 self-start sm:self-auto flex items-center gap-2"
              >
                <span>Operar o Arqueo Ciego en POS</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span>No hay ningún turno de mostrador abierto actualmente.</span>
              </div>
              <Link href="/admin/pos" className="font-semibold text-militar-600 dark:text-militar-400 hover:underline">
                Abrir turno desde el POS →
              </Link>
            </div>
          )}

          {/* Explicación Táctica del Protocolo (HU 3.3) */}
          <div className="p-4 rounded-xl bg-militar-50/60 dark:bg-militar-950/20 border border-militar-200 dark:border-militar-800/40 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-3">
            <div className="w-5 h-5 rounded-md bg-militar-600 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5">
              i
            </div>
            <div className="space-y-1">
              <span className="font-bold text-zinc-900 dark:text-white block">
                Protocolo de Arqueo Ciego Obligatorio (HU 3.3)
              </span>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                El cajero declara la cantidad física de billetes y monedas que posee en su gaveta <strong>sin ver previamente</strong> el monto computado por el sistema. Una vez asentada la rendición, el sistema calcula la desviación exacta: <code>Diferencia = Declarado − (Fondo Inicial + Ventas Efectivo)</code>. Se audita el cumplimiento de la meta SMART (desvío ≤ 0,5%).
              </p>
            </div>
          </div>

          {/* ─── Tabla Oficial de Auditoría de Turnos ─── */}
          <div className="card p-5 sm:p-6 border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-base sm:text-lg font-display font-bold text-zinc-900 dark:text-white">
                  Historial de Arqueos y Rendición de Turnos
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Libro de auditoría de aperturas, cierres ciegos, desvíos y rendiciones de cajeros
                </p>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 self-start sm:self-auto">
                {turnos.length} registros auditados
              </span>
            </div>

            <div className="overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono uppercase text-zinc-500">
                    <th className="py-2.5 px-3">Turno / Cajero</th>
                    <th className="py-2.5 px-3">Horario</th>
                    <th className="py-2.5 px-3 text-right">Fondo Apertura</th>
                    <th className="py-2.5 px-3 text-right">Ventas Efectivo</th>
                    <th className="py-2.5 px-3 text-right">Esperado Cajón</th>
                    <th className="py-2.5 px-3 text-right">Declarado Ciego</th>
                    <th className="py-2.5 px-3 text-center">Diferencia</th>
                    <th className="py-2.5 px-3 text-center">KPI SMART</th>
                    <th className="py-2.5 px-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-sans">
                  {turnos.map((t, index) => {
                    const esAbierto = t.estado === 'abierto';
                    const fechaAperturaStr = t.fecha_apertura
                      ? new Date(t.fecha_apertura).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    const fechaCierreStr = t.fecha_cierre
                      ? new Date(t.fecha_cierre).toLocaleString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'En curso';

                    const esperado =
                      t.monto_cierre_esperado ??
                      t.monto_apertura + (t.total_ventas_efectivo || 0);

                    const declarado = t.monto_cierre_declarado;
                    const diferencia = t.diferencia ?? 0;
                    const desvioPct =
                      esperado > 0 ? (Math.abs(diferencia) / esperado) * 100 : 0;
                    const cumpleKPI = desvioPct <= 0.5;

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        {/* Turno / Cajero */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                esAbierto ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                              }`}
                            />
                            <div>
                              <span className="font-bold text-zinc-900 dark:text-white block">
                                {t.cajero_nombre}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                #{t.id.replace('turno-', '').slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Horario */}
                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          <div>{fechaAperturaStr}</div>
                          <div className="text-zinc-400 text-[10px]">Cierre: {fechaCierreStr}</div>
                        </td>

                        {/* Fondo Apertura */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                          {formatPrecio(t.monto_apertura)}
                        </td>

                        {/* Ventas Efectivo */}
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                          +{formatPrecio(t.total_ventas_efectivo || 0)}
                        </td>

                        {/* Esperado en Cajón */}
                        <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-zinc-200">
                          {formatPrecio(esperado)}
                        </td>

                        {/* Declarado Ciego */}
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {declarado !== null ? (
                            <span className="text-zinc-900 dark:text-white">
                              {formatPrecio(declarado)}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic font-normal">Pendiente</span>
                          )}
                        </td>

                        {/* Diferencia Auditada */}
                        <td className="py-3 px-3 text-center">
                          {declarado === null ? (
                            <span className="text-zinc-400 text-[11px]">-</span>
                          ) : diferencia === 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                              Exacto ($0)
                            </span>
                          ) : diferencia > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                              +{formatPrecio(diferencia)} (Sobrante)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700/60">
                              -{formatPrecio(Math.abs(diferencia))} (Faltante)
                            </span>
                          )}
                        </td>

                        {/* KPI SMART (<= 0.5%) */}
                        <td className="py-3 px-3 text-center">
                          {declarado === null ? (
                            <span className="text-zinc-400 text-[10px]">Turno en curso</span>
                          ) : cumpleKPI ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                              ✓ Cumple (≤0.5%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded border border-red-200 dark:border-red-800/40">
                              ⚠ Fuera de norma
                            </span>
                          )}
                        </td>

                        {/* Observaciones */}
                        <td className="py-3 px-3 max-w-xs text-[11px] text-zinc-500 dark:text-zinc-400 truncate" title={t.observaciones || ''}>
                          {t.observaciones || <span className="text-zinc-400 italic">Sin observaciones</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
      const esUuidValido = (str?: string | null) =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      await supabase.from('movimientos_caja').insert({
        tipo: nuevoMov.tipo,
        monto: nuevoMov.monto,
        concepto: nuevoMov.concepto,
        categoria_caja: nuevoMov.categoria_caja,
        metodo_pago: nuevoMov.metodo_pago,
        producto_id: esUuidValido(nuevoMov.producto_id) ? nuevoMov.producto_id : null,
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
