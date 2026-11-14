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

type AdminSupabase = SupabaseClient<Database>;

const DEMO_BASE_COSTS = [
  {
    id: 'd0000001-0000-4000-8000-000000000001',
    servicio: 'Cuarteto de Cuerdas Gala',
    tiempo_detalle: '90 minutos (Ceremonia y Cóctel)',
    tipo_evento: 'Matrimonio',
    costo: 260000,
    ganancia: 160000,
    tipo_doc_costo: 'boleta' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000002',
    servicio: 'Banda Live Corporativa (6 músicos)',
    tiempo_detalle: '2 bloques de 45 min + sonido de sala',
    tipo_evento: 'Empresa',
    costo: 680000,
    ganancia: 320000,
    tipo_doc_costo: 'boleta' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000003',
    servicio: 'DJ & VJ Profesional',
    tiempo_detalle: '5 horas continuas + consola Pioneer',
    tipo_evento: 'Privado',
    costo: 210000,
    ganancia: 140000,
    tipo_doc_costo: 'boleta' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000004',
    servicio: 'Sonido Line Array (300 pax)',
    tiempo_detalle: 'Jornada completa + ingeniero en sala',
    tipo_evento: 'Empresa',
    costo: 357000,
    ganancia: 180000,
    tipo_doc_costo: 'factura' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000005',
    servicio: 'Iluminación Robótica & Pantalla LED',
    tiempo_detalle: '12 cabezas móviles + pantalla 4x2.5m',
    tipo_evento: 'Empresa',
    costo: 476000,
    ganancia: 240000,
    tipo_doc_costo: 'factura' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000006',
    servicio: 'Banquetería 3 Tiempos Premium',
    tiempo_detalle: 'Entrada, fondo, postre + garzones (por persona)',
    tipo_evento: 'Empresa',
    costo: 33320,
    ganancia: 14000,
    tipo_doc_costo: 'factura' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000007',
    servicio: 'Cóctel Recepción 6 Bocados',
    tiempo_detalle: 'Por persona incluye espumante y jugos',
    tipo_evento: 'Privado',
    costo: 14280,
    ganancia: 6500,
    tipo_doc_costo: 'factura' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000008',
    servicio: 'Barra Libre Coctelería de Autor',
    tiempo_detalle: '4 horas (por invitado, incluye bartenders)',
    tipo_evento: 'Matrimonio',
    costo: 11900,
    ganancia: 5500,
    tipo_doc_costo: 'factura' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000009',
    servicio: 'Cobertura Fotográfica + Reel 4K',
    tiempo_detalle: 'Jornada 8 hrs + entrega en 72 hrs',
    tipo_evento: 'Empresa',
    costo: 297500,
    ganancia: 150000,
    tipo_doc_costo: 'factura' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000010',
    servicio: 'Animador Bilingüe Corporativo',
    tiempo_detalle: 'Conducción ceremonia y premiación (4 hrs)',
    tipo_evento: 'Empresa',
    costo: 190000,
    ganancia: 110000,
    tipo_doc_costo: 'boleta' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000011',
    servicio: 'Staff Anfitrionas & Acreditación',
    tiempo_detalle: 'Equipo 4 anfitrionas + tablets QR',
    tipo_evento: 'Empresa',
    costo: 220000,
    ganancia: 100000,
    tipo_doc_costo: 'boleta' as const,
  },
  {
    id: 'd0000001-0000-4000-8000-000000000012',
    servicio: 'Mobiliario Lounge VIP',
    tiempo_detalle: '4 sets sillones + mesas apoyo LED',
    tipo_evento: 'Privado',
    costo: 285600,
    ganancia: 130000,
    tipo_doc_costo: 'factura' as const,
  },
];

// Deterministic IDs for the 4 deeply-developed base events
const EVENT_GALA_ID = 'd0000002-0000-4000-8000-000000000001';
const EVENT_FONDA_ID = 'd0000002-0000-4000-8000-000000000002';
const EVENT_BODA_ID = 'd0000002-0000-4000-8000-000000000003';
const EVENT_CUMBRE_ID = 'd0000002-0000-4000-8000-000000000004';

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
  created_at?: string;
}) {
  const isGasto = params.type === 'GASTO_REAL';
  const isFacturaDoc = isGasto && params.docType === 'factura';
  return {
    id: params.id,
    organization_id: params.organization_id,
    event_id: params.event_id,
    servicio: isGasto
      ? isFacturaDoc
        ? 'Factura de Proveedor'
        : 'Boleta de Proveedor'
      : 'Abono de Cliente',
    detalle: `${params.fecha} | ${params.descripcion}`,
    tipo_evento: params.type,
    cantidad: 1,
    costo: isGasto ? params.monto : 0,
    ganancia: isGasto ? 0 : params.monto,
    valor_neto: isFacturaDoc ? Math.round(params.monto / 1.19) : params.monto,
    iva: isFacturaDoc ? Math.round(params.monto - params.monto / 1.19) : 0,
    valor_total: params.monto,
    margen: isGasto ? 0 : 100,
    tipo_doc_costo: (params.docType === 'boleta' ? 'boleta' : 'factura') as 'factura' | 'boleta',
    approved: true,
    parent_id: null,
    es_insumo: false,
    iva_incluido: true,
    is_demo_base: true,
    created_at: params.created_at || (params.fecha ? `${params.fecha}T12:00:00Z` : new Date().toISOString()),
  };
}

/**
 * Ensures the Demo Organization and Demo User exist, and seeds base data if empty.
 */
export async function ensureDemoEnvironment(admin: AdminSupabase) {
  // 1. Fetch or create Demo Organization
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

  // 2. Fetch or create Demo Auth User
  let demoUserId: string | null = null;
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', DEMO_USER_EMAIL)
    .maybeSingle();

  if (existingProfile?.id) {
    demoUserId = existingProfile.id;
  } else {
    // Check auth users list just in case profile was removed
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

  // Ensure demo profile is active admin ONLY within demoOrg (never super_admin)
  await admin.from('profiles').upsert({
    id: demoUserId,
    email: DEMO_USER_EMAIL,
    role: 'admin',
    status: 'active',
    organization_id: demoOrg.id,
    is_super_admin: false,
    full_name: 'Usuario Invitado (Prueba)',
  });

  // 3. Check if base demo events already exist; if missing, seed them
  const { count: baseEventsCount } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', demoOrg.id)
    .eq('is_demo_base', true);

  if (!baseEventsCount || baseEventsCount === 0) {
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
  // Clean existing base records first so restore is 100% deterministic
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

  // 1. Seed 12 Master Costs
  const costsToInsert = DEMO_BASE_COSTS.map((c) => {
    const fin = calculateFinancials(c.costo, c.ganancia, c.tipo_doc_costo, true, false);
    return {
      id: c.id,
      organization_id: demoOrgId,
      servicio: c.servicio,
      tiempo_detalle: c.tiempo_detalle,
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

  // 2. Seed 4 Deeply Developed Events
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
        'Cena de gala ejecutiva y ceremonia de premiación anual para 220 invitados.\nIncluye escenario central con pantalla LED 4x2.5m, refuerzo sonoro Line Array, banda en vivo, animación bilingüe, banquetería 3 tiempos, acreditación QR y cobertura audiovisual 4K.\nEvento ejecutado y cerrado con conciliación bancaria completa.',
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
        'Evento masivo al aire libre con modalidad de Venta al por Menor (Bar y Gastronomía unitaria) para 450 asistentes.\nContiene productos consolidados con desglose de materias primas e insumos (empanadas, pipeño, helado de piña, coctelería de autor), cálculo automático de costo por porción y flujo de caja en curso.',
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
        'Matrimonio de 180 invitados en formato ceremonia al aire libre + cóctel en terraza + fiesta hasta las 04:00 AM.\nPosee servicios ya confirmados en Presupuesto Oficial y un Borrador de Costos activo para probar edición de márgenes, consolidación Drag & Drop y Asistente IA.',
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
        'Jornada de conferencias B2B y cóctel de cierre para 140 ejecutivos del sector minero.\nIncluye traducción simultánea, sonido corporativo, cóctel de recepción, staff de acreditación y fotografía corporativa. Finalizado y conciliado para análisis histórico en Consolidación.',
      status: 'completed' as const,
      created_by: demoUserId,
      deleted_at: null,
      has_retail_sales: false,
      is_demo_base: true,
    },
  ];

  const { error: evErr } = await admin.from('events').insert(eventsToInsert);
  if (evErr) throw new Error(`Error al sembrar events demo: ${evErr.message}`);

  // 3. Seed Event Items (Parents, Child Insumos, Standalone Official, Drafts, Transactions)
  // Event 1: Gala Corporativa (Completed)
  const galaParentId = 'd0000003-0000-4000-8000-000000000101';
  // Child items sum cost: 680000 + 357000 + 476000 = 1,513,000
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
      detalle: '2 bloques de 45 min + prueba de sonido 16:00 hrs',
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
      servicio: 'Iluminación Robótica & Pantalla LED',
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
      servicio: 'Staff Anfitrionas & Acreditación',
      detalle: '4 anfitrionas + tótems QR + credenciales impresas',
      tipo_evento: 'Empresa',
      cantidad: 1,
      costo: 220000,
      ganancia: 100000,
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-09-01T10:07:00Z',
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
  // Combo Terremoto & Empanada (400 unidades):
  // Child insumos: Pipeño 120L ($280,000) + Helado Piña ($180,000) + Granadina & Vasos ($95,000) + Empanadas x400 ($760,000) + Servilletas/Bandejas ($45,000) = $1,360,000 total => $3,400 costo unitario!
  // Barra Coctelería (350 tragos):
  // Pisco/Gin Premium ($490,000) + Limones/Hielo/Mixers ($175,000) + 3 Bartenders ($210,000) = $875,000 total => $2,500 costo unitario!
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
      detalle: 'Turno 7 horas montaje + servicio + cierre',
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
      servicio: 'Seguridad OS-10 & Baños Químicos VIP',
      detalle: '4 guardias acreditados + 2 módulos químicos con lavado',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 420000,
      ganancia: 150000,
      tipo_doc_costo: 'factura',
      approved: true,
      created_at: '2026-10-01T11:15:00Z',
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
  ];

  // Event 3: Matrimonio Sofía & Tomás (Planning - Mix of Approved + Rich Drafts!)
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
      servicio: 'DJ & VJ Profesional',
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
      tipo_doc_costo: 'boleta',
      approved: true,
      created_at: '2026-11-01T09:10:00Z',
    }),
    // Draft items (approved = false) ready for testing in Borrador de Costos!
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
      servicio: 'Mobiliario Lounge VIP',
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
      servicio: 'Flete & Traslado Equipos Lo Barnechea',
      detalle: 'Camión 3/4 ida y vuelta + peonetas carga/descarga',
      tipo_evento: 'Logística',
      cantidad: 1,
      costo: 95000,
      ganancia: 35000,
      tipo_doc_costo: 'boleta',
      approved: false,
      created_at: '2026-11-02T10:04:00Z',
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
  ];

  // Event 4: Cumbre Minera (Completed in July 2026)
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
      servicio: 'Staff Anfitrionas & Acreditación',
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
      descripcion: 'Liquidación proveedores técnicos y banquetería Norte',
      docType: 'factura',
    }),
  ];

  // Insert parents first, then children/others so foreign key parent_id is always satisfied
  const allItems = [...galaItems, ...fondaItems, ...bodaItems, ...cumbreItems];
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

  // 1. Delete ALL user-created items, events, and master_costs in the Demo org
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

  // 2. Restore canonical base examples in case any base record was edited or trashed
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
