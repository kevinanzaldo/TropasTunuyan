/**
 * Utilidades de formato para la aplicación.
 */

/** Formatea un número como precio en pesos argentinos */
export function formatPrecio(precio: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio);
}

/** Calcula el stock total sumando todas las variantes */
export function calcularStockTotal(stocks: number[]): number {
  return stocks.reduce((total, s) => total + s, 0);
}

/** Devuelve una clase CSS según el nivel de stock */
export function getStockStatusClass(stock: number, stockMinimo: number): string {
  if (stock === 0) return 'text-red-400';
  if (stock <= stockMinimo) return 'text-amber-400';
  return 'text-emerald-400';
}

/** Devuelve un texto descriptivo del nivel de stock */
export function getStockStatusText(stock: number, stockMinimo: number): string {
  if (stock === 0) return 'Sin stock';
  if (stock <= stockMinimo) return 'Stock bajo';
  return 'Disponible';
}
