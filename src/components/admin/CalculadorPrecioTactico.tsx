'use client';

import { useEffect, useState } from 'react';
import { formatPrecio } from '@/lib/utils';

interface CalculadorPrecioTacticoProps {
  costo: number;
  setCosto: (val: number) => void;
  margen: number;
  setMargen: (val: number) => void;
  precio: number;
  setPrecio: (val: number) => void;
}

const PRESETS_MARGEN = [25, 35, 50, 75, 100];

export default function CalculadorPrecioTactico({
  costo,
  setCosto,
  margen,
  setMargen,
  precio,
  setPrecio,
}: CalculadorPrecioTacticoProps) {
  // Modo de edición: 'automatico' (costo + %) o 'manual' (escribió precio directo)
  const [modo, setModo] = useState<'automatico' | 'manual'>('automatico');

  // Ganancia neta en pesos
  const gananciaNeta = Math.max(0, precio - (costo || 0));

  // Manejar cambio en Costo
  const handleCostoChange = (valStr: string) => {
    const nuevoCosto = parseFloat(valStr) || 0;
    setCosto(nuevoCosto);

    if (modo === 'automatico' && nuevoCosto > 0) {
      const nuevoPrecio = Math.round(nuevoCosto * (1 + (margen || 0) / 100));
      setPrecio(nuevoPrecio);
    } else if (nuevoCosto > 0 && precio > 0) {
      // Recalcular margen si ya hay precio
      const nuevoMargen = Math.round(((precio - nuevoCosto) / nuevoCosto) * 100);
      setMargen(nuevoMargen);
    }
  };

  // Manejar cambio en % Margen
  const handleMargenChange = (valStr: string) => {
    const nuevoMargen = parseFloat(valStr) || 0;
    setMargen(nuevoMargen);
    setModo('automatico');

    if (costo > 0) {
      const nuevoPrecio = Math.round(costo * (1 + nuevoMargen / 100));
      setPrecio(nuevoPrecio);
    }
  };

  // Aplicar Preset de Margen
  const aplicarPreset = (preset: number) => {
    setMargen(preset);
    setModo('automatico');
    if (costo > 0) {
      const nuevoPrecio = Math.round(costo * (1 + preset / 100));
      setPrecio(nuevoPrecio);
    }
  };

  // Manejar cambio manual en Precio Final
  const handlePrecioChange = (valStr: string) => {
    const nuevoPrecio = parseFloat(valStr) || 0;
    setPrecio(nuevoPrecio);
    setModo('manual');

    if (costo > 0 && nuevoPrecio >= costo) {
      const margenCalculado = Math.round(((nuevoPrecio - costo) / costo) * 100);
      setMargen(margenCalculado);
    } else if (costo > 0 && nuevoPrecio < costo) {
      setMargen(0);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-militar-500 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Cálculo Inteligente de Precios
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          Modo: {modo === 'automatico' ? 'Costo + Margen' : 'Manual / Sobrescrito'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Costo */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Costo de Adquisición ($)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 text-xs font-mono">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={costo || ''}
              onChange={(e) => handleCostoChange(e.target.value)}
              className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Precio de compra mayorista</span>
        </div>

        {/* % Margen de Ganancia */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Margen de Ganancia (%)
          </label>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              placeholder="40"
              value={margen || ''}
              onChange={(e) => handleMargenChange(e.target.value)}
              className="w-full pl-3 pr-7 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 text-xs font-mono">
              %
            </span>
          </div>
          {/* Botones Presets */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {PRESETS_MARGEN.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => aplicarPreset(p)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                  margen === p
                    ? 'bg-militar-600 text-white border-militar-600'
                    : 'bg-zinc-200 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                +{p}%
              </button>
            ))}
          </div>
        </div>

        {/* Precio Final de Venta */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Precio Final al Público ($) *
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 text-xs font-mono">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={precio || ''}
              onChange={(e) => handlePrecioChange(e.target.value)}
              className="w-full pl-7 pr-3 py-2 text-xs sm:text-sm font-mono font-bold bg-white dark:bg-zinc-950 border-2 border-militar-500/80 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-militar-500"
            />
          </div>
          <span className="text-[10px] text-militar-600 dark:text-militar-400 mt-1 block">
            {modo === 'manual' ? '✎ Modificado manualmente' : '✓ Calculado automáticamente'}
          </span>
        </div>
      </div>

      {/* Tarjeta resumen de rentabilidad táctica */}
      {costo > 0 && precio > 0 && (
        <div className="p-2.5 rounded-lg bg-militar-50 dark:bg-militar-950/40 border border-militar-200 dark:border-militar-800/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Rentabilidad:</span>
            <span className="font-bold text-militar-800 dark:text-militar-300">
              +{formatPrecio(gananciaNeta)} por unidad
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Margen neto:</span>
            <span className="px-2 py-0.5 rounded font-bold bg-militar-600 text-white text-[11px]">
              {margen}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
