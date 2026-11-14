import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { DUO_ORG_SLUG, SUPER_ADMIN_EMAIL } from '@/lib/constants';
import { ensureDemoEnvironment } from '@/lib/demo-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SwitchCompanySchema = z.object({
  organizationId: z.string().uuid().optional(),
  returnHome: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.profile || ctx.profile.status !== 'active') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const isSuperAdmin =
      Boolean(ctx.profile.is_super_admin) ||
      ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Solo el Super Administrador de KAIROS ERP puede cambiar entre empresas.' },
        { status: 403 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = SwitchCompanySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Solicitud inválida.' },
        { status: 400 }
      );
    }

    const { organizationId, returnHome } = parsed.data;
    if (!returnHome && !organizationId) {
      return NextResponse.json(
        { error: 'Debes especificar la empresa destino.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const targetQuery = returnHome
      ? admin.from('organizations').select('*').eq('slug', DUO_ORG_SLUG).single()
      : admin.from('organizations').select('*').eq('id', organizationId!).single();

    const { data: targetOrg, error: orgErr } = await targetQuery;

    if (orgErr || !targetOrg) {
      return NextResponse.json(
        { error: 'La empresa seleccionada no existe.' },
        { status: 404 }
      );
    }

    if (targetOrg.is_demo) {
      await ensureDemoEnvironment(admin);
    }

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        organization_id: targetOrg.id,
        role: 'admin',
        status: 'active',
        is_super_admin: true,
      })
      .eq('id', ctx.userId);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    return NextResponse.json({
      success: true,
      organization: targetOrg,
      message: `Entorno activo cambiado a ${targetOrg.name}.`,
    });
  } catch (err: any) {
    console.error('Error POST /api/admin/switch-company:', err);
    return NextResponse.json(
      { error: err.message || 'No se pudo cambiar de empresa.' },
      { status: 500 }
    );
  }
}
