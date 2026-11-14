import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  DEMO_ORG_SLUG,
  DEMO_USER_EMAIL,
  DEMO_MAX_EVENTS,
  DEMO_MAX_COSTS,
  DEMO_MAX_ITEMS,
  DEMO_RETENTION_HOURS,
} from '@/lib/constants';
import { calculateFinancials } from '@/lib/utils';
import { formatCostMetadata, type CostResourceType, type StaffModality } from '@/lib/cost-metadata';

type AdminSupabase = SupabaseClient<Database>;

interface DemoCostSeed {
  id: string;
  servicio: string;
  tipo_evento: string;
  resourceType: CostResourceType;
  staffCount: number;
  staffHours: string;
  staffModality: StaffModality;
  aplicaIvaVenta: boolean;
  detail: string;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
}

const DEMO_BASE_COSTS: DemoCostSeed[] = [
  {
    id: 'd0000001-0000-4000-8000-000000000001',
    servicio: 'Cuarteto de Cuerdas Gala',
    tipo_evento: 'Matrimonio',
    resourceType: 'personal',
    staffCount: 4,
    staffHours: '90 min',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: 'Ceremonia y cóctel con repertorio clásico/moderno',
    costo: 260000,
    ganancia: 160000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000002',
    servicio: 'Banda Live Corporativa (6 músicos)',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 6,
    staffHours: '2 bloques 45m',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: 'Show bailable en vivo + prueba de sonido incluida',
    costo: 680000,
    ganancia: 320000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000003',
    servicio: 'DJ & VJ Profesional con Consola',
    tipo_evento: 'Privado',
    resourceType: 'personal',
    staffCount: 1,
    staffHours: '5 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: '5 horas continuas + consola Pioneer + visuales',
    costo: 210000,
    ganancia: 140000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000004',
    servicio: 'Sonido Line Array (300 pax)',
    tipo_evento: 'Empresa',
    resourceType: 'servicio',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Sistema PA + consola digital 32ch + microfonía Shure',
    costo: 357000,
    ganancia: 180000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000005',
    servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m',
    tipo_evento: 'Empresa',
    resourceType: 'servicio',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: '12 cabezas móviles Beam + pantalla P3.9 + procesador',
    costo: 476000,
    ganancia: 240000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000006',
    servicio: 'Banquetería 3 Tiempos Premium (por persona)',
    tipo_evento: 'Empresa',
    resourceType: 'insumo',
    staffCount: 1,
    staffHours: 'Evento',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Entrada, fondo, postre + vajilla y cristalería fina',
    costo: 33320,
    ganancia: 14000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000007',
    servicio: 'Cóctel Recepción 6 Bocados (por persona)',
    tipo_evento: 'Privado',
    resourceType: 'insumo',
    staffCount: 1,
    staffHours: '90 min',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Por asistente, incluye espumante, sour y jugos naturales',
    costo: 14280,
    ganancia: 6500,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000008',
    servicio: 'Barra Libre Coctelería de Autor (por persona)',
    tipo_evento: 'Matrimonio',
    resourceType: 'insumo',
    staffCount: 1,
    staffHours: '4 hrs',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Gin Tonic, Aperol Spritz, Pisco Sour Catedral + mixers',
    costo: 11900,
    ganancia: 5500,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000009',
    servicio: 'Cobertura Fotográfica + Reel 4K',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 2,
    staffHours: '8 hrs',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Fotógrafo + filmmaker con entrega aftermovie en 72h',
    costo: 297500,
    ganancia: 150000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000010',
    servicio: 'Animador Bilingüe Corporativo',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 1,
    staffHours: '4 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: false,
    detail: 'Conducción ceremonial español/inglés (Boleta exenta)',
    costo: 190000,
    ganancia: 110000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000011',
    servicio: 'Staff Anfitrionas & Acreditación QR',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 4,
    staffHours: '6 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: '4 anfitrionas bilingües + tótems de acreditación digital',
    costo: 220000,
    ganancia: 100000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000012',
    servicio: 'Mobiliario Lounge VIP LED',
    tipo_evento: 'Privado',
    resourceType: 'logistica',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: '4 sets sillones ecocuero + mesas de centro iluminadas',
    costo: 285600,
    ganancia: 130000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000013',
    servicio: 'Ingeniero en Sonido FOH + Operador Consola',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 2,
    staffHours: '10 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: 'Ingeniero principal + microfonista de escenario',
    costo: 240000,
    ganancia: 110000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000014',
    servicio: 'Brigada de Garzones Banquetearía (6 pers.)',
    tipo_evento: 'Matrimonio',
    resourceType: 'personal',
    staffCount: 6,
    staffHours: '8 hrs',
    staffModality: 'turno',
    aplicaIvaVenta: true,
    detail: 'Atención en mesa, descorche y servicio de cóctel',
    costo: 330000,
    ganancia: 145000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000015',
    servicio: 'Guardias Seguridad Acreditados OS-10',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 4,
    staffHours: '8 hrs',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Control de accesos y perímetro subcontratado con factura',
    costo: 285600,
    ganancia: 115000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000016',
    servicio: 'Equipo Bartenders Coctelería Turno Evento',
    tipo_evento: 'Privado',
    resourceType: 'personal',
    staffCount: 3,
    staffHours: '6 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: 'Mixólogos profesionales + cristalería y mise en place',
    costo: 210000,
    ganancia: 95000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000017',
    servicio: 'Productor General en Terreno + Stage Manager',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 2,
    staffHours: '12 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: true,
    detail: 'Dirección de minuto a minuto desde montaje hasta desmontaje',
    costo: 320000,
    ganancia: 160000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000018',
    servicio: 'Traductores Simultáneos + Cabina (2 pers.)',
    tipo_evento: 'Empresa',
    resourceType: 'personal',
    staffCount: 2,
    staffHours: '6 hrs',
    staffModality: 'honorarios',
    aplicaIvaVenta: false,
    detail: 'Inglés/Español con 100 receptores inalámbricos incluidos',
    costo: 450000,
    ganancia: 190000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000019',
    servicio: 'Generador Eléctrico Silencioso 40 kVA',
    tipo_evento: 'Matrimonio',
    resourceType: 'logistica',
    staffCount: 1,
    staffHours: 'Jornada',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Respaldo eléctrico completo con tablero trifásico y petróleo',
    costo: 214200,
    ganancia: 80000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000020',
    servicio: 'Flete Camión Cerrado + Cuadrilla Carga',
    tipo_evento: 'Empresa',
    resourceType: 'logistica',
    staffCount: 3,
    staffHours: 'Ida/Vuelta',
    staffModality: 'turno',
    aplicaIvaVenta: true,
    detail: 'Traslado ida y vuelta RM + 2 peonetas carga y descarga',
    costo: 115000,
    ganancia: 45000,
    tipo_doc_costo: 'boleta',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000021',
    servicio: 'Streaming Multicámara Full HD + Circuitos CCTV',
    tipo_evento: 'Empresa',
    resourceType: 'servicio',
    staffCount: 3,
    staffHours: '6 hrs',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: '3 cámaras 4K, switcher ATEM, enlace redundante y operador',
    costo: 595000,
    ganancia: 270000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000022',
    servicio: 'Escenario Modular 8x4m + Techado Truss',
    tipo_evento: 'Empresa',
    resourceType: 'logistica',
    staffCount: 4,
    staffHours: 'Montaje + Evento',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Tarima alfombrada negra + cubierta impermeable + rigging',
    costo: 654500,
    ganancia: 280000,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000023',
    servicio: 'Coffee Break Ejecutivo Continuo (por persona)',
    tipo_evento: 'Empresa',
    resourceType: 'insumo',
    staffCount: 1,
    staffHours: 'AM / PM',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Café de grano, tés gourmet, jugos, tapaditos y pastelería',
    costo: 9520,
    ganancia: 4500,
    tipo_doc_costo: 'factura',
  },
  {
    id: 'd0000001-0000-4000-8000-000000000024',
    servicio: 'Carpa Cristal 10x20m Iluminada con Guirnaldas',
    tipo_evento: 'Matrimonio',
    resourceType: 'logistica',
    staffCount: 1,
    staffHours: '48 hrs',
    staffModality: 'factura_subcontrato',
    aplicaIvaVenta: true,
    detail: 'Instalación anticipada, piso madera y cielo estrellado LED',
    costo: 1071000,
    ganancia: 420000,
    tipo_doc_costo: 'factura',
  },
];

// Deterministic IDs for the 6 deeply-developed base events
const EVENT_GALA_ID = 'd0000002-0000-4000-8000-000000000001';
const EVENT_FONDA_ID = 'd0000002-0000-4000-8000-000000000002';
const EVENT_BODA_ID = 'd0000002-0000-4000-8000-000000000003';
const EVENT_CUMBRE_ID = 'd0000002-0000-4000-8000-000000000004';
const EVENT_LANZAMIENTO_ID = 'd0000002-0000-4000-8000-000000000005';
const EVENT_SUNSET_ID = 'd0000002-0000-4000-8000-000000000006';

function buildItem(params: {
  id: string;
  organization_id: string;
  event_id: string;
  servicio: string;
  detalle: string;
  tipo_evento: string;
  cantidad: number;
  costo: number;
  ganancia: number;
  tipo_doc_costo: 'factura' | 'boleta';
  approved: boolean;
  parent_id?: string | null;
  es_insumo?: boolean;
  iva_incluido?: boolean;
  created_at?: string;
}) {
  const esInsumo = params.es_insumo ?? false;
  const ivaIncluido = params.iva_incluido ?? true;
  const fin = calculateFinancials(
    params.costo,
    params.ganancia,
    params.tipo_doc_costo,
    ivaIncluido,
    esInsumo
  );

  return {
    id: params.id,
    organization_id: params.organization_id,
    event_id: params.event_id,
    servicio: params.servicio,
    detalle: params.detalle,
    tipo_evento: params.tipo_evento,
    cantidad: params.cantidad,
    costo: params.costo,
    ganancia: esInsumo ? 0 : params.ganancia,
    valor_neto: fin.valorNeto,
    iva: fin.ivaDebito,
    valor_total: fin.valorTotal,
    margen: fin.margen,
    tipo_doc_costo: params.tipo_doc_costo,
    approved: params.approved,
    parent_id: params.parent_id ?? null,
    es_insumo: esInsumo,
    iva_incluido: ivaIncluido,
    is_demo_base: true,
    created_at: params.created_at || new Date().toISOString(),
  };
}

function buildTransaction(params: {
  id: string;
  organization_id: string;
  event_id: string;
  type: 'ABONO_CLIENTE' | 'GASTO_REAL';
  monto: number;
  fecha: string;
  descripcion: string;
  docType: string;
  servicioOverride?: string;
  aplicaIva?: boolean;
  created_at?: string;
}) {
  const isGasto = params.type === 'GASTO_REAL';
  const isFacturaDoc = isGasto && params.docType === 'factura';
  const aplicaIvaAbono = !isGasto && (params.aplicaIva ?? true);

  const valorNeto = isGasto
    ? isFacturaDoc
      ? Math.round(params.monto / 1.19)
      : params.monto
    : aplicaIvaAbono
    ? Math.round(params.monto / 1.19)
    : params.monto;

  const iva = isGasto
    ? isFacturaDoc
      ? params.monto - valorNeto
      : 0
    : aplicaIvaAbono
    ? params.monto - valorNeto
    : 0;

  return {
    id: params.id,
    organization_id: params.organization_id,
    event_id: params.event_id,
    servicio:
      params.servicioOverride ||
      (isGasto
        ? isFacturaDoc
          ? 'Factura de Proveedor'
          : 'Boleta de Proveedor'
        : 'Abono de Cliente'),
    detalle: `${params.fecha} | ${params.descripcion}`,
    tipo_evento: params.type,
    cantidad: 1,
    costo: isGasto ? params.monto : 0,
    ganancia: isGasto ? 0 : params.monto,
    valor_neto: valorNeto,
    iva,
    valor_total: params.monto,
    margen: isGasto ? 0 : 100,
    tipo_doc_costo: (isGasto
      ? params.docType === 'factura'
        ? 'factura'
        : 'boleta'
      : params.docType) as 'factura' | 'boleta',
    approved: true,
    parent_id: null,
    es_insumo: false,
    iva_incluido: isGasto ? isFacturaDoc : aplicaIvaAbono,
    is_demo_base: true,
    created_at:
      params.created_at || (params.fecha ? `${params.fecha}T12:00:00Z` : new Date().toISOString()),
  };
}

/**
 * Ensures the Demo Organization and Demo User exist, and seeds base data if empty or outdated.
 */
export async function ensureDemoEnvironment(admin: AdminSupabase) {
  let { data: demoOrg, error: orgError } = await admin
    .from('organizations')
    .select('*')
    .eq('slug', DEMO_ORG_SLUG)
    .single();

  if (orgError && orgError.code === '42P01') {
    throw new Error(
      'La tabla organizations aún no existe. Ejecuta el script supabase/migrations/20261114_multi_tenant_and_demo.sql en el SQL Editor de Supabase.'
    );
  }

  if (!demoOrg) {
    const { data: insertedOrg, error: createOrgErr } = await admin
      .from('organizations')
      .insert({
        name: 'Productora Horizonte (Demo)',
        slug: DEMO_ORG_SLUG,
        invite_code: 'DEMO-ERP-2026',
        legal_name: 'Productora Horizonte Eventos SpA (DEMO)',
        rut: '76.890.123-4',
        subtitle: 'PRODUCCIÓN INTEGRAL DE EVENTOS CORPORATIVOS, BODAS & BANQUETERÍA',
        location: 'Santiago / Viña del Mar, Chile',
        contact_email: 'contacto@productorahorizonte-demo.cl',
        contact_phone: '+56 9 9000 0000',
        bank_info: {
          banco: 'Banco Santander (Demo)',
          tipo_cuenta: 'Cuenta Corriente',
          numero_cuenta: '00-000-12345-67',
          titular: 'Productora Horizonte Eventos SpA',
          rut: '76.890.123-4',
          email: 'pagos@productorahorizonte-demo.cl',
        },
        is_demo: true,
        is_active: true,
        max_demo_events: DEMO_MAX_EVENTS,
        max_demo_costs: DEMO_MAX_COSTS,
      })
      .select()
      .single();

    if (createOrgErr || !insertedOrg) {
      throw new Error(`No se pudo inicializar la organización Demo: ${createOrgErr?.message}`);
    }
    demoOrg = insertedOrg;
  }

  if (!demoOrg) {
    throw new Error('Organización Demo no disponible.');
  }

  let demoUserId: string | null = null;
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', DEMO_USER_EMAIL)
    .maybeSingle();

  if (existingProfile?.id) {
    demoUserId = existingProfile.id;
  } else {
    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const foundAuthUser = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === DEMO_USER_EMAIL.toLowerCase()
    );

    if (foundAuthUser) {
      demoUserId = foundAuthUser.id;
    } else {
      const randomPassword = `Demo_${crypto.randomUUID()}_2026!`;
      const { data: createdUser, error: createUserErr } = await admin.auth.admin.createUser({
        email: DEMO_USER_EMAIL,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Evaluador Demo ERP' },
      });
      if (createUserErr || !createdUser.user) {
        throw new Error(`No se pudo crear el usuario Demo: ${createUserErr?.message}`);
      }
      demoUserId = createdUser.user.id;
    }
  }

  await admin.from('profiles').upsert({
    id: demoUserId,
    email: DEMO_USER_EMAIL,
    role: 'admin',
    status: 'active',
    organization_id: demoOrg.id,
    is_super_admin: false,
    full_name: 'Usuario Invitado (Prueba)',
  });

  // Automatically upgrade or restore canonical examples when missing or outdated (< 6 events or < 24 costs)
  const [{ count: baseEventsCount }, { count: baseCostsCount }] = await Promise.all([
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', demoOrg.id)
      .eq('is_demo_base', true),
    admin
      .from('master_costs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', demoOrg.id)
      .eq('is_demo_base', true),
  ]);

  if (
    !baseEventsCount ||
    baseEventsCount < 6 ||
    !baseCostsCount ||
    baseCostsCount < DEMO_BASE_COSTS.length
  ) {
    await seedCanonicalDemoData(admin, demoOrg.id, demoUserId);
  }

  return { demoOrg, demoUserId };
}

/**
 * Seeds or restores all canonical base examples (is_demo_base = true) for the Demo organization.
 */
export async function seedCanonicalDemoData(
  admin: AdminSupabase,
  demoOrgId: string,
  demoUserId: string
) {
  await admin
    .from('event_items')
    .delete()
    .eq('organization_id', demoOrgId)
    .eq('is_demo_base', true);

  await admin
    .from('events')
    .delete()
    .eq('organization_id', demoOrgId)
    .eq('is_demo_base', true);

  await admin
    .from('master_costs')
    .delete()
    .eq('organization_id', demoOrgId)
    .eq('is_demo_base', true);

  // 1. Seed 24 Master Costs (with Staff/HR & IVA Crédito/Débito metadata)
  const costsToInsert = DEMO_BASE_COSTS.map((c) => {
    const fin = calculateFinancials(
      c.costo,
      c.ganancia,
      c.tipo_doc_costo,
      c.aplicaIvaVenta,
      false
    );
    const tiempoDetalle = formatCostMetadata({
      resourceType: c.resourceType,
      staffCount: c.staffCount,
      staffHours: c.staffHours,
      staffModality: c.staffModality,
      aplicaIvaVenta: c.aplicaIvaVenta,
      cleanDetail: c.detail,
    });

    return {
      id: c.id,
      organization_id: demoOrgId,
      servicio: c.servicio,
      tiempo_detalle: tiempoDetalle,
      tipo_evento: c.tipo_evento,
      costo: c.costo,
      ganancia: c.ganancia,
      valor_neto: fin.valorNeto,
      valor_total: fin.valorTotal,
      tipo_doc_costo: c.tipo_doc_costo,
      is_demo_base: true,
    };
  });

  const { error: costErr } = await admin.from('master_costs').insert(costsToInsert);
  if (costErr) throw new Error(`Error al sembrar master_costs demo: ${costErr.message}`);

  // 2. Seed 6 Deeply Developed Events across Planning, Approved, and Completed
  const eventsToInsert = [
    {
      id: EVENT_GALA_ID,
      organization_id: demoOrgId,
      name: 'Gala Anual Corporativa & Premiación TechChile 2026',
      client_company: 'TechChile Holding S.A.',
      location: 'Hotel W Santiago — Salón Gran Ballroom',
      event_date: '2026-09-18',
      month: 9,
      year: 2026,
      description:
        'Cena de gala ejecutiva y ceremonia de premiación anual para 220 invitados.\nIncluye escenario central con pantalla LED 4x2.5m, refuerzo sonoro Line Array, banda en vivo, animación bilingüe, banquetería 3 tiempos, acreditación QR y cobertura audiovisual 4K.\nEvento ejecutado y cerrado con conciliación bancaria e IVA F29 completa.',
      status: 'completed' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_FONDA_ID,
      organization_id: demoOrgId,
      name: 'Festival Gastronómico & Fonda Corporativa Primavera 2026',
      client_company: 'Asociación Parque Empresarial Huechuraba',
      location: 'Centro de Eventos Parque Titanium',
      event_date: '2026-10-16',
      month: 10,
      year: 2026,
      description:
        'Evento masivo al aire libre con modalidad de Venta al por Menor (Bar y Gastronomía unitaria) para 450 asistentes.\nContiene productos consolidados con desglose de materias primas e insumos (empanadas, pipeño, helado de piña, coctelería de autor y bartenders), además de adicionales opcionales en Borrador de Costos y pagos reales en Finanzas.',
      status: 'approved' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: true,
      is_demo_base: true,
    },
    {
      id: EVENT_BODA_ID,
      organization_id: demoOrgId,
      name: 'Matrimonio Sofía & Tomás — Hacienda Santa Martina',
      client_company: 'Sofía Valdivieso & Tomás Errázuriz',
      location: 'Hacienda Santa Martina, Lo Barnechea',
      event_date: '2026-12-05',
      month: 12,
      year: 2026,
      description:
        'Matrimonio de 180 invitados en formato ceremonia al aire libre + cóctel en terraza + fiesta hasta las 04:00 AM.\nPosee servicios ya confirmados en Presupuesto Oficial, un Borrador de Costos activo con 6 partidas en evaluación (banquetería, barra, garzones, generador, flete, carpa) y abono inicial de reserva.',
      status: 'planning' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_CUMBRE_ID,
      organization_id: demoOrgId,
      name: 'Cumbre Minera & Networking Norte 2026',
      client_company: 'Minera Cordillera Ltda.',
      location: 'Hotel Enjoy Antofagasta — Salón Pacífico',
      event_date: '2026-07-24',
      month: 7,
      year: 2026,
      description:
        'Jornada de conferencias B2B y cóctel de cierre para 140 ejecutivos del sector minero.\nIncluye traductores simultáneos, sonido corporativo, cóctel de recepción, staff de acreditación y fotografía corporativa. Finalizado y conciliado para análisis histórico en Consolidación.',
      status: 'completed' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_LANZAMIENTO_ID,
      organization_id: demoOrgId,
      name: 'Lanzamiento Vehículo Eléctrico & Experience Lounge 2026',
      client_company: 'Automotora Austral Motors S.A.',
      location: 'Centro Cultural Estación Mapocho — Hall Central',
      event_date: '2026-11-27',
      month: 11,
      year: 2026,
      description:
        'Evento corporativo de lanzamiento de flota eléctrica con transmisión streaming multicámara, escenario techado Truss, equipo de producción en terreno, coffee break ejecutivo, anfitrionas bilingües y seguridad OS-10.\nCon ítems aprobados en producción, upgrades en Borrador de Costos y flujo de caja en curso.',
      status: 'approved' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
    {
      id: EVENT_SUNSET_ID,
      organization_id: demoOrgId,
      name: 'Sunset Corporativo & Fiesta Fin de Año FinTech 2026',
      client_company: 'Banco FinTech Chile SpA',
      location: 'Espacio Riesco — Terraza Panorámica',
      event_date: '2026-12-18',
      month: 12,
      year: 2026,
      description:
        'After-office y fiesta de cierre anual para 280 colaboradores con barra unitaria de coctelería y gastronomía al paso (Venta al por Menor).\nIdeal para probar en Borrador la consolidación Drag & Drop de bartenders + tragos, ajustar márgenes con el optimizador IA y simular el F29 en Finanzas.',
      status: 'planning' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: true,
      is_demo_base: true,
    },
  ];

  const { error: evErr } = await admin.from('events').insert(eventsToInsert);
  if (evErr) throw new Error(`Error al sembrar events demo: ${evErr.message}`);

  // 3. Seed Event Items across all 6 events (Official + Consolidados + Drafts + Transactions)
  // Event 1: Gala Anual Corporativa
  const galaParentId = 'd0000003-0000-4000-8000-000000000101';
  const galaItems = [
    buildItem({
      id: galaParentId,
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Producción Musical & Audiovisual Gala',
      detalle: 'Paquete integral escenario: Banda Live + Line Array + Iluminación LED',
      tipo_evento: 'Consolidado',
      cantidad: 1,
      costo: 1513000,
      ganancia: 740000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-09-01T10:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000102',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Banda Live Corporativa (6 músicos)',
      detalle: '2 bloques de 45 min + prueba de sonido 16:00 hrs (Boleta Honorarios)',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 680000,
      ganancia: 0,
      tipo_doc_costo: 'boleta',
      approved: true,
      parent_id: galaParentId,
      es_insumo: true,
      created_at: '2026-09-01T10:01:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000103',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Sonido Line Array (300 pax)',
      detalle: 'Consola digital 32ch + 4 monitores + microfonía inalámbrica Shure',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 357000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: galaParentId,
      es_insumo: true,
      created_at: '2026-09-01T10:02:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000104',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m',
      detalle: 'Pantalla P3.9 4x2.5m + 12 cabezas móviles Beam + operador',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 476000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: galaParentId,
      es_insumo: true,
      created_at: '2026-09-01T10:03:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000105',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Banquetería 3 Tiempos Premium',
      detalle: 'Menú ejecutivo 220 comensales + maridaje vinos reserva',
      tipo_evento: 'Empresa',
      cantidad: 220,
      costo: 33320,
      ganancia: 14000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-09-01T10:04:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000106',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Animador Bilingüe Corporativo',
      detalle: 'Maestro de ceremonias español/inglés para premiación',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 190000,
      ganancia: 110000,
      tipo_doc_costo: 'boleta',
      approved: true,
      iva_incluido: false,
      created_at: '2026-09-01T10:05:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000107',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Cobertura Fotográfica + Reel 4K',
      detalle: '2 fotógrafos + 1 filmmaker + edición aftermovie 90 seg',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 297500,
      ganancia: 150000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-09-01T10:06:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000108',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Staff Anfitrionas & Acreditación QR',
      detalle: '4 anfitrionas + tótems QR + credenciales impresas',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 220000,
      ganancia: 100000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-09-01T10:07:00Z',
    }),
    // Borrador histórico / opcionales en Gala
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000114',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Show Humorístico Stand-Up VIP (Opcional)',
      detalle: 'Alternativa evaluada en cotización inicial no incluida al cierre',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 650000,
      ganancia: 250000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-08-25T15:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000115',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      servicio: 'Cabina Foto 360° con Branding Impreso',
      detalle: 'Cotización backup para activación en foyer',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 238000,
      ganancia: 95000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-08-25T15:05:00Z',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000109',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      type: 'ABONO_CLIENTE',
      monto: 7500000,
      fecha: '2026-09-02',
      descripcion: 'Abono 50% Reserva Fecha — Transferencia TechChile S.A.',
      docType: 'transferencia',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000110',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      type: 'ABONO_CLIENTE',
      monto: 6692050,
      fecha: '2026-09-17',
      descripcion: 'Pago Saldo Final 50% — Transferencia Empresa',
      docType: 'transferencia',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000111',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      type: 'GASTO_REAL',
      monto: 7330400,
      fecha: '2026-09-14',
      descripcion: 'Factura Banquetería Gourmet Chile (220 pax)',
      docType: 'factura',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000112',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      type: 'GASTO_REAL',
      monto: 1090000,
      fecha: '2026-09-18',
      descripcion: 'Pago Honorarios Banda Live + Animador + Staff Acreditación',
      docType: 'boleta',
      servicioOverride: 'Boleta de Honorarios (Personal)',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000113',
      organization_id: demoOrgId,
      event_id: EVENT_GALA_ID,
      type: 'GASTO_REAL',
      monto: 1130500,
      fecha: '2026-09-19',
      descripcion: 'Facturas Técnica Audiovisual, Pantalla LED y Fotografía 4K',
      docType: 'factura',
    }),
  ];

  // Event 2: Fonda & Retail (Approved, has_retail_sales = true)
  const fondaComboParentId = 'd0000003-0000-4000-8000-000000000201';
  const fondaBarParentId = 'd0000003-0000-4000-8000-000000000207';
  const fondaItems = [
    buildItem({
      id: fondaComboParentId,
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Combo Terremoto & Empanada (Venta Unitaria)',
      detalle: '400 combos unitarios (Costo unitario prorrateado desde insumos)',
      tipo_evento: 'Consolidado',
      cantidad: 400,
      costo: 3400,
      ganancia: 3100,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-10-01T11:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000202',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Vino Pipeño Artesanal (120 Litros)',
      detalle: '24 bidones de 5L — Distribuidora Valle Central',
      tipo_evento: 'Insumo',
      cantidad: 1,
      costo: 280000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: fondaComboParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:01:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000203',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Helado de Piña Industrial (60 Litros)',
      detalle: '12 casatas de 5L en conservadoras térmicas',
      tipo_evento: 'Insumo',
      cantidad: 1,
      costo: 180000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: fondaComboParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:02:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000204',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Empanadas de Pino Horno (400 unidades)',
      detalle: 'Elaboración artesanal sin pasas, entrega caliente en cajas',
      tipo_evento: 'Insumo',
      cantidad: 400,
      costo: 1900,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: fondaComboParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:03:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000205',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Granadina, Bombillas & Vasos 500ml',
      detalle: 'Pack 450 vasos ecológicos + 6 botellas granadina',
      tipo_evento: 'Insumo',
      cantidad: 1,
      costo: 95000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: fondaComboParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:04:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000206',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Servilletas, Bandejas & Bolsas Basura',
      detalle: 'Material desechable operativo de fonda',
      tipo_evento: 'Insumo',
      cantidad: 1,
      costo: 45000,
      ganancia: 0,
      tipo_doc_costo: 'boleta',
      approved: true,
      parent_id: fondaComboParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:05:00Z',
    }),
    buildItem({
      id: fondaBarParentId,
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Barra Coctelería de Autor (Tragos Unitarios)',
      detalle: '350 tragos preparados al momento (Piscola, Gin Tonic, Mojito)',
      tipo_evento: 'Consolidado',
      cantidad: 350,
      costo: 2500,
      ganancia: 2800,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-10-01T11:10:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000208',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Destilados Pisco, Gin & Ron Mayorista',
      detalle: '28 botellas mix barra premium',
      tipo_evento: 'Insumo',
      cantidad: 1,
      costo: 490000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: fondaBarParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:11:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000209',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Hielo en Cubos 180kg, Limones, Menta & Bebidas',
      detalle: 'Reposición continua en coolers durante 6 horas',
      tipo_evento: 'Insumo',
      cantidad: 1,
      costo: 175000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: fondaBarParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:12:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000210',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Equipo 3 Bartenders Profesionales',
      detalle: 'Turno 7 horas montaje + servicio + cierre (Boleta Honorarios)',
      tipo_evento: 'Insumo',
      cantidad: 3,
      costo: 70000,
      ganancia: 0,
      tipo_doc_costo: 'boleta',
      approved: true,
      parent_id: fondaBarParentId,
      es_insumo: true,
      created_at: '2026-10-01T11:13:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000211',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Sonido Line Array (300 pax)',
      detalle: 'Amplificación exterior + DJ música chilena y bailable',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 357000,
      ganancia: 180000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-10-01T11:14:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000212',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Guardias Seguridad OS-10 & Baños Químicos VIP',
      detalle: '4 guardias acreditados + 2 módulos químicos con lavado',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 420000,
      ganancia: 150000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-10-01T11:15:00Z',
    }),
    // Draft items en Fonda (Adicionales en evaluación)
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000215',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Sistema Pulseras Cashless & 4 Cajas POS',
      detalle: 'Upgrade en evaluación para acelerar venta en barras',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 320000,
      ganancia: 130000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-10-03T10:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000216',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      servicio: 'Cuadrilla Aseo Continuo Turno Completo (4 pers.)',
      detalle: 'Mantención baños, mesas y retiro de residuos cada 30m',
      tipo_evento: 'Personal',
      cantidad: 4,
      costo: 45000,
      ganancia: 18000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-10-03T10:05:00Z',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000213',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      type: 'ABONO_CLIENTE',
      monto: 2800000,
      fecha: '2026-10-05',
      descripcion: 'Anticipo 50% Reserva — Asociación Parque Empresarial',
      docType: 'transferencia',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000214',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      type: 'GASTO_REAL',
      monto: 950000,
      fecha: '2026-10-12',
      descripcion: 'Compra Anticipada Destilados, Pipeño e Insumos Mayoristas',
      docType: 'factura',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000217',
      organization_id: demoOrgId,
      event_id: EVENT_FONDA_ID,
      type: 'GASTO_REAL',
      monto: 210000,
      fecha: '2026-10-15',
      descripcion: 'Anticipo Honorarios Equipo 3 Bartenders Turno Fonda',
      docType: 'boleta',
      servicioOverride: 'Boleta de Honorarios (Personal)',
    }),
  ];

  // Event 3: Matrimonio Sofía & Tomás (Planning - Approved + Rich Drafts + Finances)
  const bodaItems = [
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000301',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Cuarteto de Cuerdas Gala',
      detalle: 'Ceremonia religiosa en capilla + 1 hora cóctel jardín',
      tipo_evento: 'Matrimonio',
      cantidad: 1,
      costo: 260000,
      ganancia: 160000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-11-01T09:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000302',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'DJ & VJ Profesional con Consola',
      detalle: 'Fiesta 5 horas + iluminación pista de baile',
      tipo_evento: 'Matrimonio',
      cantidad: 1,
      costo: 210000,
      ganancia: 140000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-11-01T09:05:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000303',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Cobertura Fotográfica + Reel 4K',
      detalle: 'Full Day desde preparación de novios hasta fin de fiesta',
      tipo_evento: 'Matrimonio',
      cantidad: 1,
      costo: 350000,
      ganancia: 210000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-11-01T09:10:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000304',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Banquetería 3 Tiempos Premium',
      detalle: '180 invitados adultos (incluye prueba de menú)',
      tipo_evento: 'Matrimonio',
      cantidad: 180,
      costo: 33320,
      ganancia: 12000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-02T10:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000305',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Barra Libre Coctelería de Autor',
      detalle: '180 invitados — Pisco Sour Catedral, Aperol, Ramazzotti',
      tipo_evento: 'Matrimonio',
      cantidad: 180,
      costo: 11900,
      ganancia: 5200,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-02T10:01:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000306',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Mobiliario Lounge VIP LED',
      detalle: '4 sets terraza exterior + guirnaldas de ampolletas vintage',
      tipo_evento: 'Matrimonio',
      cantidad: 1,
      costo: 285600,
      ganancia: 120000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-02T10:02:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000307',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Generador Eléctrico Silencioso 40 kVA',
      detalle: 'Respaldo eléctrico hacienda + 40 litros petróleo',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 214200,
      ganancia: 75000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-02T10:03:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000308',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Brigada de Garzones Banquetearía (9 pers.)',
      detalle: '1 garzón cada 20 invitados — Turno 9 horas completo',
      tipo_evento: 'Personal',
      cantidad: 1,
      costo: 495000,
      ganancia: 185000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-11-02T10:04:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000310',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      servicio: 'Carpa Cristal 10x20m Iluminada',
      detalle: 'Techo transparente con piso entablado y cielo guirnaldas',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 1071000,
      ganancia: 420000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-02T10:05:00Z',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000309',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      type: 'ABONO_CLIENTE',
      monto: 1200000,
      fecha: '2026-11-05',
      descripcion: 'Reserva inicial música y fotografía — Novios',
      docType: 'transferencia',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000311',
      organization_id: demoOrgId,
      event_id: EVENT_BODA_ID,
      type: 'GASTO_REAL',
      monto: 260000,
      fecha: '2026-11-06',
      descripcion: 'Seña Bloqueo Fecha Cuarteto de Cuerdas (Honorarios)',
      docType: 'boleta',
      servicioOverride: 'Boleta de Honorarios (Personal)',
    }),
  ];

  // Event 4: Cumbre Minera Norte (Completed)
  const cumbreItems = [
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000401',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Sonido Line Array (300 pax)',
      detalle: 'Audio salón plenario + 6 micrófonos cuello de ganso',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 357000,
      ganancia: 195000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-07-10T10:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000402',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Cóctel Recepción 6 Bocados',
      detalle: 'Cóctel networking cierre para 140 ejecutivos',
      tipo_evento: 'Empresa',
      cantidad: 140,
      costo: 14280,
      ganancia: 6500,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-07-10T10:01:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000403',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Staff Anfitrionas & Acreditación QR',
      detalle: '4 anfitrionas + registro digital invitados VIP',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 220000,
      ganancia: 105000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-07-10T10:02:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000404',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Cobertura Fotográfica + Reel 4K',
      detalle: 'Registro keynote speakers + galería prensa',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 297500,
      ganancia: 155000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-07-10T10:03:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000407',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      servicio: 'Traductores Simultáneos + Cabina (Opción Backup)',
      detalle: 'Ítem dejado en borrador por uso de audio nativo en plenario',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 450000,
      ganancia: 190000,
      tipo_doc_costo: 'boleta',
      approved: false,
      iva_incluido: false,
      created_at: '2026-07-08T12:00:00Z',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000405',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      type: 'ABONO_CLIENTE',
      monto: 4460000,
      fecha: '2026-07-23',
      descripcion: 'Pago Orden de Compra OC-88412 Minera Cordillera',
      docType: 'transferencia',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000406',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      type: 'GASTO_REAL',
      monto: 2653700,
      fecha: '2026-07-25',
      descripcion: 'Facturas Técnica Audio, Cóctel y Registro Fotográfico Norte',
      docType: 'factura',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000408',
      organization_id: demoOrgId,
      event_id: EVENT_CUMBRE_ID,
      type: 'GASTO_REAL',
      monto: 220000,
      fecha: '2026-07-25',
      descripcion: 'Pago Honorarios Staff Anfitrionas Antofagasta',
      docType: 'boleta',
      servicioOverride: 'Boleta de Honorarios (Personal)',
    }),
  ];

  // Event 5: Lanzamiento Vehículo Eléctrico (Approved)
  const launchParentId = 'd0000003-0000-4000-8000-000000000501';
  const launchItems = [
    buildItem({
      id: launchParentId,
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Experiencia Reveal Central Escenario & Streaming',
      detalle: 'Paquete consolidado: Tarima Truss + Pantalla LED + Streaming + Ingeniería',
      tipo_evento: 'Consolidado',
      cantidad: 1,
      costo: 1965500,
      ganancia: 920000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-11-08T10:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000502',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Escenario Modular 8x4m + Techado Truss',
      detalle: 'Plataforma exhibición automóvil eléctrico + rampa acceso',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 654500,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: launchParentId,
      es_insumo: true,
      created_at: '2026-11-08T10:01:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000503',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Iluminación Robótica & Pantalla LED 4x2.5m',
      detalle: 'Show reveal sincronizado con iluminación puntual sobre vehículo',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 476000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: launchParentId,
      es_insumo: true,
      created_at: '2026-11-08T10:02:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000504',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Streaming Multicámara Full HD',
      detalle: 'Transmisión prensa nacional y concesionarios regionales',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 595000,
      ganancia: 0,
      tipo_doc_costo: 'factura',
      approved: true,
      parent_id: launchParentId,
      es_insumo: true,
      created_at: '2026-11-08T10:03:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000505',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Ingeniero en Sonido FOH + Operador Consola',
      detalle: 'Equipo 2 especialistas técnicos (Boleta Honorarios)',
      tipo_evento: 'Personal',
      cantidad: 1,
      costo: 240000,
      ganancia: 0,
      tipo_doc_costo: 'boleta',
      approved: true,
      parent_id: launchParentId,
      es_insumo: true,
      created_at: '2026-11-08T10:04:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000506',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Coffee Break Ejecutivo Continuo (160 pax)',
      detalle: 'Recepción prensa e invitados VIP Estación Mapocho',
      tipo_evento: 'Empresa',
      cantidad: 160,
      costo: 9520,
      ganancia: 4500,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-11-08T10:05:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000507',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Productor General en Terreno + Stage Manager',
      detalle: 'Dirección técnica y coordinación guion keynote (2 personas)',
      tipo_evento: 'Personal',
      cantidad: 1,
      costo: 320000,
      ganancia: 160000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-11-08T10:06:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000508',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Guardias Seguridad Acreditados OS-10 (4 pers.)',
      detalle: 'Resguardo nocturno vehículo exhibido + jornada evento',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 285600,
      ganancia: 115000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-11-08T10:07:00Z',
    }),
    // Draft items en Lanzamiento (upgrades cliente)
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000509',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Tótems Interactivos Touch 55" Cotizador Financiación',
      detalle: '3 tótems para zona de test-drive en negociación adicional',
      tipo_evento: 'Empresa',
      cantidad: 3,
      costo: 178500,
      ganancia: 75000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-10T14:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000510',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      servicio: 'Staff Promotoras Bilingües Test-Drive (4 pers.)',
      detalle: 'Registro licencias de conducir para pruebas dinámicas',
      tipo_evento: 'Personal',
      cantidad: 1,
      costo: 220000,
      ganancia: 100000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-11-10T14:05:00Z',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000511',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      type: 'ABONO_CLIENTE',
      monto: 4200000,
      fecha: '2026-11-09',
      descripcion: 'Primer Pago OC-4590 Automotora Austral Motors',
      docType: 'transferencia',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000512',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      type: 'GASTO_REAL',
      monto: 1725500,
      fecha: '2026-11-11',
      descripcion: 'Facturas Señalización Escenario Truss, Pantalla LED y Seguridad',
      docType: 'factura',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000513',
      organization_id: demoOrgId,
      event_id: EVENT_LANZAMIENTO_ID,
      type: 'GASTO_REAL',
      monto: 240000,
      fecha: '2026-11-12',
      descripcion: 'Adelanto Boleta Honorarios Ingeniero Sonido & Operador',
      docType: 'boleta',
      servicioOverride: 'Boleta de Honorarios (Personal)',
    }),
  ];

  // Event 6: Sunset Corporativo & Fiesta Fin de Año (Planning + Retail + Rich Drafts)
  const sunsetItems = [
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000601',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'DJ & VJ Profesional con Consola',
      detalle: 'Set sunset electrónica suave + fiesta bailable cierre',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 210000,
      ganancia: 140000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-11-11T09:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000602',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'Sonido Line Array (300 pax)',
      detalle: 'Cobertura acústica terraza exterior + microfonía premiación',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 357000,
      ganancia: 180000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-11-11T09:05:00Z',
    }),
    // Rich Draft items ready to inspect, edit margins, or consolidate!
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000603',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'Barra Libre Coctelería de Autor (280 pax)',
      detalle: 'Aperol Spritz, Mojito Berries, Pisco Sour y sin alcohol',
      tipo_evento: 'Empresa',
      cantidad: 280,
      costo: 11900,
      ganancia: 5500,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-12T10:00:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000604',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'Equipo Bartenders Coctelería (4 pers.)',
      detalle: 'Staff especializado en coctelería rápida de alto volumen',
      tipo_evento: 'Personal',
      cantidad: 4,
      costo: 75000,
      ganancia: 32000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-11-12T10:01:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000605',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'Estaciones Gastronómicas Smash Burger & Tacos',
      detalle: '500 porciones en formato food-truck gourmet en terraza',
      tipo_evento: 'Insumo',
      cantidad: 500,
      costo: 4200,
      ganancia: 2400,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-12T10:02:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000606',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'Mobiliario Lounge VIP LED',
      detalle: '4 sets terraza + mesas altas cóctel con iluminación',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 285600,
      ganancia: 130000,
      tipo_doc_costo: 'factura',
      approved: false,
      created_at: '2026-11-12T10:03:00Z',
    }),
    buildItem({
      id: 'd0000003-0000-4000-8000-000000000607',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      servicio: 'Flete Camión Cerrado + Cuadrilla Carga',
      detalle: 'Despacho y retiro madrugada en Espacio Riesco',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 115000,
      ganancia: 45000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-11-12T10:04:00Z',
    }),
    buildTransaction({
      id: 'd0000003-0000-4000-8000-000000000608',
      organization_id: demoOrgId,
      event_id: EVENT_SUNSET_ID,
      type: 'ABONO_CLIENTE',
      monto: 950000,
      fecha: '2026-11-12',
      descripcion: 'Anticipo Bloqueo Fecha Terraza & DJ — FinTech Chile SpA',
      docType: 'transferencia',
    }),
  ];

  // Insert top-level items first, then child insumos
  const allItems = [
    ...galaItems,
    ...fondaItems,
    ...bodaItems,
    ...cumbreItems,
    ...launchItems,
    ...sunsetItems,
  ];
  const topLevelItems = allItems.filter((i) => !i.parent_id);
  const childItems = allItems.filter((i) => !!i.parent_id);

  const { error: topErr } = await admin.from('event_items').insert(topLevelItems);
  if (topErr) throw new Error(`Error al sembrar top-level event_items demo: ${topErr.message}`);

  if (childItems.length > 0) {
    const { error: childErr } = await admin.from('event_items').insert(childItems);
    if (childErr) throw new Error(`Error al sembrar child event_items demo: ${childErr.message}`);
  }
}

/**
 * Resets ONLY user-created items (is_demo_base = false) in the Demo organization,
 * and restores all canonical base examples (is_demo_base = true) to their pristine state.
 */
export async function resetDemoSession(admin: AdminSupabase) {
  const { demoOrg, demoUserId } = await ensureDemoEnvironment(admin);

  await admin
    .from('event_items')
    .delete()
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', false);

  await admin
    .from('events')
    .delete()
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', false);

  await admin
    .from('master_costs')
    .delete()
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', false);

  await seedCanonicalDemoData(admin, demoOrg.id, demoUserId);

  return getDemoQuotaStats(admin, demoOrg.id);
}

/**
 * Automatically prunes user-created demo records older than DEMO_RETENTION_HOURS
 * so the demo account never accumulates stale data over time.
 */
export async function cleanupStaleDemoData(admin: AdminSupabase) {
  const { data: demoOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', DEMO_ORG_SLUG)
    .maybeSingle();

  if (!demoOrg) return { cleaned: false };

  const cutoff = new Date(Date.now() - DEMO_RETENTION_HOURS * 60 * 60 * 1000).toISOString();

  await admin
    .from('event_items')
    .delete()
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', false)
    .lt('created_at', cutoff);

  await admin
    .from('events')
    .delete()
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', false)
    .lt('created_at', cutoff);

  await admin
    .from('master_costs')
    .delete()
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', false)
    .lt('created_at', cutoff);

  return { cleaned: true };
}

/**
 * Returns lightweight usage stats for the Demo Sandbox banner.
 */
export async function getDemoQuotaStats(admin: AdminSupabase, demoOrgId: string) {
  const [eventsRes, costsRes, itemsRes] = await Promise.all([
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', demoOrgId)
      .eq('is_demo_base', false),
    admin
      .from('master_costs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', demoOrgId)
      .eq('is_demo_base', false),
    admin
      .from('event_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', demoOrgId)
      .eq('is_demo_base', false),
  ]);

  return {
    userEventsCount: eventsRes.count || 0,
    maxEvents: DEMO_MAX_EVENTS,
    userCostsCount: costsRes.count || 0,
    maxCosts: DEMO_MAX_COSTS,
    userItemsCount: itemsRes.count || 0,
    maxItems: DEMO_MAX_ITEMS,
  };
}
