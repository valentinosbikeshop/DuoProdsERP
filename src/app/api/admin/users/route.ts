import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import type { Profile } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'active']).optional(),
  role: z.enum(['admin', 'member']).optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

function getAuthFlags(ctx: Awaited<ReturnType<typeof getAuthenticatedContext>>) {
  if (!ctx || !ctx.profile || ctx.profile.status !== 'active') {
    return { allowed: false, isSuperAdmin: false, orgId: null as string | null };
  }
  const isSuperAdmin =
    Boolean(ctx.profile.is_super_admin) ||
    ctx.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  if (!isSuperAdmin && ctx.organization?.is_demo) {
    return { allowed: false, isSuperAdmin: false, orgId: null as string | null };
  }
  const isCompanyAdmin = ctx.profile.role === 'admin' && Boolean(ctx.profile.organization_id);

  return {
    allowed: isSuperAdmin || isCompanyAdmin,
    isSuperAdmin,
    orgId: ctx.profile.organization_id,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const admin = createAdminClient();
    let query = admin
      .from('profiles')
      .select('*, organizations(id, name, slug, is_demo)')
      .order('created_at', { ascending: false });

    if (!flags.isSuperAdmin && flags.orgId) {
      query = query.eq('organization_id', flags.orgId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users: data || [] });
  } catch (err: any) {
    console.error('Error GET /api/admin/users:', err);
    return NextResponse.json({ error: err.message || 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed || !ctx) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = UpdateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { userId, status, role, organization_id } = parsed.data;
    const admin = createAdminClient();

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetProfile.is_super_admin) {
      return NextResponse.json(
        { error: 'No se puede modificar al administrador principal de la plataforma.' },
        { status: 403 }
      );
    }

    if (!flags.isSuperAdmin && targetProfile.organization_id !== flags.orgId) {
      return NextResponse.json(
        { error: 'No tienes permisos sobre usuarios de otra empresa.' },
        { status: 403 }
      );
    }

    const updatePayload: Partial<Omit<Profile, 'id'>> = {};
    if (status !== undefined) updatePayload.status = status;
    if (role !== undefined) updatePayload.role = role;
    if (organization_id !== undefined) {
      if (!flags.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Solo el administrador principal puede reasignar empresas.' },
          { status: 403 }
        );
      }
      updatePayload.organization_id = organization_id;
    }

    // Require an organization when activating a user
    const finalOrgId =
      updatePayload.organization_id !== undefined
        ? updatePayload.organization_id
        : targetProfile.organization_id;

    if (updatePayload.status === 'active' && !finalOrgId) {
      return NextResponse.json(
        { error: 'Debes asignar una empresa antes de aprobar la cuenta del usuario.' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('*, organizations(id, name, slug, is_demo)')
      .single();

    if (error) throw error;

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    console.error('Error PATCH /api/admin/users:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    const flags = getAuthFlags(ctx);
    if (!flags.allowed || !ctx) {
      return NextResponse.json({ error: 'Acceso restringido.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    if (userId === ctx.userId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetProfile.is_super_admin) {
      return NextResponse.json({ error: 'No se puede eliminar al super administrador.' }, { status: 403 });
    }

    if (!flags.isSuperAdmin && targetProfile.organization_id !== flags.orgId) {
      return NextResponse.json(
        { error: 'No tienes permisos sobre usuarios de otra empresa.' },
        { status: 403 }
      );
    }

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
    if (delAuthErr) {
      // Fallback delete profile directly if auth user already removed
      await admin.from('profiles').delete().eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error DELETE /api/admin/users:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar usuario' }, { status: 500 });
  }
}
