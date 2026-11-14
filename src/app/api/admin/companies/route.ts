import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { SUPER_ADMIN_EMAIL, DUO_ORG_SLUG } from '@/lib/constants';
import { calculateFinancials } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BankInfoSchema = z.object({
  banco: z.string().trim().max(100).optional(),
  tipo_cuenta: z.string().trim().max(100).optional(),
  numero_cuenta: z.string().trim().max(100).optional(),
  titular: z.string().trim().max(150).optional(),
  rut: z.string().trim().max(40).optional(),
  email: z.string().trim().max(150).optional(),
});

const CreateCompanySchema = z.object({
  name: z.string().trim().min(2, 'El nombre de la empresa es obligatorio').max(100),
  legal_name: z.string().trim().max(150).optional().nullable(),
  rut: z.string().trim().max(30).optional().nullable(),
  subtitle: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  contact_email: z.string().trim().email('Email de contacto inválido').optional().or(z.literal('')).nullable(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  logo_url: z.string().trim().max(500000).optional().nullable(),
  bank_info: BankInfoSchema.optional(),
  invite_code: z.string().trim().min(4).max(32).optional(),
  seedStarterCatalog: z.boolean().optional().default(true),
  adminEmail: z.string().trim().email('Email del administrador inválido').optional().or(z.literal('')),
  adminPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
});

const UpdateCompanySchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  legal_name: z.string().trim().max(150).optional().nullable(),
  rut: z.string().trim().max(30).optional().nullable(),
  subtitle: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  contact_email: z.string().trim().optional().nullable(),
  contact_phone: z.string().trim().optional().nullable(),
  logo_url: z.string().trim().max(500000).optional().nullable(),
  bank_info: BankInfoSchema.optional(),
  invite_code: z.string().trim().min(4).max(32).optional(),
});

function isAuthorizedSuperAdmin(ctx: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (!ctx || !ctx.profile || ctx.profile.status !== 'active') return false;
  return Boolean(ctx.profile.is_super_admin) || ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48);
}

function generateInviteCode(name: string) {
  const prefix = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'EMP';
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

const STARTER_COSTS = [
  { servicio: 'Producción General Evento', tiempo_detalle: 'Jornada base', tipo_evento: 'Empresa', costo: 150000, ganancia: 65000, tipo_doc_costo: 'factura' as const },
  { servicio: 'Amplificación e Iluminación Base', tiempo_detalle: 'Hasta 150 personas', tipo_evento: 'Privado', costo: 120000, ganancia: 55000, tipo_doc_costo: 'factura' as const },
  { servicio: 'Servicio Gastronómico / Banquete', tiempo_detalle: 'Por persona (base)', tipo_evento: 'Empresa', costo: 28000, ganancia: 12000, tipo_doc_costo: 'factura' as const },
  { servicio: 'Staff Operativo / Anfitriones', tiempo_detalle: 'Por turno 6 hrs', tipo_evento: 'Empresa', costo: 60000, ganancia: 25000, tipo_doc_costo: 'boleta' as const },
  { servicio: 'Fotografía & Registro Audiovisual', tiempo_detalle: 'Cobertura evento', tipo_evento: 'Privado', costo: 180000, ganancia: 80000, tipo_doc_costo: 'boleta' as const },
];

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!isAuthorizedSuperAdmin(ctx)) {
      return NextResponse.json({ error: 'Acceso restringido al administrador principal.' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: orgs, error } = await admin
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Attach lightweight counts per org
    const enriched = await Promise.all(
      (orgs || []).map(async (org) => {
        const [usersRes, eventsRes] = await Promise.all([
          admin.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
          admin.from('events').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
        ]);
        return {
          ...org,
          users_count: usersRes.count || 0,
          events_count: eventsRes.count || 0,
        };
      })
    );

    return NextResponse.json({ companies: enriched });
  } catch (err: any) {
    console.error('Error GET /api/admin/companies:', err);
    return NextResponse.json({ error: err.message || 'Error al obtener empresas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!isAuthorizedSuperAdmin(ctx)) {
      return NextResponse.json({ error: 'Acceso restringido al administrador principal.' }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = CreateCompanySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (data.adminEmail && !data.adminPassword) {
      return NextResponse.json(
        { error: 'Debes indicar una contraseña inicial para el administrador de la empresa.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const baseSlug = slugify(data.name) || 'empresa';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = (data.invite_code || generateInviteCode(data.name)).toUpperCase();

    const { data: newOrg, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: data.name,
        slug: uniqueSlug,
        invite_code: inviteCode,
        legal_name: data.legal_name || data.name,
        rut: data.rut || null,
        subtitle: data.subtitle || 'GESTIÓN INTEGRAL DE EVENTOS & PRESUPUESTOS',
        location: data.location || 'Chile',
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        logo_url: data.logo_url || null,
        bank_info: data.bank_info || {},
        is_demo: false,
        is_active: true,
      })
      .select()
      .single();

    if (orgErr || !newOrg) {
      throw new Error(orgErr?.message || 'No se pudo crear la empresa.');
    }

    if (data.seedStarterCatalog) {
      const starterRows = STARTER_COSTS.map((c) => {
        const fin = calculateFinancials(c.costo, c.ganancia, c.tipo_doc_costo, true, false);
        return {
          organization_id: newOrg.id,
          servicio: c.servicio,
          tiempo_detalle: c.tiempo_detalle,
          tipo_evento: c.tipo_evento,
          costo: c.costo,
          ganancia: c.ganancia,
          valor_neto: fin.valorNeto,
          valor_total: fin.valorTotal,
          tipo_doc_costo: c.tipo_doc_costo,
          is_demo_base: false,
        };
      });
      await admin.from('master_costs').insert(starterRows);
    }

    let createdAdminEmail: string | null = null;
    if (data.adminEmail && data.adminPassword) {
      const { data: authCreated, error: authErr } = await admin.auth.admin.createUser({
        email: data.adminEmail,
        password: data.adminPassword,
        email_confirm: true,
        user_metadata: { full_name: `Admin ${data.name}` },
      });

      if (authErr || !authCreated.user) {
        return NextResponse.json(
          {
            company: newOrg,
            warning: `Empresa creada, pero no se pudo crear el usuario administrador (${authErr?.message}). Puedes asignarlo manualmente luego.`,
          },
          { status: 201 }
        );
      }

      await admin.from('profiles').upsert({
        id: authCreated.user.id,
        email: data.adminEmail,
        role: 'admin',
        status: 'active',
        organization_id: newOrg.id,
        is_super_admin: false,
        full_name: `Administrador ${data.name}`,
      });
      createdAdminEmail = data.adminEmail;
    }

    return NextResponse.json(
      {
        company: newOrg,
        createdAdminEmail,
        message: 'Empresa creada con entorno privado y aislado correctamente.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error POST /api/admin/companies:', err);
    return NextResponse.json({ error: err.message || 'Error al crear empresa' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const rawBody = await req.json();
    const parsed = UpdateCompanySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { id, ...rawUpdates } = parsed.data;
    const isSuper = isAuthorizedSuperAdmin(ctx);
    const isOwnCompanyAdmin =
      Boolean(ctx?.profile) &&
      ctx?.profile?.status === 'active' &&
      ctx?.profile?.role === 'admin' &&
      ctx?.profile?.organization_id === id &&
      !ctx?.organization?.is_demo;

    if (!isSuper && !isOwnCompanyAdmin) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar la configuración de esta empresa.' },
        { status: 403 }
      );
    }

    const updates = { ...rawUpdates };
    if (!isSuper) {
      delete updates.is_active;
    }
    if (updates.invite_code) {
      updates.invite_code = updates.invite_code.toUpperCase();
    }

    const admin = createAdminClient();

    // Prevent disabling DUO Producciones
    const { data: targetOrg } = await admin
      .from('organizations')
      .select('slug')
      .eq('id', id)
      .single();

    if (targetOrg?.slug === DUO_ORG_SLUG && updates.is_active === false) {
      return NextResponse.json(
        { error: 'No se puede desactivar la empresa matriz DUO Producciones.' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await admin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ company: updated });
  } catch (err: any) {
    console.error('Error PATCH /api/admin/companies:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar empresa' }, { status: 500 });
  }
}
