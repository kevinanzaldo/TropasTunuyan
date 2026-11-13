'use client';

import { useState } from 'react';
import type { MetodoPagoTipo, VentaItemCarrito } from '@/types/database';
import { formatPrecio } from '@/lib/utils';

interface ModalCobroTacticoProps {
  abierto: boolean;
  onClose: () => void;
  total: number;
  items: VentaItemCarrito[];
  credencialVerificada: boolean;
  fuerzaInstitucion?: string;
  onConfirmarVenta: (datos: {
    metodoPago: MetodoPagoTipo;
    montoEfectivo: number;
    montoDigital: number;
    nroComprobanteDigital: string;
    vuelto: number;
  }) => void;
}

const ALIAS_COMERCIO = 'TROPAS.TUNUYAN.MP';
const TITULAR_CUENTA = 'Tropas Tunuyán (Kevin Anzaldo / ITU)';
const CVU_COMERCIO = '0000003100098765432100';

export default function ModalCobroTactico({
  abierto,
  onClose,
  total,
  items,
  credencialVerificada,
  fuerzaInstitucion,
  onConfirmarVenta,
}: ModalCobroTacticoProps) {
  const [metodo, setMetodo] = useState<MetodoPagoTipo>('efectivo');

  // Estados de Efectivo
  const [montoRecibido, setMontoRecibido] = useState<number>(total);
  const [aliasCopiado, setAliasCopiado] = useState(false);

  // Estados de Transferencia / Alias / Tarjeta
  const [nroComprobante, setNroComprobante] = useState('');

  // Estados de Pago Combinado
  const [combinadoEfectivo, setCombinadoEfectivo] = useState<number>(Math.floor(total / 2));
  const [combinadoDigital, setCombinadoDigital] = useState<number>(total - Math.floor(total / 2));

  // Estados de validación
  const [errorValidacion, setErrorValidacion] = useState('');

  if (!abierto) return null;

  const vueltoEfectivo = Math.max(0, (montoRecibido || 0) - total);

  const copiarAlias = () => {
    navigator.clipboard.writeText(ALIAS_COMERCIO);
    setAliasCopiado(true);
    setTimeout(() => setAliasCopiado(false), 2500);
  };

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion('');

    if (metodo === 'efectivo') {
      if ((montoRecibido || 0) < total) {
        setErrorValidacion(`El monto recibido en efectivo es menor al total (${formatPrecio(total)}).`);
        return;
      }
      onConfirmarVenta({
        metodoPago: 'efectivo',
        montoEfectivo: total,
        montoDigital: 0,
        nroComprobanteDigital: '',
        vuelto: vueltoEfectivo,
      });
    } else if (metodo === 'transferencia_alias') {
      if (!nroComprobante.trim()) {
        setErrorValidacion('Ingrese el número de comprobante o últimos dígitos de la transferencia.');
        return;
      }
      onConfirmarVenta({
        metodoPago: 'transferencia_alias',
        montoEfectivo: 0,
        montoDigital: total,
        nroComprobanteDigital: nroComprobante.trim(),
        vuelto: 0,
      });
    } else if (metodo === 'tarjeta_postnet') {
      if (!nroComprobante.trim()) {
        setErrorValidacion('Ingrese el número de cupón emitido por la terminal Postnet BNA.');
        return;
      }
      onConfirmarVenta({
        metodoPago: 'tarjeta_postnet',
        montoEfectivo: 0,
        montoDigital: total,
        nroComprobanteDigital: nroComprobante.trim(),
        vuelto: 0,
      });
    } else if (metodo === 'combinado') {
      const suma = (combinadoEfectivo || 0) + (combinadoDigital || 0);
      if (Math.abs(suma - total) > 1) {
        setErrorValidacion(
          `La suma de efectivo (${formatPrecio(combinadoEfectivo)}) y transferencia/tarjeta (${formatPrecio(
            combinadoDigital
          )}) debe ser igual al total (${formatPrecio(total)}). Diferencia: ${formatPrecio(total - suma)}`
        );
        return;
      }
      onConfirmarVenta({
        metodoPago: 'combinado',
        montoEfectivo: combinadoEfectivo,
        montoDigital: combinadoDigital,
        nroComprobanteDigital: nroComprobante.trim(),
        vuelto: 0,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Cobro */}
        <div className="flex-shrink-0 bg-zinc-900 dark:bg-black p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                Punto de Cobro Mostrador
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white">
              Cobrar Venta
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-zinc-400 block font-mono">Total a Cobrar</span>
              <span className="text-2xl sm:text-3xl font-display font-black text-emerald-400">
                {formatPrecio(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-base font-bold leading-none"
              title="Cancelar cobro (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notificación de Credencial Acreditada si corresponde */}
        {credencialVerificada && fuerzaInstitucion && (
          <div className="flex-shrink-0 bg-emerald-950/40 border-b border-emerald-800/40 px-4 py-2 flex items-center gap-2 text-xs text-emerald-300 font-mono">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Credencial verificada para: <strong>{fuerzaInstitucion}</strong></span>
          </div>
        )}

        <form onSubmit={handleConfirmar} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Selector de Medios de Pago */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
              Seleccione Medio de Pago:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMetodo('efectivo')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  metodo === 'efectivo'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="text-lg">💵</span>
                Efectivo
              </button>

              <button
                type="button"
                onClick={() => setMetodo('transferencia_alias')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                  metodo === 'transferencia_alias'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="text-lg">📱</span>
                Mercado Pago / Alias
              </button>

              <button
                type="button"
                onClick={() => setMetodo('tarjeta_postnet')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                  metodo === 'tarjeta_postnet'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="text-lg">💳</span>
                Tarjeta (BNA)
              </button>

              <button
                type="button"
                onClick={() => setMetodo('combinado')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all text-center ${
                  metodo === 'combinado'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="text-lg">⚖️</span>
                Combinado
              </button>
            </div>
          </div>

          {/* ─── VISTA: EFECTIVO ─── */}
          {metodo === 'efectivo' && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Monto Recibido del Cliente
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                  <input
                    type="number"
                    value={montoRecibido || ''}
                    onChange={(e) => setMontoRecibido(parseFloat(e.target.value) || 0)}
                    placeholder="Monto entregado"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Botones de atajo rápido de billetes */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 self-center mr-1">Rápido:</span>
                <button
                  type="button"
                  onClick={() => setMontoRecibido(total)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300"
                >
                  Exacto ({formatPrecio(total)})
                </button>
                {[10000, 20000, 50000, 100000].map((billete) => (
                  <button
                    key={billete}
                    type="button"
                    onClick={() => setMontoRecibido(billete)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 font-mono"
                  >
                    ${billete.toLocaleString('es-AR')}
                  </button>
                ))}
              </div>

              {/* Panel de Vuelto */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Vuelto a entregar:
                </span>
                <span
                  className={`text-xl font-display font-black ${
                    vueltoEfectivo > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {formatPrecio(vueltoEfectivo)}
                </span>
              </div>
            </div>
          )}

          {/* ─── VISTA: MERCADO PAGO / TRANSFERENCIA ALIAS ─── */}
          {metodo === 'transferencia_alias' && (
            <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 space-y-4">
              {/* Banner de 0% comisión por alias */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-100/80 dark:bg-sky-900/40 border border-sky-300 dark:border-sky-700/50">
                <span className="text-base">💡</span>
                <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                  <strong>Cobro por Transferencia a Alias (0% Comisión MP):</strong>
                  <br />
                  El cliente transfiere directamente por CVU/Alias desde Mercado Pago o su banco, evitando la comisión de cobro con QR.
                </div>
              </div>

              {/* Datos del Alias para mostrar al cliente */}
              <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Alias de la Tienda:
                  </span>
                  <button
                    type="button"
                    onClick={copiarAlias}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                  >
                    {aliasCopiado ? '✓ Copiado' : 'Copiar Alias'}
                  </button>
                </div>
                <div className="font-mono text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 tracking-wider">
                  {ALIAS_COMERCIO}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Titular: {TITULAR_CUENTA} · CVU: {CVU_COMERCIO}
                </div>
              </div>

              {/* Comprobante de Transferencia */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nro. de Comprobante / Operación de Transferencia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  placeholder="Ej: 89452301 o últimos 6 dígitos del comprobante"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ─── VISTA: TARJETA POSTNET BNA ─── */}
          {metodo === 'tarjeta_postnet' && (
            <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-3">
              <div className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-200 font-semibold">
                <span className="text-lg">💳</span>
                Terminal Postnet Banco Nación (BNA) en mostrador
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Pase la tarjeta de débito o crédito por la terminal posnet física. Una vez aprobada, registre el número de cupón para el cierre de lote.
              </p>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nro. de Cupón / Autorización Postnet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  placeholder="Ej: CUP-10492"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ─── VISTA: COMBINADO ─── */}
          {metodo === 'combinado' && (
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 block">
                División del Cobro Combinado:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Parte en Efectivo ($)
                  </label>
                  <input
                    type="number"
                    value={combinadoEfectivo || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCombinadoEfectivo(val);
                      setCombinadoDigital(Math.max(0, total - val));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Parte Transferencia ($)
                  </label>
                  <input
                    type="number"
                    value={combinadoDigital || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCombinadoDigital(val);
                      setCombinadoEfectivo(Math.max(0, total - val));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>

              {/* Datos de transferencia para la parte digital */}
              {combinadoDigital > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                      Transferir parte digital al Alias:
                    </span>
                    <span className="font-mono font-black text-sky-700 dark:text-sky-300 text-sm tracking-wider">
                      {ALIAS_COMERCIO}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copiarAlias}
                    className="px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px]"
                  >
                    {aliasCopiado ? '✓ Copiado' : 'Copiar Alias'}
                  </button>
                </div>
              )}

              {/* Nro de comprobante */}
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Nro. de Operación / Transacción MP (o Cupón) <span className="text-zinc-400 font-normal">(opcional o editable al cierre)</span>
                </label>
                <input
                  type="text"
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  placeholder="Ej: 89452301 (Ver en app de Mercado Pago)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {errorValidacion && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/50">
              {errorValidacion}
            </p>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Volver al Carrito
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wide shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirmar Venta y Emitir Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

