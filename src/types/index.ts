export * from './database';

export type AiSuggestion = {
  id?: string;
  servicio: string;
  detalle: string;
  tipo_evento: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  valor_neto: number;
  iva: number;
  valor_total: number;
  margen: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  sin_ganancia?: boolean;
  iva_incluido?: boolean;
  costo_desglosado?: boolean;
};

export type FinancialSummary = {
  totalIngresosBrutos: number;
  facturacionNeta: number;
  costosOperativos: number;
  utilidadNeta: number;
  margenPromedio: number;
  ivaDebitoFiscal: number;
};

export type MonthlyData = {
  month: string;
  ventas: number;
  costos: number;
};

export type CostCategory = {
  name: string;
  value: number;
  percentage: number;
};
