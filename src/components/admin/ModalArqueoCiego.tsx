'use client';

import { useState } from 'react';
import type { TurnoCaja } from '@/types/database';
import { cerrarTurnoCiego } from '@/lib/finanzas';
import { formatPrecio } from '@/lib/utils';

interface ModalArqueoCiegoProps {
  abierto: boolean;
  onClose: () => void;
  turnoActivo: TurnoCaja;
  onTurnoCerrado: (turnoFinal: TurnoCaja) => void;
}

const DENOMINACIONES = [
  { valor: 20000, label: '$20.000' },
  { valor: 10000, label: '$10.000' },
  { valor: 2000, label: '$2.000' },
  { valor: 1000, label: '$1.000' },
  { valor: 500, label: '$500' },
  { valor: 200, label: '$200' },
  { valor: 100, label: '$100' },
];

export default function ModalArqueoCiego({
  abierto,
  onClose,
  turnoActivo,
  onTurnoCerrado,
}: ModalArqueoCiegoProps) {
  // Modo de ingreso: 'directo' (escribe el total) o 'desglose' (cuenta billetes)
  const [modoIngreso, setModoIngreso] = useState<'directo' | 'desglose'>('directo');

  // Conteo directo en billetes
  const [montoContado, setMontoContado] = useState<string>('0');

  // Conteo por desglose de billetes
  const [cantidadesBilletes, setCantidadesBilletes] = useState<Record<number, number>>({
    20000: 0,
    10000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
  });

  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estado posterior al cierre: muestra la revelación del arqueo
  const [resultadoAuditoria, setResultadoAuditoria] = useState<{
    turno: TurnoCaja;
    desvio: number;
    esperado: number;
  } | null>(null);

  if (!abierto) return null;

  // Calcular total si está en modo desglose
  const totalDesglose = Object.entries(cantidadesBilletes).reduce(
    (acc, [valStr, cant]) => acc + parseInt(valStr) * (cant || 0),
    0
  );

  const valorMontoDirecto = parseFloat(montoContado);
  const montoDirectoFinal = isNaN(valorMontoDirecto) ? 0 : Math.max(0, valorMontoDirecto);
  const efectivoDeclaradoFinal = modoIngreso === 'desglose' ? totalDesglose : montoDirectoFinal;

  const handleCambioBillete = (denominacion: number, cant: number) => {
    setCantidadesBilletes((prev) => ({
      ...prev,
      [denominacion]: Math.max(0, cant),
    }));
  };

  const handleSubmitArqueoCiego = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    // Cerrar turno en sistema auditando solo el efectivo en gaveta
    const res = await cerrarTurnoCiego(
      Math.max(0, efectivoDeclaradoFinal),
      observaciones.trim()
    );

    setGuardando(false);
    setResultadoAuditoria(res);
  };

  const handleCopiarActaWhatsApp = () => {
    if (!resultadoAuditoria) return;
    const { turno, desvio, esperado } = resultadoAuditoria;

    const fechaStr = new Date(turno.fecha_cierre || Date.now()).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let estadoStr = '✅ CAJA EXACTA (0 DESVÍO)';
    if (desvio > 0) estadoStr = `🟢 SOBRANTE DE CAJA (+ ${formatPrecio(desvio)})`;
    if (desvio < 0) estadoStr = `🔴 FALTANTE DE CAJA (- ${formatPrecio(Math.abs(desvio))})`;

    let msg = `*TROPAS TUNUYÁN — ACTA DE CIERRE Y ARQUEO DE TURNO*\n`;
    msg += `*Fecha:* ${fechaStr}\n`;
    msg += `*Cajero / Responsable:* ${turno.cajero_nombre}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💵 *CAJA FÍSICA (GAVETA EFECTIVO)*\n`;
    msg += `Fondo Inicial:         ${formatPrecio(turno.monto_apertura)}\n`;
    msg += `Ventas Efectivo:       +${formatPrecio(turno.total_ventas_efectivo || 0)}\n`;
    msg += `Efectivo Esperado:     ${formatPrecio(esperado)}\n`;
    msg += `Efectivo Declarado:    ${formatPrecio(turno.monto_cierre_declarado || 0)}\n`;
    msg += `*Resultado Auditoría:* ${estadoStr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📱 Cobros Digitales (MP / Tarjeta): ${formatPrecio(turno.total_ventas_digital || 0)}\n`;
    msg += `💰 *RECAUDACIÓN TOTAL:* ${formatPrecio((turno.total_ventas_efectivo || 0) + (turno.total_ventas_digital || 0))}\n`;
    if (turno.observaciones) {
      msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📝 Notas: ${turno.observaciones}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Sistema Operativo Tropas Tunuyán`;

    navigator.clipboard.writeText(msg);
    alert('Acta de cierre de turno copiada al portapapeles');
  };

  const handleFinalizar = () => {
    if (resultadoAuditoria) {
      onTurnoCerrado(resultadoAuditoria.turno);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleFinalizar();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in print:border-none print:shadow-none print:max-h-none"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── FASE 1: INGRESO DE ARQUEO CIEGO ─── */}
        {!resultadoAuditoria ? (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Cabecera Ciega (Fija) */}
            <div className="flex-shrink-0 bg-zinc-900 dark:bg-black p-4 sm:p-5 border-b border-zinc-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      Protocolo de Arqueo Ciego
                    </span>
                  </div>
                  <h2 className="text-lg font-display font-black text-white">
                    Cierre de Turno de Mostrador
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                  {turnoActivo.cajero_nombre}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-base font-bold leading-none"
                  title="Cerrar modal (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Scrolleable */}
            <form onSubmit={handleSubmitArqueoCiego} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Banner de Aviso Metodológico */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">👁️‍🗨️</span>
                  <div className="space-y-1">
                    <strong>Protocolo de Arqueo Ciego en Gaveta:</strong>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                      Contá únicamente el <strong>dinero físico en billetes y monedas</strong> del cajón sin conocer el saldo acumulado en el sistema.
                    </p>
                  </div>
                </div>

                {/* Selector de Modo de Conteo */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Efectivo Físico en el Cajón:
                  </label>
                  <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setModoIngreso('directo')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        modoIngreso === 'directo'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500'
                      }`}
                    >
                      Monto Directo
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoIngreso('desglose')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        modoIngreso === 'desglose'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500'
                      }`}
                    >
                      Por Billetes
                    </button>
                  </div>
                </div>

                {/* Modo Directo */}
                {modoIngreso === 'directo' ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={montoContado}
                        onChange={(e) => setMontoContado(e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono font-bold text-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 text-right font-mono">
                      Total declarado en gaveta: {formatPrecio(montoDirectoFinal)}
                    </p>
                  </div>
                ) : (
                  /* Modo Desglose por Billetes */
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-2.5">
                    <p className="text-[11px] text-zinc-500 mb-2">
                      Ingresá la cantidad de unidades por cada denominación:
                    </p>
                    {DENOMINACIONES.map((den) => (
                      <div
                        key={den.valor}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 w-16">
                          {den.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-[11px]">x</span>
                          <input
                            type="number"
                            min="0"
                            value={cantidadesBilletes[den.valor] || ''}
                            onChange={(e) =>
                              handleCambioBillete(
                                den.valor,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            placeholder="0"
                            className="w-20 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-right font-mono font-semibold"
                          />
                          <span className="text-zinc-500 text-[11px] font-mono w-24 text-right">
                            = {formatPrecio((cantidadesBilletes[den.valor] || 0) * den.valor)}
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between font-bold text-xs">
                      <span>Total Sumado:</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {formatPrecio(totalDesglose)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Observaciones Opcionales */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                    Notas / Observaciones del Turno (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Pago de flete $2.000 de encomienda, rotura de billete, etc."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones (Fijos al pie) */}
              <div className="flex-shrink-0 flex items-center justify-end gap-2.5 p-4 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Continuar Turno
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold tracking-wide shadow-md flex items-center gap-2 transition-colors"
                >
                  {guardando ? 'Auditando...' : '🔒 Confirmar Rendición y Auditar'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ─── FASE 2: REVELACIÓN Y AUDITORÍA DEL ARQUEO ─── */
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header Resultado (Fijo) */}
            <div
              className={`flex-shrink-0 p-5 text-white flex items-center justify-between ${
                resultadoAuditoria.desvio === 0
                  ? 'bg-emerald-600'
                  : resultadoAuditoria.desvio > 0
                  ? 'bg-blue-600'
                  : 'bg-red-600'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded text-white">
                  Acta Oficial de Arqueo
                </span>
                <h2 className="text-xl font-display font-black text-white mt-1">
                  {resultadoAuditoria.desvio === 0
                    ? '✓ Caja Exacta (0 Desvío)'
                    : resultadoAuditoria.desvio > 0
                    ? `🟢 Sobrante de Caja (+ ${formatPrecio(resultadoAuditoria.desvio)})`
                    : `🔴 Faltante de Caja (- ${formatPrecio(Math.abs(resultadoAuditoria.desvio))})`}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleFinalizar}
                className="text-white/80 hover:text-white p-1 text-xl font-bold leading-none"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Desglose Scrolleable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
              <div className="space-y-2 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Cajero Responsable:</span>
                  <span className="font-bold">{resultadoAuditoria.turno.cajero_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Fecha de Cierre:</span>
                  <span>{new Date().toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="space-y-2 py-1 text-xs">
                {/* 1. CAJA FÍSICA */}
                <div className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  [A] Auditoría de Billetes en Gaveta (Caja Física)
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">· Fondo Inicial de Apertura:</span>
                  <span className="font-bold">{formatPrecio(resultadoAuditoria.turno.monto_apertura)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">· Cobros en Efectivo del Turno:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatPrecio(resultadoAuditoria.turno.total_ventas_efectivo || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                  <span>EFECTIVO ESPERADO EN CAJÓN:</span>
                  <span>{formatPrecio(resultadoAuditoria.esperado)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-600 dark:text-amber-400">
                  <span>EFECTIVO DECLARADO (A CIEGAS):</span>
                  <span>{formatPrecio(resultadoAuditoria.turno.monto_cierre_declarado || 0)}</span>
                </div>

                {/* 2. RECAUDACIÓN TOTAL */}
                <div className="flex justify-between text-xs font-bold pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                  <span>FACTURACIÓN TOTAL DEL TURNO:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatPrecio(
                      (resultadoAuditoria.turno.total_ventas_efectivo || 0) +
                      (resultadoAuditoria.turno.total_ventas_digital || 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Diferencia Auditada */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  resultadoAuditoria.desvio === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                    : resultadoAuditoria.desvio > 0
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-800 dark:text-blue-300'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-800 dark:text-red-300'
                }`}
              >
                <span className="font-bold">DESVIACIÓN DE CAJA FÍSICA:</span>
                <span className="text-sm font-black font-mono">
                  {resultadoAuditoria.desvio > 0 ? '+' : ''}
                  {formatPrecio(resultadoAuditoria.desvio)}
                </span>
              </div>

              {resultadoAuditoria.turno.observaciones && (
                <div className="p-2.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <strong>Observación:</strong> {resultadoAuditoria.turno.observaciones}
                </div>
              )}
            </div>

            {/* Botones de Cierre (Fijos al pie) */}
            <div className="flex-shrink-0 p-4 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleCopiarActaWhatsApp}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>💬</span>
                Copiar Acta p/ WhatsApp
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span>🖨️</span>
                Imprimir
              </button>

              <button
                type="button"
                onClick={handleFinalizar}
                className="py-2.5 px-4 rounded-xl bg-militar-600 hover:bg-militar-700 text-white text-xs font-bold shadow-md"
              >
                Cerrar Turno
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
