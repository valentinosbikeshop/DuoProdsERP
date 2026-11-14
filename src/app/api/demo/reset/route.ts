import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { resetDemoSession } from '@/lib/demo-seed';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isDemoUser = Boolean(ctx.organization?.is_demo);
    const isSuperAdmin = Boolean(ctx.profile?.is_super_admin);

    if (!isDemoUser && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'El reseteo de datos solo está permitido en la sesión de prueba.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const stats = await resetDemoSession(admin);

    return NextResponse.json({
      success: true,
      message: 'Sesión de prueba reseteada. Los ejemplos base fueron preservados intactos.',
      stats,
    });
  } catch (err: any) {
    console.error('Error en /api/demo/reset:', err);
    return NextResponse.json(
      { error: err.message || 'Error al resetear la sesión de prueba.' },
      { status: 500 }
    );
  }
}
