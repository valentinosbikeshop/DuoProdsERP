import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getAuthenticatedContext } from '@/lib/supabase/admin';
import { ensureDemoEnvironment, getDemoQuotaStats } from '@/lib/demo-seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedContext(req);
    if (!ctx || !ctx.organization?.is_demo) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const admin = createAdminClient();
    await ensureDemoEnvironment(admin);
    const stats = await getDemoQuotaStats(admin, ctx.organization.id);

    return NextResponse.json({ stats });
  } catch (err: any) {
    console.error('Error en /api/demo/status:', err);
    return NextResponse.json(
      { error: err.message || 'Error al consultar estado demo.' },
      { status: 500 }
    );
  }
}
