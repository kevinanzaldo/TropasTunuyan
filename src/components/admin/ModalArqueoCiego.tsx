'use client';

import { useState, useMemo, useEffect } from 'react';
import type { TurnoCaja } from '@/types/database';
import { cerrarTurnoCiego, obtenerVentasHistorial, actualizarComprobantesVentas } from '@/lib/finanzas';
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

  // Conteo directo en billetes (usamos string para permitir $0 sin bloqueo de validación HTML5)
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

  const [comprobantesDigitalesVerificados, setComprobantesDigitalesVerificados] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estado posterior al cierre: muestra la revelación del arqueo
  const [resultadoAuditoria, setResultadoAuditoria] = useState<{
    turno: TurnoCaja;
    desvio: number;
    esperado: number;
  } | null>(null);

  // Obtener ventas del turno con parte digital (transferencia o tarjeta)
  const ventasDigitalesTurno = useMemo(() => {
    if (!turnoActivo) return [];
    const todas = obtenerVentasHistorial();
    return todas
      .filter((v) => {
        if (v.turno_id && v.turno_id === turnoActivo.id) return true;
        return new Date(v.created_at).getTime() >= new Date(turnoActivo.fecha_apertura).getTime();
      })
      .filter((v) => {
        if (v.metodo_pago === 'transferencia_alias' || v.metodo_pago === 'tarjeta_postnet') return true;
        if (v.metodo_pago === 'combinado' && (v.monto_digital || 0) > 0) return true;
        return false;
      })
      .map((v) => {
        const montoDig =
          v.metodo_pago === 'combinado' ? Number(v.monto_digital || 0) : Number(v.total || 0);
        const montoEf =
          v.metodo_pago === 'combinado' ? Number(v.monto_efectivo || 0) : 0;
        return {
          id: v.id,
          ticket: v.numero_ticket,
          hora: new Date(v.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          metodoPago: v.metodo_pago,
          montoDigital: montoDig,
          montoEfectivo: montoEf,
          nroComprobanteInicial: v.nro_comprobante_digital || '',
        };
      });
  }, [turnoActivo]);

  // Mapa de números de comprobante/transacción editables por el cajero
  const [nrosComprobantes, setNrosComprobantes] = useState<Record<string, string>>({});

  // Cargar números de comprobantes iniciales
  useEffect(() => {
    const mapa: Record<string, string> = {};
    ventasDigitalesTurno.forEach((vd) => {
      mapa[vd.id] = vd.nroComprobanteInicial;
    });
    setNrosComprobantes(mapa);
  }, [ventasDigitalesTurno]);

  // Total digital acumulado
  const totalDigitalAcumulado = useMemo(() => {
    return ventasDigitalesTurno.reduce((acc, v) => acc + v.montoDigital, 0);
  }, [ventasDigitalesTurno]);

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

    // 1. Guardar números de transacción digital ingresados o editados en las ventas
    actualizarComprobantesVentas(nrosComprobantes);

    // 2. Cerrar turno en sistema
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
    msg += `💵 *1. CAJA FÍSICA (GAVETA)*\n`;
    msg += `Fondo Inicial:         ${formatPrecio(turno.monto_apertura)}\n`;
    msg += `Ventas Efectivo:       +${formatPrecio(turno.total_ventas_efectivo || 0)}\n`;
    msg += `Efectivo Esperado:     ${formatPrecio(esperado)}\n`;
    msg += `Efectivo Declarado:    ${formatPrecio(turno.monto_cierre_declarado || 0)}\n`;
    msg += `*Resultado Auditoría:* ${estadoStr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📱 *2. COBROS DIGITALES (ALIAS MP / TARJETA)*\n`;
    msg += `Total Acreditado:      ${formatPrecio(turno.total_ventas_digital || 0)}\n`;
    if (ventasDigitalesTurno.length > 0) {
      ventasDigitalesTurno.forEach((vd) => {
        const nro = nrosComprobantes[vd.id]?.trim() ? `Op. #${nrosComprobantes[vd.id].trim()}` : 'Sin Nro.';
        msg += `• Ticket ${vd.ticket}: ${formatPrecio(vd.montoDigital)} [${nro}]\n`;
      });
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in print:border-none print:shadow-none"
        role="dialog"
        aria-modal="true"
      >
        {/* ─── FASE 1: INGRESO DE ARQUEO CIEGO ─── */}
        {!resultadoAuditoria ? (
          <div>
            {/* Cabecera Ciega */}
            <div className="bg-zinc-900 dark:bg-black p-4 sm:p-5 border-b border-zinc-800 text-white flex items-center justify-between">
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
                      Protocolo de Arqueo Ciego (HU 3.3)
                    </span>
                  </div>
                  <h2 className="text-lg font-display font-black text-white">
                    Cierre de Turno de Mostrador
                  </h2>
                </div>
              </div>

              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                {turnoActivo.cajero_nombre}
              </span>
            </div>

            <form onSubmit={handleSubmitArqueoCiego} className="p-4 sm:p-6 space-y-4">
              {/* Banner de Aviso Metodológico */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                <span className="text-base">👁️‍🗨️</span>
                <div className="space-y-1">
                  <strong>Protocolo de Arqueo Ciego en Gaveta:</strong>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                    Se audita el <strong>dinero físico en billetes y monedas</strong> del cajón sin conocer el saldo del sistema. Las transferencias a <code>TROPAS.TUNUYAN.MP</code> no están en el cajón físico porque ingresan directo a la cuenta bancaria.
                  </p>
                </div>
              </div>

              {/* Selector de Modo de Conteo */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  1. Efectivo Físico en el Cajón:
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

              {/* MODO DIRECTO */}
              {modoIngreso === 'directo' && (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={montoContado}
                      onChange={(e) => setMontoContado(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono font-bold text-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500 block text-right font-mono">
                    Total declarado en gaveta: {formatPrecio(parseFloat(montoContado) || 0)}
                  </span>
                </div>
              )}

              {/* MODO DESGLOSE POR BILLETES */}
              {modoIngreso === 'desglose' && (
                <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/60 max-h-52 overflow-y-auto pr-1">
                  {DENOMINACIONES.map((den) => (
                    <div
                      key={den.valor}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300 w-16">
                        {den.label}
                      </span>
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <span className="text-[10px] text-zinc-400 font-mono">x</span>
                        <input
                          type="number"
                          min="0"
                          value={cantidadesBilletes[den.valor] || ''}
                          onChange={(e) =>
                            handleCambioBillete(den.valor, parseInt(e.target.value) || 0)
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

              {/* 2. CONCILIACIÓN DE COBROS POR TRANSFERENCIA (ALIAS MP) */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      2. Cobros por Transferencia (Alias MP / Tarjeta)
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-black text-sky-700 dark:text-sky-300">
                    +{formatPrecio(totalDigitalAcumulado)}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Las transferencias al Alias <code>TROPAS.TUNUYAN.MP</code> impactan en la cuenta bancaria. Ingrese o coteje el <strong>Nro. de Operación / Transacción</strong> de cada comprobante para la rendición:
                </p>

                {/* Lista interactiva de comprobantes del turno */}
                {ventasDigitalesTurno.length === 0 ? (
                  <div className="p-3 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-dashed border-sky-200 dark:border-sky-800/40 text-center text-[11px] text-zinc-500">
                    No se registraron cobros por transferencia o tarjeta en este turno ($0).
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ventasDigitalesTurno.map((vta, idx) => (
                      <div
                        key={vta.id}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                              Ticket {vta.ticket}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              ({vta.hora} hs)
                            </span>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="font-mono font-bold text-xs text-sky-700 dark:text-sky-300">
                              {formatPrecio(vta.montoDigital)}
                            </span>
                            {vta.metodoPago === 'combinado' && (
                              <span className="text-[9px] text-zinc-400 block font-mono">
                                (Cobro dividido con {formatPrecio(vta.montoEfectivo)} efec.)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Campo para ingresar el Nro de Transacción MP */}
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-zinc-600 dark:text-zinc-400 block mb-1">
                            Nro. de Operación / Transacción MP:
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={nrosComprobantes[vta.id] ?? ''}
                              onChange={(e) =>
                                setNrosComprobantes((prev) => ({
                                  ...prev,
                                  [vta.id]: e.target.value,
                                }))
                              }
                              placeholder="Ej: 89452301 (Ver en app de Mercado Pago)"
                              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400">
                              Alias MP
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={comprobantesDigitalesVerificados}
                    onChange={(e) => setComprobantesDigitalesVerificados(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600 text-militar-600 focus:ring-militar-500"
                  />
                  <span>Comprobantes de transferencia y comprobantes POSnet cotejados</span>
                </label>
              </div>

              {/* Observaciones Opcionales */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Notas / Observaciones del Turno (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej: Pago de flete $2.000 de encomienda, o rotura de billete."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Continuar Turno
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold tracking-wide shadow-md flex items-center gap-2"
                >
                  {guardando ? 'Auditando...' : '🔒 Confirmar Rendición y Auditar'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ─── FASE 2: REVELACIÓN Y AUDITORÍA DEL ARQUEO ─── */
          <div>
            <div
              className={`p-5 text-white flex items-center justify-between ${
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
              <span className="text-2xl">
                {resultadoAuditoria.desvio === 0 ? '🎯' : resultadoAuditoria.desvio > 0 ? '📈' : '⚠️'}
              </span>
            </div>

            {/* Desglose de Números Revelados */}
            <div className="p-6 space-y-4 text-xs font-mono bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
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

                {/* 2. TRANSFERENCIAS Y DIGITAL */}
                <div className="text-[10px] font-mono font-bold uppercase text-zinc-400 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                  [B] Conciliación Digital (Alias MP & Tarjetas)
                </div>
                <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                  <span>· Total Transferencias al Alias TROPAS.TUNUYAN.MP:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    +{formatPrecio(resultadoAuditoria.turno.total_ventas_digital || 0)}
                  </span>
                </div>
                {ventasDigitalesTurno.length > 0 && (
                  <div className="space-y-1 pl-2 text-[11px] text-zinc-500">
                    {ventasDigitalesTurno.map((vd) => {
                      const nro = nrosComprobantes[vd.id]?.trim();
                      return (
                        <div key={vd.id} className="flex justify-between">
                          <span>Ticket {vd.ticket} ({vd.hora} hs):</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200">
                            {formatPrecio(vd.montoDigital)}{' '}
                            {nro ? `[Op. #${nro}]` : '[Sin Nro. asentado]'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. RECAUDACIÓN TOTAL */}
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

            {/* Botones de Cierre */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-2.5 print:hidden">
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

