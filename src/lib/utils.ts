import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateFinancials(
  costo: number, 
  ganancia: number, 
  tipoDoc: 'factura' | 'boleta' = 'factura'
) {
  // Con factura, el costo ingresado por el usuario incluye IVA, por lo que se extrae el IVA de la compra (neto = costo / 1.19)
  // Con boleta, no se desglosa IVA de compra y se recarga el 19% al total final
  const costoNeto = tipoDoc === 'boleta' ? costo : Math.round(costo / 1.19);
  const valorNeto = costoNeto + ganancia;
  const iva = Math.round(valorNeto * 0.19);
  const valorTotal = valorNeto + iva;
  const margen = costoNeto > 0 ? (ganancia / costoNeto) * 100 : 0;
  return { valorNeto, iva, valorTotal, margen: Math.round(margen * 10) / 10, costoNeto };
}

export function calculateGananciaFromTotal(
  costo: number, 
  valorTotal: number, 
  tipoDoc: 'factura' | 'boleta' = 'factura'
) {
  const valorNeto = Math.round(valorTotal / 1.19);
  const costoNeto = tipoDoc === 'boleta' ? costo : Math.round(costo / 1.19);
  const ganancia = valorNeto - costoNeto;
  const iva = valorTotal - valorNeto;
  const margen = costoNeto > 0 ? (ganancia / costoNeto) * 100 : 0;
  return { ganancia, valorNeto, iva, margen: Math.round(margen * 10) / 10, costoNeto };
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
}

/**
 * Parse a YYYY-MM-DD date string safely without timezone shift.
 * new Date('2026-09-13') interprets as UTC midnight, which in Chile (UTC-4)
 * becomes Sept 12. This function parses the string directly.
 */
export function parseDateSafe(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Format a YYYY-MM-DD date string for display in Chilean locale, 
 * without timezone drift.
 */
export function formatDateCL(dateStr: string, options?: { long?: boolean }): string {
  const { year, month, day } = parseDateSafe(dateStr);
  if (!year || !month || !day) return 'Fecha inválida';

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  // Create date at noon to avoid any timezone edge cases
  const dateObj = new Date(year, month - 1, day, 12, 0, 0);
  const weekday = dayNames[dateObj.getDay()];

  if (options?.long) {
    return `${weekday}, ${day} de ${monthNames[month - 1]} de ${year}`;
  }
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
}

