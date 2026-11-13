'use client';

import { useState } from 'react';
import type { TurnoCaja } from '@/types/database';
import { abrirTurno } from '@/lib/finanzas';
import { formatPrecio } from '@/lib/utils';

interface ModalAperturaTurnoProps {
  abierto: boolean;
  onClose: () => void;
  cajeroActual: string;
  onTurnoAbierto: (turno: TurnoCaja) => void;
}

const PRESETS_FONDO = [0, 5000, 10000, 15000, 20000, 30000];

export default function ModalAperturaTurno({
  abierto,
  onClose,
  cajeroActual,
  onTurnoAbierto,
}: ModalAperturaTurnoProps) {
  const [cajero, setCajero] = useState(cajeroActual || 'Kevin (Líder / Mostrador)');
  const [fondoInicial, setFondoInicial] = useState<string>('15000');
  const [abriendo, setAbriendo] = useState(false);

  if (!abierto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbriendo(true);

    const montoNum = parseFloat(fondoInicial);
    const montoFinal = isNaN(montoNum) ? 0 : Math.max(0, montoNum);

    const turno = await abrirTurno(cajero.trim(), montoFinal);
    setAbriendo(false);
    onTurnoAbierto(turno);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera Táctica */}
        <div className="bg-militar-900 dark:bg-black p-4 sm:p-5 border-b border-zinc-800 text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-militar-600/30 border border-militar-500/40 flex items-center justify-center text-militar-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-militar-400">
                Control Operativo de Turno (HU 3.3)
              </span>
            </div>
            <h2 className="text-lg font-display font-black text-white">
              Apertura de Turno de Mostrador
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Registre el cajero responsable y el fondo inicial de cambio recibido en el cajón para habilitar las ventas.
          </p>

          {/* Cajero / Operador */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1">
              Cajero / Operador Responsable
            </label>
            <input
              type="text"
              required
              value={cajero}
              onChange={(e) => setCajero(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-militar-500 focus:outline-none"
            />
          </div>

          {/* Fondo Inicial de Cambio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Fondo Inicial en Billetes (Cambio)
              </label>
              <span className="text-xs font-mono font-bold text-militar-600 dark:text-militar-400">
                {formatPrecio(parseFloat(fondoInicial) || 0)}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-militar-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Presets de Fondo de Cambio */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-zinc-500 self-center mr-1 font-medium">Sugeridos:</span>
              {PRESETS_FONDO.map((p) => {
                const seleccionado = (parseFloat(fondoInicial) || 0) === p && fondoInicial !== '';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFondoInicial(p.toString())}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                      seleccionado
                        ? 'bg-militar-600 text-white shadow-sm ring-2 ring-militar-400/50'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    ${p.toLocaleString('es-AR')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={abriendo}
              className="px-5 py-2.5 rounded-xl bg-militar-600 hover:bg-militar-700 text-white text-xs font-bold tracking-wide shadow-md flex items-center gap-2"
            >
              {abriendo ? 'Abriendo Turno...' : '✓ Abrir Turno e Iniciar Ventas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

