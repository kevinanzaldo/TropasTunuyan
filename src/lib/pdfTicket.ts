import { jsPDF } from 'jspdf';
import type { Venta, VentaItemCarrito } from '@/types/database';
import { formatPrecio } from './utils';

/**
 * Sanitiza y formatea un número telefónico argentino para WhatsApp (E.164: +54 9 ...)
 * Detecta números locales de Tunuyán / Valle de Uco / Mendoza y remueve prefijos 0 y 15.
 */
export function sanitizarTelefonoWhatsApp(tel: string): string {
  if (!tel) return '';
  let cleaned = tel.replace(/\D/g, '');
  if (!cleaned) return '';

  // Remover 0 inicial
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Si ingresó solo el número local de Tunuyán (6 dígitos, ej: 662044), anteponer 2622
  if (cleaned.length === 6) {
    cleaned = '2622' + cleaned;
  }

  // Si ingresó con 15 local (ej: 15662044 -> 8 dígitos)
  if (cleaned.length === 8 && cleaned.startsWith('15')) {
    cleaned = '2622' + cleaned.substring(2);
  }

  // Si ya tiene formato internacional completo con 9 móvil (549...)
  if (cleaned.startsWith('549')) {
    return cleaned;
  }

  // Si tiene 54 pero le falta el 9 reglamentario de WhatsApp para móviles de Argentina:
  if (cleaned.startsWith('54')) {
    return '549' + cleaned.substring(2);
  }

  // Si tiene formato estándar de 10 dígitos (ej: 2622662044 o 1123456789)
  if (cleaned.length === 10) {
    return '549' + cleaned;
  }

  // Si tiene 15 entre código de área y número (ej: 2622 + 15 + 662044 -> 12 dígitos)
  if (cleaned.length === 12 && cleaned.includes('15')) {
    cleaned = cleaned.replace('15', '');
    return '549' + cleaned;
  }

  // Si empieza con 9 y tiene 11 dígitos (92622662044)
  if (cleaned.startsWith('9') && cleaned.length === 11) {
    return '54' + cleaned;
  }

  // Fallback con prefijo 549 para números argentinos habituales
  if (cleaned.length >= 8 && cleaned.length <= 11) {
    return '549' + cleaned;
  }

  return cleaned;
}

/**
 * Formato visual amigable para mostrar en pantalla al cajero (ej: +54 9 2622 66-2044)
 */
export function formatearTelefonoVisual(tel: string): string {
  const s = sanitizarTelefonoWhatsApp(tel);
  if (!s) return '';
  if (s.startsWith('549') && s.length >= 12) {
    const codArea = s.substring(3, 7);
    const num = s.substring(7);
    if (num.length >= 6) {
      return `+54 9 ${codArea} ${num.slice(0, 2)}-${num.slice(2)}`;
    }
    return `+54 9 ${codArea} ${num}`;
  }
  return `+${s}`;
}

/**
 * Nombre legible del método de pago para el ticket
 */
export function getNombreMetodoPago(metodo: string): string {
  switch (metodo) {
    case 'efectivo':
      return 'Efectivo';
    case 'transferencia_alias':
      return 'Mercado Pago / Transferencia';
    case 'tarjeta_postnet':
      return 'Tarjeta (Postnet BNA)';
    case 'combinado':
      return 'Pago Combinado';
    default:
      return 'Mostrador';
  }
}

/**
 * Genera el texto completo del comprobante para el cuerpo del mensaje de WhatsApp
 */
export function generarTextoMensajeTicket(
  venta: Venta,
  items: VentaItemCarrito[],
  vuelto: number = 0
): string {
  const fechaStr = new Date(venta.created_at).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let texto = `*🎖️ TROPAS TUNUYÁN — COMPROBANTE DE COMPRA*\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `*Ticket N.°:* ${venta.numero_ticket}\n`;
  texto += `*Fecha:* ${fechaStr}\n`;
  texto += `*Atendido por:* ${venta.cajero_nombre}\n`;
  if (venta.nombre_cliente) {
    texto += `*Cliente:* ${venta.nombre_cliente}\n`;
  }
  texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `*DETALLE DE PRODUCTOS:*\n`;

  items.forEach((it) => {
    texto += `• *${it.cantidad}x* ${it.nombre}\n`;
    texto += `   Talle: ${it.talle} | Color: ${it.color} — Subtotal: ${formatPrecio(it.subtotal)}\n`;
  });

  texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `*TOTAL ABONADO:* *${formatPrecio(venta.total)}*\n`;
  texto += `*Medio de Pago:* ${getNombreMetodoPago(venta.metodo_pago)}\n`;

  if (venta.metodo_pago === 'efectivo' && vuelto > 0) {
    texto += `*Vuelto Entregado:* ${formatPrecio(vuelto)}\n`;
  }

  if (venta.nro_comprobante_digital) {
    texto += `*Nro. Cupón/Op:* ${venta.nro_comprobante_digital}\n`;
  }

  if (venta.exigio_credencial && venta.fuerza_institucion) {
    texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `*🛡️ Acreditación Oficial:* ${venta.fuerza_institucion} (Credencial Verificada)\n`;
  }

  texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `📄 *Comprobante emitido por Tropas Tunuyán*\n`;
  texto += `¡Muchas gracias por su compra y servicio!`;

  return texto;
}

/**
 * Construye los enlaces directos a WhatsApp evitando la pantalla de descarga de PC
 */
export function construirUrlsWhatsApp(telefono: string, textoMensaje: string) {
  const telefonoSanitizado = sanitizarTelefonoWhatsApp(telefono);
  const textoEncoded = encodeURIComponent(textoMensaje);

  // 1. WhatsApp Web Directo (salta la página intermedia de descarga en PC)
  const urlWebDirecto = telefonoSanitizado
    ? `https://web.whatsapp.com/send/?phone=${telefonoSanitizado}&text=${textoEncoded}`
    : `https://web.whatsapp.com/send/?text=${textoEncoded}`;

  // 2. Protocolo para la App de WhatsApp instalada en Windows / Desktop
  const urlAppEscritorio = telefonoSanitizado
    ? `whatsapp://send?phone=${telefonoSanitizado}&text=${textoEncoded}`
    : `whatsapp://send?text=${textoEncoded}`;

  // 3. Enlace universal para Celulares (móviles Android / iOS)
  const urlMovil = telefonoSanitizado
    ? `https://api.whatsapp.com/send?phone=${telefonoSanitizado}&text=${textoEncoded}`
    : `https://api.whatsapp.com/send?text=${textoEncoded}`;

  return {
    telefonoSanitizado,
    urlWebDirecto,
    urlAppEscritorio,
    urlMovil,
  };
}

/**
 * Genera el documento PDF del Ticket Térmico (formato de 80mm de ancho con altura dinámica)
 */
export function generarTicketPdf(
  venta: Venta,
  items: VentaItemCarrito[],
  vuelto: number = 0
): jsPDF {
  const baseHeight = 115;
  const itemsHeight = items.length * 9;
  const credencialHeight = venta.exigio_credencial ? 22 : 0;
  const clienteHeight = (venta.nombre_cliente || venta.telefono_cliente) ? 8 : 0;
  const totalHeight = Math.max(140, baseHeight + itemsHeight + credencialHeight + clienteHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  const anchoTotal = 80;
  const margen = 5;
  let cursorY = 8;

  // 1. Membrete
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TROPAS TUNUYÁN', anchoTotal / 2, cursorY, { align: 'center' });
  cursorY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Indumentaria Militar & Equipamiento Táctico', anchoTotal / 2, cursorY, { align: 'center' });
  cursorY += 3.5;

  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Tunuyán, Mendoza · Rep. Argentina', anchoTotal / 2, cursorY, { align: 'center' });
  cursorY += 3;
  doc.text('Tel: +54 9 2622 00-0000', anchoTotal / 2, cursorY, { align: 'center' });
  cursorY += 4;

  // Línea divisoria
  doc.setTextColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margen, cursorY, anchoTotal - margen, cursorY);
  cursorY += 4;

  // 2. Datos del Ticket
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE INTERNO:', margen, cursorY);
  doc.text(venta.numero_ticket, anchoTotal - margen, cursorY, { align: 'right' });
  cursorY += 3.5;

  doc.setFont('helvetica', 'normal');
  const fechaStr = new Date(venta.created_at).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text('FECHA Y HORA:', margen, cursorY);
  doc.text(fechaStr, anchoTotal - margen, cursorY, { align: 'right' });
  cursorY += 3.5;

  doc.text('CAJERO / TURNO:', margen, cursorY);
  doc.text(venta.cajero_nombre || 'Mostrador', anchoTotal - margen, cursorY, { align: 'right' });
  cursorY += 3.5;

  if (venta.telefono_cliente || venta.nombre_cliente) {
    doc.text('CLIENTE:', margen, cursorY);
    const cliInfo = [venta.nombre_cliente, venta.telefono_cliente].filter(Boolean).join(' - ');
    doc.text(cliInfo, anchoTotal - margen, cursorY, { align: 'right' });
    cursorY += 3.5;
  }

  // Línea divisoria
  cursorY += 0.5;
  doc.line(margen, cursorY, anchoTotal - margen, cursorY);
  cursorY += 4;

  // 3. Cabecera Artículos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('DESCRIPCIÓN', margen, cursorY);
  doc.text('TOTAL', anchoTotal - margen, cursorY, { align: 'right' });
  cursorY += 3.5;
  doc.setTextColor(0, 0, 0);

  // 4. Listado de Artículos
  items.forEach((it) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const nombreTruncado = it.nombre.length > 22 ? `${it.nombre.substring(0, 20)}...` : it.nombre;
    doc.text(`${it.cantidad}x ${nombreTruncado}`, margen, cursorY);
    doc.text(formatPrecio(it.subtotal), anchoTotal - margen, cursorY, { align: 'right' });
    cursorY += 3.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Talle: ${it.talle} | Color: ${it.color} (c/u ${formatPrecio(it.precio)})`, margen + 2, cursorY);
    doc.setTextColor(0, 0, 0);
    cursorY += 4;
  });

  // Línea divisoria
  cursorY += 0.5;
  doc.line(margen, cursorY, anchoTotal - margen, cursorY);
  cursorY += 4.5;

  // 5. Totales y Método de Pago
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL ABONADO:', margen, cursorY);
  doc.text(formatPrecio(venta.total), anchoTotal - margen, cursorY, { align: 'right' });
  cursorY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Medio de Pago:', margen, cursorY);
  doc.text(getNombreMetodoPago(venta.metodo_pago), anchoTotal - margen, cursorY, { align: 'right' });
  cursorY += 3.5;

  if (venta.metodo_pago === 'efectivo' && vuelto > 0) {
    doc.text('Vuelto Entregado:', margen, cursorY);
    doc.text(formatPrecio(vuelto), anchoTotal - margen, cursorY, { align: 'right' });
    cursorY += 3.5;
  }

  if (venta.nro_comprobante_digital) {
    doc.setFontSize(7);
    doc.text('Nro. Cupón / Operación:', margen, cursorY);
    doc.text(venta.nro_comprobante_digital, anchoTotal - margen, cursorY, { align: 'right' });
    cursorY += 3.5;
  }

  // 6. Verificación de Credencial
  if (venta.exigio_credencial) {
    cursorY += 1;
    doc.line(margen, cursorY, anchoTotal - margen, cursorY);
    cursorY += 3.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('CONTROL REGLAMENTARIO DE CREDENCIAL', margen, cursorY);
    cursorY += 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Fuerza: ${venta.fuerza_institucion || 'No especificada'}`, margen, cursorY);
    cursorY += 2.8;

    if (venta.legajo_comprador) {
      doc.text(`Ref / Legajo: ${venta.legajo_comprador}`, margen, cursorY);
      cursorY += 2.8;
    }
    doc.text('Credencial reglamentaria oficial constatada en mostrador.', margen, cursorY);
    cursorY += 3;
  }

  // Línea divisoria pie
  cursorY += 1;
  doc.line(margen, cursorY, anchoTotal - margen, cursorY);
  cursorY += 4;

  // 7. Pie del Ticket
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('¡GRACIAS POR SU ELECCIÓN!', anchoTotal / 2, cursorY, { align: 'center' });
  cursorY += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(110, 110, 110);
  doc.text('Comprobante no fiscal de control interno de mostrador.', anchoTotal / 2, cursorY, {
    align: 'center',
  });
  cursorY += 2.8;
  doc.text('*** TROPAS TUNUYÁN SISTEMA OPERATIVO ***', anchoTotal / 2, cursorY, {
    align: 'center',
  });

  return doc;
}

/**
 * Descarga directamente el archivo PDF del ticket en el navegador
 */
export function descargarTicketPdf(
  venta: Venta,
  items: VentaItemCarrito[],
  vuelto: number = 0
): void {
  const doc = generarTicketPdf(venta, items, vuelto);
  const nombreArchivo = `Ticket-${venta.numero_ticket}.pdf`;
  doc.save(nombreArchivo);
}
