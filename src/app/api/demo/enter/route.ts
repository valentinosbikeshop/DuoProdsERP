import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanupStaleDemoData, ensureDemoEnvironment } from '@/lib/demo-seed';
import { DEMO_USER_EMAIL } from '@/lib/constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno de Supabase.' },
        { status: 500 }
      );
    }

    const admin = createAdminClient();

    // 1. Ensure demo organization, user, and rich base examples exist
    await ensureDemoEnvironment(admin);

    // 2. Auto-clean stale user-created demo data older than 24h
    await cleanupStaleDemoData(admin);

    // 3. Mint an instant server-side session via magiclink OTP verification (zero client passwords)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: DEMO_USER_EMAIL,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      throw new Error(linkError?.message || 'No se pudo generar el acceso de prueba.');
    }

    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
    const ssrClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(newCookies: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.push(...newCookies);
        },
      },
    });

    const { error: verifyError } = await ssrClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError) {
      throw new Error(`Error al iniciar sesión demo: ${verifyError.message}`);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Sesión de prueba iniciada correctamente.',
    });

    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch (err: any) {
    console.error('Error en /api/demo/enter:', err);
    return NextResponse.json(
      { error: err.message || 'No se pudo iniciar la sesión de prueba.' },
      { status: 500 }
    );
  }
}
