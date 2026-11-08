import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    // Si Vercel envía CRON_SECRET, validarlo de forma opcional
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Variables de Supabase no configuradas' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta ligera a la base de datos para registrar actividad y prevenir la pausa automática
    const { data, error } = await supabase
      .from('master_costs')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error en keep-alive Supabase ping:', error);
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      recordFound: !!data && data.length > 0,
      message: 'Supabase mantenido activo exitosamente.',
    });
  } catch (err: any) {
    console.error('Excepción en keep-alive:', err);
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
