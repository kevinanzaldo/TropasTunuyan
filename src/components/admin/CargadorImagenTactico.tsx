'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { subirImagenProducto, generarPreviewLocal } from '@/lib/storage';

interface CargadorImagenTacticoProps {
  imagenUrl: string;
  setImagenUrl: (url: string) => void;
  nombreProducto?: string;
}

const PRESETS_IMAGENES = [
  { label: 'Uniforme', url: '/productos/uniforme.png' },
  { label: 'Borceguí', url: '/productos/borcegui.png' },
  { label: 'Chaleco', url: '/productos/chaleco.png' },
  { label: 'Cinturón', url: '/productos/cinturon.png' },
  { label: 'Funda', url: '/productos/funda.png' },
];

export default function CargadorImagenTactico({
  imagenUrl,
  setImagenUrl,
  nombreProducto = 'Producto Táctico',
}: CargadorImagenTacticoProps) {
  const [metodo, setMetodo] = useState<'archivo' | 'url'>('archivo');
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar selección de archivo local
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorSubida(null);
    setArchivoSeleccionado(file);

    // 1. Mostrar preview inmediato
    try {
      const dataUrl = await generarPreviewLocal(file);
      setPreviewLocal(dataUrl);
    } catch {
      // Ignorar si falla lectura local
    }

    // 2. Subir automáticamente a Supabase Storage
    await ejecutarSubida(file);
  };

  // Subir archivo a Supabase Storage
  const ejecutarSubida = async (file: File) => {
    setSubiendo(true);
    setErrorSubida(null);

    const resultado = await subirImagenProducto(file);
    setSubiendo(false);

    if (resultado.error) {
      setErrorSubida(resultado.error);
    } else if (resultado.url) {
      setImagenUrl(resultado.url);
    }
  };

  const reintentarSubida = () => {
    if (archivoSeleccionado) {
      ejecutarSubida(archivoSeleccionado);
    }
  };

  const imagenAMostrar = previewLocal || imagenUrl;

  return (
    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
      {/* Selector de Pestaña */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Imagen del Producto
        </label>
        <div className="flex rounded-lg bg-zinc-200 dark:bg-zinc-800 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMetodo('archivo')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              metodo === 'archivo'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Subir Archivo Local
          </button>
          <button
            type="button"
            onClick={() => setMetodo('url')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              metodo === 'url'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            URL Externa o Catálogo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Controles de Carga */}
        <div className="sm:col-span-2 space-y-2.5">
          {metodo === 'archivo' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="cargador-imagen-file"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-militar-600/40 hover:border-militar-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white dark:bg-zinc-950 hover:bg-militar-50/50 dark:hover:bg-militar-950/20"
              >
                <div className="mx-auto w-10 h-10 rounded-full bg-militar-100 dark:bg-militar-950 text-militar-700 dark:text-militar-400 flex items-center justify-center mb-2">
                  {subiendo ? (
                    <svg className="animate-spin w-5 h-5 text-militar-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  )}
                </div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {subiendo
                    ? 'Subiendo a Supabase Storage...'
                    : 'Hacé clic para seleccionar o arrastrá una imagen'}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Formatos admitidos: PNG, JPG, WEBP (Hasta 5MB)
                </p>
              </div>

              {/* Mensaje de Error / Feedback */}
              {errorSubida && (
                <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 flex items-start justify-between gap-2">
                  <span>{errorSubida}</span>
                  <button
                    type="button"
                    onClick={reintentarSubida}
                    className="font-bold underline flex-shrink-0"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {imagenUrl && !subiendo && !errorSubida && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-mono truncate">
                  <span>✓ Imagen cargada:</span>
                  <span className="truncate text-[11px] text-zinc-500">{imagenUrl}</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://... o /productos/chaleco.png"
                  value={imagenUrl}
                  onChange={(e) => {
                    setPreviewLocal(null);
                    setImagenUrl(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-militar-500"
                />
              </div>

              {/* Sugerencias de imágenes locales de muestra */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-medium">Sugerencias:</span>
                {PRESETS_IMAGENES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setPreviewLocal(null);
                      setImagenUrl(item.url);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      imagenUrl === item.url
                        ? 'bg-militar-600 text-white border-militar-600 font-bold'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vista previa en vivo */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-800 bg-white flex items-center justify-center shadow-inner">
            {imagenAMostrar ? (
              <div className="relative w-full h-full p-2">
                <Image
                  src={imagenAMostrar}
                  alt={nombreProducto}
                  fill
                  className="object-contain"
                  unoptimized={imagenAMostrar.startsWith('data:')}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-2 text-center text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 opacity-40 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-[10px] text-zinc-500">Sin imagen</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-1">Vista previa</span>
        </div>
      </div>
    </div>
  );
}
