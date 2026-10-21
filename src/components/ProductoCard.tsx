'use client';

import Image from 'next/image';
import type { ProductoConVariantes } from '@/types/database';
import { formatPrecio } from '@/lib/utils';

interface Props {
  producto: ProductoConVariantes;
  index: number;
  onSelect: (producto: ProductoConVariantes) => void;
}

const DEFAULT_IMAGES: Record<string, string> = {
  'Uniforme Táctico Ripstop': '/productos/uniforme.png',
  'Borceguí Táctico Cuero': '/productos/borcegui.png',
  'Chaleco Antibalas Nivel IIIA': '/productos/chaleco.png',
  'Cinturón Táctico Militar': '/productos/cinturon.png',
  'Funda Pistolera Nivel II': '/productos/funda.png',
};

const COLOR_DOTS: Record<string, string> = {
  'Negro': '#18181b',
  'Verde Oliva': '#556b2f',
  'Marrón': '#5c4033',
  'Multicolor': '#71717a',
  'Único': '#3f3f46',
};

function formatTalleChip(talle: string): string {
  const trimmed = talle.trim();
  // Quitar 'T.' si ya lo tuviera para mostrarlo compacto en la tarjeta
  return trimmed.replace(/^t\.?\s*/i, '');
}

/**
 * Tarjeta de producto refinada para e-commerce táctico.
 * Fondo limpio para imágenes, chips compactos de talles y colores,
 * stock semántico y apertura del modal interactivo.
 */
export default function ProductoCard({ producto, index, onSelect }: Props) {
  const stockTotal = producto.variantes.reduce((sum, v) => sum + v.stock, 0);

  // Estado semántico de stock
  const estaSinStock = stockTotal === 0;
  const esUltimasUnidades = stockTotal > 0 && stockTotal <= 5;

  // Imagen del producto o fallback
  const imagenSrc = producto.imagen_url || DEFAULT_IMAGES[producto.nombre];

  // Talles disponibles únicos
  const tallesUnicos = [...new Set(producto.variantes.map((v) => v.talle))];

  // Colores disponibles únicos
  const coloresUnicos = [...new Set(producto.variantes.map((v) => v.color))];

  return (
    <article
      onClick={() => onSelect(producto)}
      className="card-hover p-0 overflow-hidden animate-slide-up opacity-0 fill-mode-forwards flex flex-col justify-between h-full group cursor-pointer border border-zinc-200 dark:border-zinc-800/80 hover:border-militar-500/60 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-militar-950/40 bg-white dark:bg-zinc-900/90 transition-all duration-300"
      style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
    >
      <div>
        {/* ─── Contenedor de Imagen ─── */}
        <div className="relative w-full h-56 sm:h-60 overflow-hidden flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800/80 bg-white">
          {imagenSrc ? (
            <div className="relative w-full h-full p-4 flex items-center justify-center">
              <Image
                src={imagenSrc}
                alt={producto.nombre}
                fill
                className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : (
            /* Placeholder táctico estilizado cuando no hay foto */
            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 bg-tactical-grid flex flex-col items-center justify-center p-6 text-center">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-800 bg-black/60 flex items-center justify-center mb-3">
                <Image
                  src="/logo.png"
                  alt="Tropas Tunuyán"
                  fill
                  className="object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                Insignia Oficial
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Equipamiento Reglamentario
              </span>
            </div>
          )}

          {/* Badges Flotantes */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
            {producto.categorias ? (
              <span className="badge-categoria backdrop-blur-md bg-zinc-900/85 dark:bg-zinc-950/85 text-zinc-100 dark:text-zinc-200 border-zinc-700/50 dark:border-zinc-800 shadow-md">
                {producto.categorias.nombre}
              </span>
            ) : <span />}

            {producto.exige_credencial && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-950/90 text-red-200 border border-red-700/60 shadow-md backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Credencial
              </span>
            )}
          </div>
        </div>

        {/* ─── Contenido de la Tarjeta ─── */}
        <div className="p-5 pb-3">
          {/* Título */}
          <h3 className="text-zinc-900 dark:text-white font-display font-bold text-lg leading-snug line-clamp-1 group-hover:text-militar-600 dark:group-hover:text-militar-300 transition-colors mb-1.5">
            {producto.nombre}
          </h3>

          {/* Descripción limitada a 2 líneas para alineación perfecta */}
          <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed line-clamp-2 min-h-[2.5rem] mb-4">
            {producto.descripcion || 'Equipamiento e indumentaria táctica de alta calidad para fuerzas de seguridad.'}
          </p>

          {/* ─── Píldoras de Talles y Colores (Compactas) ─── */}
          <div className="space-y-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            {/* Talles */}
            {tallesUnicos.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mr-1">
                  Talles:
                </span>
                {tallesUnicos.slice(0, 5).map((talle) => (
                  <span
                    key={talle}
                    className="inline-block px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold"
                  >
                    {formatTalleChip(talle)}
                  </span>
                ))}
                {tallesUnicos.length > 5 && (
                  <span className="text-[11px] text-zinc-500 font-medium">
                    +{tallesUnicos.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Colores */}
            {coloresUnicos.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mr-1">
                  Colores:
                </span>
                <div className="flex items-center gap-1.5">
                  {coloresUnicos.map((color) => {
                    const dotColor = COLOR_DOTS[color] || '#3f3f46';
                    return (
                      <span
                        key={color}
                        title={color}
                        className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-700/80 shadow-sm"
                        style={{ backgroundColor: dotColor }}
                      />
                    );
                  })}
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 ml-1">
                    {coloresUnicos.join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Footer de la Tarjeta: Precio, Estado Semántico y Botón ─── */}
      <div className="px-5 pb-5 pt-0">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <div>
            <span className="text-2xl font-display font-extrabold text-zinc-900 dark:text-white tabular-nums tracking-tight">
              {formatPrecio(producto.precio)}
            </span>
          </div>

          {/* Estado semántico de stock (sin números exactos) */}
          <div>
            {estaSinStock ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                Sin stock
              </span>
            ) : esUltimasUnidades ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                Últimas unidades
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                En stock
              </span>
            )}
          </div>
        </div>

        {/* Botón de acción */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(producto);
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-militar-600 dark:hover:bg-militar-600 hover:text-white dark:hover:text-white border border-zinc-300 dark:border-zinc-700 hover:border-militar-500 transition-all duration-200 group-hover:bg-militar-600 group-hover:text-white group-hover:border-militar-500"
        >
          <span>Ver detalles / Pedir</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </article>
  );
}
