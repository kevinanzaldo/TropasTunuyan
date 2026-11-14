'use client';

import { useRef, useState, useEffect } from 'react';
import type { Venta, VentaItemCarrito } from '@/types/database';
import { formatPrecio } from '@/lib/utils';
import {
  descargarTicketPdf,
  sanitizarTelefonoWhatsApp,
  formatearTelefonoVisual,
  generarTextoMensajeTicket,
  construirUrlsWhatsApp,
  getNombreMetodoPago,
} from '@/lib/pdfTicket';

interface ModalTicketVentaProps {
  abierto: boolean;
  venta: Venta | null;
  items: VentaItemCarrito[];
  vuelto: number;
  onNuevaVenta: () => void;
}

export default function ModalTicketVenta({
  abierto,
  venta,
  items,
  vuelto,
  onNuevaVenta,
}: ModalTicketVentaProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [copiadoNumero, setCopiadoNumero] = useState(false);
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<{ texto: string; tipo: 'exito' | 'info' } | null>(null);

  useEffect(() => {
    if (venta?.telefono_cliente) {
      setTelefonoCliente(venta.telefono_cliente);
    } else {
      setTelefonoCliente('');
    }
    setCopiadoNumero(false);
    setCopiadoTexto(false);
    setMensajeEstado(null);
  }, [venta]);

  if (!abierto || !venta) return null;

  const handleImprimir = () => {
    window.print();
  };

  const formatearFechaHora = (fechaIso: string) => {
    const d = new Date(fechaIso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const textoWhatsApp = generarTextoMensajeTicket(
    {
      ...venta,
      telefono_cliente: telefonoCliente || venta.telefono_cliente,
    },
    items,
    vuelto
  );

  const urlsWhatsApp = construirUrlsWhatsApp(telefonoCliente, textoWhatsApp);
  const telefonoVisual = formatearTelefonoVisual(telefonoCliente);

  const handleCopiarNumero = () => {
    if (!urlsWhatsApp.telefonoSanitizado) return;
    navigator.clipboard.writeText(urlsWhatsApp.telefonoSanitizado);
    setCopiadoNumero(true);
    setTimeout(() => setCopiadoNumero(false), 2500);
  };

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(textoWhatsApp);
    setCopiadoTexto(true);
    setTimeout(() => setCopiadoTexto(false), 2500);
  };

  const handleDescargarPdf = () => {
    descargarTicketPdf(
      {
        ...venta,
        telefono_cliente: telefonoCliente || venta.telefono_cliente,
      },
      items,
      vuelto
    );
    setMensajeEstado({
      texto: `PDF ${venta.numero_ticket} descargado. Podés arrastrarlo a WhatsApp para adjuntarlo como archivo si querés.`,
      tipo: 'exito',
    });
    setTimeout(() => setMensajeEstado(null), 5000);
  };

  // Abrir chat directo en WhatsApp Web (sin descargas forzadas ni pantallas intermedias)
  const handleAbrirWhatsAppWeb = () => {
    window.open(urlsWhatsApp.urlWebDirecto, '_blank');

    setMensajeEstado({
      texto: `Abriendo WhatsApp Web con ${telefonoVisual || 'el cliente'}. Presioná Enter en WhatsApp para enviar.`,
      tipo: 'exito',
    });
    setTimeout(() => setMensajeEstado(null), 5000);
  };

  // Abrir en la App instalada de WhatsApp en Windows
  const handleAbrirAppWhatsApp = () => {
    window.location.href = urlsWhatsApp.urlAppEscritorio;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onNuevaVenta();
      }}
    >
      <div
        className="w-full max-w-md max-h-[94vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera modal no imprimible */}
        <div className="flex-shrink-0 p-4 bg-emerald-600 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-700 font-bold">✓</span>
            <span className="text-sm font-bold">Venta Registrada Exitosamente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-emerald-800 px-2 py-0.5 rounded">
              {venta.numero_ticket}
            </span>
            <button
              type="button"
              onClick={onNuevaVenta}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-emerald-700 transition-colors text-base font-bold leading-none"
              title="Cerrar ticket"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── TICKET TÉRMICO FORMATEADO (58/80mm) ─── */}
        <div
          ref={ticketRef}
          className="flex-1 p-5 bg-white text-zinc-900 font-mono text-xs leading-relaxed overflow-y-auto print:max-h-none print:p-2 print:text-black"
        >
          {/* Membrete Oficial */}
          <div className="text-center pb-3 border-b border-dashed border-zinc-400">
            <h1 className="font-display font-black text-base uppercase tracking-wider text-black">
              TROPAS TUNUYÁN
            </h1>
            <p className="text-[10px] text-zinc-600 font-sans font-semibold">
              Indumentaria Militar & Equipamiento Táctico
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Tunuyán, Mendoza · Rep. Argentina
            </p>
            <p className="text-[10px] text-zinc-500">
              Tel: +54 9 2622 00-0000
            </p>
          </div>

          {/* Metadatos del Ticket */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold">COMPROBANTE INTERNO:</span>
              <span className="font-bold">{venta.numero_ticket}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>FECHA Y HORA:</span>
              <span>{formatearFechaHora(venta.created_at)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>CAJERO / TURNO:</span>
              <span>{venta.cajero_nombre}</span>
            </div>
            {(venta.nombre_cliente || telefonoCliente) && (
              <div className="flex justify-between text-zinc-700 pt-0.5 font-sans">
                <span className="font-bold">CLIENTE:</span>
                <span className="font-bold text-right text-emerald-800">
                  {[venta.nombre_cliente, telefonoVisual || telefonoCliente].filter(Boolean).join(' — ')}
                </span>
              </div>
            )}
          </div>

          {/* Detalle de Artículos */}
          <div className="py-3 border-b border-dashed border-zinc-400 space-y-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between">
              <span>DESCRIPCIÓN</span>
              <span>TOTAL</span>
            </div>
            {items.map((it, idx) => (
              <div key={`${it.variante_id}-${idx}`} className="space-y-0.5">
                <div className="flex justify-between font-bold text-zinc-900">
                  <span className="truncate pr-2">
                    {it.cantidad}x {it.nombre}
                  </span>
                  <span>{formatPrecio(it.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pl-4">
                  <span>Talle: {it.talle} | Color: {it.color}</span>
                  <span>(c/u {formatPrecio(it.precio)})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totales y Medio de Pago */}
          <div className="py-3 border-b border-dashed border-zinc-400 space-y-1.5">
            <div className="flex justify-between text-sm font-black text-black">
              <span>TOTAL ABONADO:</span>
              <span>{formatPrecio(venta.total)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-700 pt-1">
              <span>Medio de Pago:</span>
              <span className="font-semibold">{getNombreMetodoPago(venta.metodo_pago)}</span>
            </div>

            {venta.metodo_pago === 'efectivo' && vuelto > 0 && (
              <div className="flex justify-between text-[11px] text-zinc-700">
                <span>Vuelto Entregado:</span>
                <span className="font-semibold">{formatPrecio(vuelto)}</span>
              </div>
            )}

            {venta.nro_comprobante_digital && (
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>Nro. Operación/Cupón:</span>
                <span className="font-mono">{venta.nro_comprobante_digital}</span>
              </div>
            )}
          </div>

          {/* Constatación de Credencial Habilitante */}
          {venta.exigio_credencial && (
            <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 bg-zinc-50 p-2 rounded">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-800">
                🛡️ CONTROL REGLAMENTARIO DE CREDENCIAL
              </div>
              <div className="text-[10px] text-zinc-700">
                Fuerza: <strong className="text-black">{venta.fuerza_institucion}</strong>
              </div>
              {venta.legajo_comprador && (
                <div className="text-[10px] text-zinc-700">
                  Ref / Legajo: {venta.legajo_comprador}
                </div>
              )}
              <div className="text-[9px] text-emerald-700 font-bold">
                ✓ Credencial física/digital oficial verificada
              </div>
            </div>
          )}

          {/* Pie del Ticket */}
          <div className="text-center pt-4 pb-1 space-y-1">
            <p className="font-bold text-[11px] text-black">¡GRACIAS POR SU ELECCIÓN!</p>
            <p className="text-[9px] text-zinc-500">
              Comprobante no fiscal de control interno de mostrador.
            </p>
            <p className="text-[9px] text-zinc-400 font-mono">
              *** TROPAS TUNUYÁN SISTEMA OPERATIVO ***
            </p>
          </div>
        </div>

        {/* ─── TARJETA INTERACTIVA DE WHATSAPP DIRECTO (SIN PÁGINAS DE DESCARGA) ─── */}
        <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border-t border-emerald-200 dark:border-emerald-900/60 flex flex-col gap-2.5 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 uppercase tracking-wide">
              <span>📱</span> WhatsApp Directo al Cliente
            </span>
            {urlsWhatsApp.telefonoSanitizado ? (
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                {telefonoVisual}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 italic">Sin número cargado</span>
            )}
          </div>

          {/* Input de número en caso de corregir o cargar en el momento */}
          <div className="flex items-center gap-1.5">
            <input
              type="tel"
              value={telefonoCliente}
              onChange={(e) => setTelefonoCliente(e.target.value)}
              placeholder="Ej: 2622 662044 o 2622-123456"
              className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {urlsWhatsApp.telefonoSanitizado && (
              <button
                type="button"
                onClick={handleCopiarNumero}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                title="Copiar número de teléfono"
              >
                {copiadoNumero ? '✓ Copiado' : 'Copiar N°'}
              </button>
            )}
            <button
              type="button"
              onClick={handleCopiarTexto}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1"
              title="Copiar texto formateado del ticket"
            >
              {copiadoTexto ? '✓ Copiado' : 'Copiar Texto'}
            </button>
          </div>

          {/* Botones de Envío Rápido a WhatsApp */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {/* Opción 1: WhatsApp Web Directo (recomendado en PC para ir directo al chat) */}
            <button
              type="button"
              onClick={handleAbrirWhatsAppWeb}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all"
              title="Abre WhatsApp Web directamente con el chat de este número"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Abrir WhatsApp Web
            </button>

            {/* Opción 2: App de Windows (para quien tenga WhatsApp instalado en PC) */}
            <button
              type="button"
              onClick={handleAbrirAppWhatsApp}
              className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
              title="Abre la aplicación de escritorio de WhatsApp"
            >
              <span>💻</span>
              Abrir en App Windows
            </button>
          </div>

          {mensajeEstado && (
            <p
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md text-center transition-all ${
                mensajeEstado.tipo === 'exito'
                  ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200'
                  : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
              }`}
            >
              {mensajeEstado.texto}
            </p>
          )}
        </div>

        {/* ─── BOTONES GENERALES DE ACCIÓN ─── */}
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2 print:hidden">
          {/* Imprimir Térmica */}
          <button
            type="button"
            onClick={handleImprimir}
            className="flex-1 py-2 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 hover:bg-white dark:hover:bg-zinc-700 text-zinc-800 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Imprimir
          </button>

          {/* Descargar PDF */}
          <button
            type="button"
            onClick={handleDescargarPdf}
            className="flex-1 py-2 px-2.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Bajar PDF
          </button>

          {/* Nueva Venta */}
          <button
            type="button"
            onClick={onNuevaVenta}
            className="flex-1 py-2 px-3 rounded-xl bg-militar-600 hover:bg-militar-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Nueva Venta
          </button>
        </div>
      </div>
    </div>
  );
}
