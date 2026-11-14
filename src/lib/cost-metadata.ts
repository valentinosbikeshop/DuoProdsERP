import { calculateFinancials } from '@/lib/utils';

export type CostResourceType = 'servicio' | 'personal' | 'insumo' | 'logistica';
export type StaffModality = 'honorarios' | 'turno' | 'factura_subcontrato';

export interface ParsedCostMeta {
  resourceType: CostResourceType;
  staffCount: number;
  staffHours: string;
  staffModality: StaffModality;
  aplicaIvaVenta: boolean;
  cleanDetail: string;
}

export interface CostTaxBreakdown {
  costoBruto: number;
  costoNeto: number;
  ivaCredito: number;
  gananciaNeta: number;
  valorNetoVenta: number;
  ivaDebito: number;
  valorTotalVenta: number;
  balanceIvaF29: number;
  margenPct: number;
  retencionHonorarios: number;
  liquidoHonorarios: number;
  tipoDocCompra: 'factura' | 'boleta';
  meta: ParsedCostMeta;
}

export interface CostTemplatePreset {
  id: string;
  servicio: string;
  tipo_evento: 'Empresa' | 'Privado' | 'Matrimonio' | 'Cumpleaños';
  resourceType: CostResourceType;
  staffCount: number;
  staffHours: string;
  staffModality: StaffModality;
  tipo_doc_costo: 'factura' | 'boleta';
  aplicaIvaVenta: boolean;
  costo: number;
  ganancia: number;
  detail: string;
}

const STAFF_KEYWORDS = [
  'personal',
  'staff',
  'anfitrion',
  'bartender',
  'garzon',
  'garzón',
  'musico',
  'músico',
  'cuarteto',
  'banda',
  'dj',
  'vj',
  'animador',
  'sonidista',
  'tecnico',
  'técnico',
  'operador',
  'guardia',
  'fotograf',
  'filmmaker',
  'productor',
  'coordinador',
  'chef',
  'cocinero',
  'iluminador',
  'acreditacion',
  'acreditación',
];

const LOGISTICS_KEYWORDS = [
  'flete',
  'traslado',
  'generador',
  'baño',
  'transporte',
  'mobiliario',
  'carpa',
  'seguridad',
  'montaje',
  'rigging',
];

const INSUMO_KEYWORDS = [
  'banqueter',
  'coctel',
  'cóctel',
  'catering',
  'barra',
  'insumo',
  'bocado',
  'coffee',
  'menu',
  'menú',
  'comida',
  'bebida',
];

export const RESOURCE_TYPE_LABELS: Record<CostResourceType, string> = {
  servicio: 'Servicio / Equipo',
  personal: 'Personal / RR.HH.',
  insumo: 'Banquetería / Insumos',
  logistica: 'Logística / Montaje',
};

export const STAFF_MODALITY_LABELS: Record<StaffModality, string> = {
  honorarios: 'Boleta Honorarios SII',
  turno: 'Turno / Nómina',
  factura_subcontrato: 'Subcontrato Factura',
};

const TAG_REGEX = /^\[([^\]]+)\]\s*(.*)$/;

export function parseCostMetadata(
  tiempoDetalle?: string | null,
  tipoEvento?: string | null,
  servicio?: string | null
): ParsedCostMeta {
  const raw = (tiempoDetalle || '').trim();
  const combinedHint = `${servicio || ''} ${raw} ${tipoEvento || ''}`.toLowerCase();

  const defaults: ParsedCostMeta = {
    resourceType: 'servicio',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    cleanDetail: raw,
  };

  if (STAFF_KEYWORDS.some((kw) => combinedHint.includes(kw))) {
    defaults.resourceType = 'personal';
  } else if (INSUMO_KEYWORDS.some((kw) => combinedHint.includes(kw))) {
    defaults.resourceType = 'insumo';
  } else if (LOGISTICS_KEYWORDS.some((kw) => combinedHint.includes(kw))) {
    defaults.resourceType = 'logistica';
  }

  const match = raw.match(TAG_REGEX);
  if (!match) {
    return defaults;
  }

  const tagBody = match[1];
  const cleanDetail = (match[2] || '').trim();
  const segments = tagBody.split('·').map((s) => s.trim()).filter(Boolean);

  let resourceType: CostResourceType = defaults.resourceType;
  let staffCount = 1;
  let staffHours = 'Jornada';
  let staffModality: StaffModality = 'honorarios';
  let aplicaIvaVenta = true;
  let hasStructuredTag = false;

  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (lower.startsWith('personal:')) {
      hasStructuredTag = true;
      resourceType = 'personal';
      const countMatch = seg.match(/(\d+)\s*pers/i);
      if (countMatch) staffCount = Math.max(1, parseInt(countMatch[1], 10) || 1);
    } else if (lower === 'personal') {
      hasStructuredTag = true;
      resourceType = 'personal';
    } else if (lower === 'insumo' || lower === 'banquetería' || lower === 'banqueteria') {
      hasStructuredTag = true;
      resourceType = 'insumo';
    } else if (lower === 'logística' || lower === 'logistica') {
      hasStructuredTag = true;
      resourceType = 'logistica';
    } else if (lower === 'servicio') {
      hasStructuredTag = true;
      resourceType = 'servicio';
    } else if (lower === 'sin iva venta' || lower === 'exento iva') {
      hasStructuredTag = true;
      aplicaIvaVenta = false;
    } else if (lower.includes('honorarios')) {
      hasStructuredTag = true;
      staffModality = 'honorarios';
    } else if (lower.includes('turno') || lower.includes('nómina') || lower.includes('nomina')) {
      hasStructuredTag = true;
      staffModality = 'turno';
    } else if (lower.includes('subcontrato')) {
      hasStructuredTag = true;
      staffModality = 'factura_subcontrato';
    } else if (/pers\.?$/i.test(seg)) {
      hasStructuredTag = true;
      const num = parseInt(seg, 10);
      if (num > 0) staffCount = num;
    } else if (seg && hasStructuredTag) {
      staffHours = seg;
    }
  }

  if (!hasStructuredTag) {
    return defaults;
  }

  return {
    resourceType,
    staffCount,
    staffHours,
    staffModality,
    aplicaIvaVenta,
    cleanDetail,
  };
}

export function formatCostMetadata(meta: ParsedCostMeta): string {
  const parts: string[] = [];

  if (meta.resourceType === 'personal') {
    parts.push(`Personal: ${Math.max(1, meta.staffCount || 1)} pers.`);
    if (meta.staffHours?.trim()) {
      parts.push(meta.staffHours.trim());
    }
    parts.push(STAFF_MODALITY_LABELS[meta.staffModality || 'honorarios']);
  } else if (meta.resourceType === 'insumo') {
    parts.push('Insumo');
  } else if (meta.resourceType === 'logistica') {
    parts.push('Logística');
  } else if (!meta.aplicaIvaVenta) {
    parts.push('Servicio');
  }

  if (!meta.aplicaIvaVenta) {
    parts.push('Sin IVA Venta');
  }

  const clean = (meta.cleanDetail || '').trim();
  if (parts.length === 0) {
    return clean;
  }

  const prefix = `[${parts.join(' · ')}]`;
  return clean ? `${prefix} ${clean}` : prefix;
}

export function computeCostTaxBreakdown(cost: {
  servicio?: string | null;
  costo: number;
  ganancia: number;
  valor_neto?: number;
  valor_total?: number;
  tipo_doc_costo?: 'factura' | 'boleta' | string | null;
  tiempo_detalle?: string | null;
  tipo_evento?: string | null;
}): CostTaxBreakdown {
  const meta = parseCostMetadata(cost.tiempo_detalle, cost.tipo_evento, cost.servicio);
  const tipoDocCompra: 'factura' | 'boleta' =
    cost.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura';

  const fin = calculateFinancials(
    Number(cost.costo) || 0,
    Number(cost.ganancia) || 0,
    tipoDocCompra,
    meta.aplicaIvaVenta,
    false
  );

  const costoBruto = Number(cost.costo) || 0;
  const retencionHonorarios =
    meta.resourceType === 'personal' && meta.staffModality === 'honorarios'
      ? Math.round(costoBruto * 0.1375)
      : 0;
  const liquidoHonorarios =
    retencionHonorarios > 0 ? Math.max(0, costoBruto - retencionHonorarios) : costoBruto;

  return {
    costoBruto,
    costoNeto: fin.costoNeto,
    ivaCredito: fin.ivaCredito,
    gananciaNeta: Number(cost.ganancia) || 0,
    valorNetoVenta: fin.valorNeto,
    ivaDebito: fin.ivaDebito,
    valorTotalVenta: fin.valorTotal,
    balanceIvaF29: fin.ivaDebito - fin.ivaCredito,
    margenPct: fin.margen,
    retencionHonorarios,
    liquidoHonorarios,
    tipoDocCompra,
    meta,
  };
}

export const COMPANY_COST_TEMPLATES: CostTemplatePreset[] = [
  {
    id: 'tpl-sonidista',
    servicio: 'Ingeniero en Sonido FOH',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 1,
    staffHours: '8 hrs',
    staffModality: 'honorarios',
    tipo_doc_costo: 'boleta',
    aplicaIvaVenta: true,
    costo: 160000,
    ganancia: 75000,
    detail: 'Operación de consola digital y prueba de sonido',
  },
  {
    id: 'tpl-staff-anfitrionas',
    servicio: 'Equipo Anfitrionas & Acreditación QR',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 4,
    staffHours: '6 hrs',
    staffModality: 'honorarios',
    tipo_doc_costo: 'boleta',
    aplicaIvaVenta: true,
    costo: 220000,
    ganancia: 100000,
    detail: 'Recepción ejecutiva y control de acceso',
  },
  {
    id: 'tpl-garzones',
    servicio: 'Brigada de Garzones Banquetearía',
    tipo_evento: 'Matrimonio',
    resourceType: 'personal',
    staffCount: 6,
    staffHours: '7 hrs',
    staffModality: 'turno',
    tipo_doc_costo: 'boleta',
    aplicaIvaVenta: true,
    costo: 330000,
    ganancia: 135000,
    detail: 'Servicio en mesa 1 cada 20 invitados',
  },
  {
    id: 'tpl-bartenders',
    servicio: 'Staff Bartenders Coctelería',
    tipo_evento: 'Privado',
    resourceType: 'personal',
    staffCount: 3,
    staffHours: '6 hrs',
    staffModality: 'honorarios',
    tipo_doc_costo: 'boleta',
    aplicaIvaVenta: true,
    costo: 210000,
    ganancia: 95000,
    detail: 'Preparación barra libre y coctelería de autor',
  },
  {
    id: 'tpl-seguridad',
    servicio: 'Guardias de Seguridad OS-10 (Empresa Externa)',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 4,
    staffHours: '8 hrs',
    staffModality: 'factura_subcontrato',
    tipo_doc_costo: 'factura',
    aplicaIvaVenta: true,
    costo: 285600,
    ganancia: 110000,
    detail: 'Control perimetral acreditado con factura afecta',
  },
  {
    id: 'tpl-dj',
    servicio: 'DJ & VJ Profesional con Consola Pioneer',
    tipo_evento: 'Privado',
    resourceType: 'personal',
    staffCount: 1,
    staffHours: '5 hrs',
    staffModality: 'honorarios',
    tipo_doc_costo: 'boleta',
    aplicaIvaVenta: true,
    costo: 210000,
    ganancia: 140000,
    detail: 'Musicalización continua + visuales en pista',
  },
  {
    id: 'tpl-sonido-array',
    servicio: 'Sistema Sonido Line Array (300 pax)',
    tipo_evento: 'Empresa',
    resourceType: 'servicio',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    tipo_doc_costo: 'factura',
    aplicaIvaVenta: true,
    costo: 357000,
    ganancia: 180000,
    detail: 'Subwoofers + tops + microfonía inalámbrica',
  },
  {
    id: 'tpl-led',
    servicio: 'Pantalla LED Pitch 3.9 (4x2.5m) + Iluminación',
    tipo_evento: 'Empresa',
    resourceType: 'servicio',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    tipo_doc_costo: 'factura',
    aplicaIvaVenta: true,
    costo: 476000,
    ganancia: 240000,
    detail: '12 cabezas móviles Beam + procesador de video',
  },
  {
    id: 'tpl-banqueteria',
    servicio: 'Banquetería 3 Tiempos Premium (por persona)',
    tipo_evento: 'Matrimonio',
    resourceType: 'insumo',
    staffCount: 1,
    staffHours: 'Evento',
    staffModality: 'factura_subcontrato',
    tipo_doc_costo: 'factura',
    aplicaIvaVenta: true,
    costo: 33320,
    ganancia: 14000,
    detail: 'Entrada, fondo, postre + vajilla y cristalería',
  },
  {
    id: 'tpl-coffee',
    servicio: 'Coffee Break Ejecutivo Continuo (por persona)',
    tipo_evento: 'Empresa',
    resourceType: 'insumo',
    staffCount: 1,
    staffHours: 'AM / PM',
    staffModality: 'factura_subcontrato',
    tipo_doc_costo: 'factura',
    aplicaIvaVenta: true,
    costo: 9520,
    ganancia: 4500,
    detail: 'Café grano, té, jugos naturales y pastelería',
  },
  {
    id: 'tpl-generador',
    servicio: 'Generador Eléctrico Silencioso 40 kVA',
    tipo_evento: 'Matrimonio',
    resourceType: 'logistica',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    tipo_doc_costo: 'factura',
    aplicaIvaVenta: true,
    costo: 214200,
    ganancia: 85000,
    detail: 'Incluye tablero trifásico y combustible base',
  },
  {
    id: 'tpl-flete',
    servicio: 'Flete Camión Cerrado + Carga y Descarga',
    tipo_evento: 'Empresa',
    resourceType: 'logistica',
    staffCount: 2,
    staffHours: 'Ida/Vuelta',
    staffModality: 'turno',
    tipo_doc_costo: 'boleta',
    aplicaIvaVenta: true,
    costo: 95000,
    ganancia: 35000,
    detail: 'Traslado de equipamiento dentro de la región',
  },
];
