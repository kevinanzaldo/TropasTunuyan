'use client';

import { useRef } from 'react';
import type { Venta, VentaItemCarrito } from '@/types/database';
import { formatPrecio } from '@/lib/utils';

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

  const getNombreMetodoPago = () => {
    switch (venta.metodo_pago) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia_alias':
        return 'Mercado Pago / Transferencia Alias';
      case 'tarjeta_postnet':
        return 'Tarjeta (Postnet BNA)';
      case 'combinado':
        return 'Pago Combinado';
      default:
        return 'Mostrador';
    }
  };

  const handleCompartirWhatsApp = () => {
    let texto = `*TROPAS TUNUYÁN — COMPROBANTE DE COMPRA*\n`;
    texto += `*Ticket N.°:* ${venta.numero_ticket}\n`;
    texto += `*Fecha:* ${formatearFechaHora(venta.created_at)}\n`;
    texto += `*Atendido por:* ${venta.cajero_nombre}\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    items.forEach((it) => {
      texto += `• ${it.cantidad}x ${it.nombre} (${it.talle}/${it.color})\n  Subtotal: ${formatPrecio(it.subtotal)}\n`;
    });
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `*TOTAL ABONADO:* ${formatPrecio(venta.total)}\n`;
    texto += `*Medio de Pago:* ${getNombreMetodoPago()}\n`;
    if (venta.nro_comprobante_digital) {
      texto += `*Comprobante/Cupón:* ${venta.nro_comprobante_digital}\n`;
    }
    if (venta.exigio_credencial && venta.fuerza_institucion) {
      texto += `*Acreditación Oficial:* ${venta.fuerza_institucion} (Credencial Verificada)\n`;
    }
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `¡Gracias por su compra y servicio!\n`;
    texto += `Tropas Tunuyán — Equipamiento e Indumentaria Táctica`;

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Cabecera modal no imprimible */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-700">✓</span>
            <span className="text-sm font-bold">Venta Registrada Exitosamente</span>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-800 px-2 py-0.5 rounded">
            {venta.numero_ticket}
          </span>
        </div>

        {/* ─── TICKET TÉRMICO FORMATEADO (58/80mm) ─── */}
        <div
          ref={ticketRef}
          className="p-6 bg-white text-zinc-900 font-mono text-xs leading-relaxed max-h-[70vh] overflow-y-auto print:max-h-none print:p-2 print:text-black"
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
              <span className="font-semibold">{getNombreMetodoPago()}</span>
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

        {/* Botones de Acción (ocultos al imprimir) */}
        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleImprimir}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            Imprimir Ticket (Térmica)
          </button>

          <button
            type="button"
            onClick={handleCompartirWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            title="Enviar detalle por WhatsApp al cliente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            WhatsApp
          </button>

          <button
            type="button"
            onClick={onNuevaVenta}
            className="py-2.5 px-4 rounded-xl bg-militar-600 hover:bg-militar-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

