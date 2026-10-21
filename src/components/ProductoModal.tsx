'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { ProductoConVariantes } from '@/types/database';
import { formatPrecio } from '@/lib/utils';

interface Props {
  producto: ProductoConVariantes | null;
  onClose: () => void;
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

export default function ProductoModal({ producto, onClose }: Props) {
  // Manejo de teclado (Escape) y bloqueo de scroll
  useEffect(() => {
    if (!producto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [producto, onClose]);

  // Estados locales para selección de variante
  const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
  const [talleSeleccionado, setTalleSeleccionado] = useState<string>('');

  // Inicializar color y talle al abrir
  useEffect(() => {
    if (producto && producto.variantes.length > 0) {
      const primerColor = producto.variantes[0].color;
      setColorSeleccionado(primerColor);

      const variantesDelColor = producto.variantes.filter((v) => v.color === primerColor);
      // Priorizar un talle con stock disponible
      const disponible = variantesDelColor.find((v) => v.stock > 0) || variantesDelColor[0];
      setTalleSeleccionado(disponible ? disponible.talle : '');
    }
  }, [producto]);

  if (!producto) return null;

  const imagenSrc = producto.imagen_url || DEFAULT_IMAGES[producto.nombre];

  // Colores disponibles únicos
  const colores = [...new Set(producto.variantes.map((v) => v.color))];

  // Variantes correspondientes al color actual
  const variantesColorActual = producto.variantes.filter((v) => v.color === colorSeleccionado);

  // Variante seleccionada puntual
  const varianteActual = variantesColorActual.find((v) => v.talle === talleSeleccionado);
  const estaDisponible = varianteActual ? varianteActual.stock > 0 : false;
  const esUltimasUnidades = varianteActual ? varianteActual.stock > 0 && varianteActual.stock <= 5 : false;

  // Generar enlace dinámico de WhatsApp pre-armado
  const mensajeWhatsApp = encodeURIComponent(
    `Hola Tropas Tunuyán, quisiera consultar y reservar el siguiente artículo de su catálogo:\n\n` +
    `• *Producto:* ${producto.nombre}\n` +
    `• *Color:* ${colorSeleccionado || 'Estándar'}\n` +
    `• *Talle:* ${talleSeleccionado ? `T. ${talleSeleccionado}` : 'Único'}\n` +
    `• *Precio:* ${formatPrecio(producto.precio)}\n` +
    `• *Exige Credencial:* ${producto.exige_credencial ? 'SÍ (Cuento con credencial oficial policial/militar/seguridad)' : 'No requiere'}\n\n` +
    `¿Me confirman disponibilidad y medios de entrega o retiro en Tunuyán? Muchas gracias.`
  );

  const urlWhatsApp = `https://wa.me/5492622000000?text=${mensajeWhatsApp}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10 animate-fade-in">
      {/* Backdrop con blur profundo */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col md:flex-row transition-colors">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2 rounded-full bg-white/95 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 dark:bg-zinc-900/95 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 transition-all shadow-md backdrop-blur-sm"
          aria-label="Cerrar ventana"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Columna Izquierda: Imagen (optimizada para viewport móvil) */}
        <div className="md:w-1/2 bg-white relative h-48 sm:h-64 md:h-auto md:min-h-[460px] flex-shrink-0 flex items-center justify-center p-4 sm:p-6 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
          {imagenSrc ? (
            <div className="relative w-full h-full min-h-[160px] sm:min-h-[220px] flex items-center justify-center">
              <Image
                src={imagenSrc}
                alt={producto.nombre}
                fill
                className="object-contain p-2 sm:p-4"
                priority
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-500 gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-300 bg-zinc-100 flex items-center justify-center">
                <Image src="/logo.png" alt="Logo" fill className="object-cover opacity-60" />
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">
                Equipamiento Oficial
              </span>
            </div>
          )}

          {/* Badge flotante de Credencial */}
          {producto.exige_credencial && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-red-100 dark:bg-red-950/90 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700/60 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="hidden sm:inline">Uso Exclusivo — Requiere Credencial</span>
                <span className="sm:hidden">Con Credencial</span>
              </span>
            </div>
          )}
        </div>

        {/* Columna Derecha: Detalles & Selección */}
        <div className="md:w-1/2 p-5 sm:p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Categoría */}
            {producto.categorias && (
              <span className="inline-block text-xs font-semibold text-militar-700 dark:text-militar-400 uppercase tracking-wider mb-1.5">
                {producto.categorias.nombre}
              </span>
            )}

            {/* Título */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-zinc-900 dark:text-white leading-tight mb-2 sm:mb-3">
              {producto.nombre}
            </h2>

            {/* Precio */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl sm:text-4xl font-display font-extrabold text-zinc-900 dark:text-white tabular-nums tracking-tight">
                {formatPrecio(producto.precio)}
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                Precio unitario final
              </span>
            </div>

            {/* Descripción completa */}
            {producto.descripcion && (
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-6">
                {producto.descripcion}
              </p>
            )}

            {/* Selector de Color */}
            {colores.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Color:{' '}
                  <span className="text-zinc-900 dark:text-white font-medium capitalize">
                    {colorSeleccionado}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colores.map((color) => {
                    const esActivo = color === colorSeleccionado;
                    const bgDot = COLOR_DOTS[color] || '#3f3f46';
                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setColorSeleccionado(color);
                          const nuevasVariantes = producto.variantes.filter((v) => v.color === color);
                          if (nuevasVariantes.length > 0) {
                            setTalleSeleccionado(nuevasVariantes[0].talle);
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          esActivo
                            ? 'bg-militar-50 dark:bg-zinc-800 text-militar-800 dark:text-white border-militar-500 shadow-sm ring-1 ring-militar-500/40'
                            : 'bg-zinc-100 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-zinc-400 dark:border-zinc-600 shadow-sm"
                          style={{ backgroundColor: bgDot }}
                        />
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selector de Talle */}
            {variantesColorActual.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Talle Disponible:{' '}
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {talleSeleccionado ? `T. ${talleSeleccionado}` : 'Seleccione talle'}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {variantesColorActual.map((variante) => {
                    const esActivo = variante.talle === talleSeleccionado;
                    const tieneStock = variante.stock > 0;
                    return (
                      <button
                        key={variante.id}
                        disabled={!tieneStock}
                        onClick={() => setTalleSeleccionado(variante.talle)}
                        className={`min-w-[48px] px-3.5 py-2 rounded-lg text-xs font-bold border transition-all ${
                          esActivo
                            ? 'bg-militar-600 text-white border-militar-500 shadow-md shadow-militar-600/30'
                            : tieneStock
                            ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                            : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-900 cursor-not-allowed line-through'
                        }`}
                        title={tieneStock ? `Talle ${variante.talle} disponible` : `Talle ${variante.talle} agotado`}
                      >
                        {variante.talle.startsWith('T.') ? variante.talle : `T. ${variante.talle}`}
                      </button>
                    );
                  })}
                </div>

                {/* Estado semántico de disponibilidad */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {estaDisponible ? (
                    esUltimasUnidades ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                        Últimas unidades disponibles en este talle
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        En stock para entrega inmediata
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
                      Sin stock momentáneo en este talle
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Aviso de Credencial */}
            {producto.exige_credencial && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-xs">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Requisito Obligatorio de Credencial
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Para confirmar este pedido se solicitará foto de credencial oficial (Policía, FF.AA., Penitenciario o Seguridad Privada habilitada) al coordinar por WhatsApp.
                </p>
              </div>
            )}
          </div>

          {/* CTA Principal WhatsApp */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <a
              href={urlWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-950/20 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Consultar / Reservar por WhatsApp
            </a>
            <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
              Se enviará automáticamente el detalle del producto, talle y color seleccionado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
