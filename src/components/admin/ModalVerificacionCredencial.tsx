'use client';

import { useState } from 'react';
import type { VentaItemCarrito } from '@/types/database';

interface ModalVerificacionCredencialProps {
  abierto: boolean;
  onClose: () => void;
  itemsRestringidos: VentaItemCarrito[];
  onConfirmar: (datos: {
    fuerzaInstitucion: string;
    legajo: string;
    verificada: boolean;
  }) => void;
  credencialPrevia?: {
    fuerzaInstitucion: string;
    legajo: string;
    verificada: boolean;
  } | null;
}

const INSTITUCIONES_OFICIALES = [
  'Policía de Mendoza',
  'Gendarmería Nacional Argentina (GNA)',
  'Ejército Argentino (EA)',
  'Fuerza Aérea Argentina (FAA)',
  'Servicio Penitenciario de Mendoza',
  'Seguridad Privada Habilitada (Ley Prov.)',
  'Prefectura Naval Argentina (PNA)',
  'Policía Federal Argentina (PFA)',
  'Otra Fuerza / Repartición Oficial',
];

export default function ModalVerificacionCredencial({
  abierto,
  onClose,
  itemsRestringidos,
  onConfirmar,
  credencialPrevia,
}: ModalVerificacionCredencialProps) {
  const [fuerza, setFuerza] = useState(
    credencialPrevia?.fuerzaInstitucion || INSTITUCIONES_OFICIALES[0]
  );
  const [legajo, setLegajo] = useState(credencialPrevia?.legajo || '');
  const [confirmadoCheck, setConfirmadoCheck] = useState(
    credencialPrevia?.verificada ?? false
  );
  const [errorMsg, setErrorMsg] = useState('');

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmadoCheck) {
      setErrorMsg('Debe confirmar la verificación visual de la credencial oficial habilitante.');
      return;
    }
    setErrorMsg('');
    onConfirmar({
      fuerzaInstitucion: fuerza,
      legajo: legajo.trim(),
      verificada: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border-2 border-red-500/60 dark:border-red-600/70 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de Alerta Normativa */}
        <div className="flex-shrink-0 bg-red-600 text-white p-4 sm:p-5 flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-red-700/80 rounded-xl flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase bg-red-800/80 px-2 py-0.5 rounded text-red-100">
                Protocolo de Control Obligatorio
              </span>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-white mt-1 leading-snug">
                Validación de Credencial Habilitante
              </h2>
              <p className="text-xs text-red-100 mt-1">
                Venta restringida según normativas de comercialización de indumentaria y atributos oficiales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded hover:bg-red-700 transition-colors text-base font-bold leading-none"
            title="Cancelar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Lista de Artículos que Exigen Credencial en esta Venta */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
              Artículos Restringidos en el Carrito:
            </label>
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 space-y-2 max-h-36 overflow-y-auto">
              {itemsRestringidos.map((it, idx) => (
                <div
                  key={`${it.variante_id}-${idx}`}
                  className="flex items-center justify-between text-xs text-red-900 dark:text-red-200"
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {it.nombre} ({it.talle} / {it.color})
                  </span>
                  <span className="font-mono font-bold text-red-700 dark:text-red-300">
                    x{it.cantidad}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selector de Fuerza o Institución */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Fuerza / Institución del Comprador <span className="text-red-500">*</span>
            </label>
            <select
              value={fuerza}
              onChange={(e) => setFuerza(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
            >
              {INSTITUCIONES_OFICIALES.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {/* Nro de Legajo / Identificación Opcional */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Nro. de Credencial / Legajo / DNI (Opcional)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                Ley 25.326 (Minimización)
              </span>
            </div>
            <input
              type="text"
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              placeholder="Ej: LP-44820 o DNI del titular"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors font-mono"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Por privacidad legal no se almacenan fotos ni documentos sensibles. Solo se audita la comprobación.
            </p>
          </div>

          {/* Confirmación Checkbox Obligatoria */}
          <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmadoCheck}
                onChange={(e) => {
                  setConfirmadoCheck(e.target.checked);
                  if (e.target.checked) setErrorMsg('');
                }}
                className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-zinc-300 dark:border-zinc-600"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <strong className="text-zinc-900 dark:text-white">Declaro bajo apercibimiento legal</strong> haber verificado la credencial oficial vigente (física o digital mediante Mi Argentina / IUSP) del cliente comprador.
              </span>
            </label>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/50">
              {errorMsg}
            </p>
          )}

          {/* Acciones */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-wide shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 text-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Acreditar y Habilitar Cobro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

