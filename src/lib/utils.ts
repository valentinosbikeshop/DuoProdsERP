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

export function calculateFinancials(costo: number, ganancia: number) {
  const valorNeto = costo + ganancia;
  const iva = Math.round(valorNeto * 0.19);
  const valorTotal = valorNeto + iva;
  const margen = costo > 0 ? (ganancia / costo) * 100 : 0;
  return { valorNeto, iva, valorTotal, margen: Math.round(margen * 10) / 10 };
}

export function calculateGananciaFromTotal(costo: number, valorTotal: number) {
  const valorNeto = Math.round(valorTotal / 1.19);
  const ganancia = valorNeto - costo;
  const iva = valorTotal - valorNeto;
  const margen = costo > 0 ? (ganancia / costo) * 100 : 0;
  return { ganancia, valorNeto, iva, margen: Math.round(margen * 10) / 10 };
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
}
