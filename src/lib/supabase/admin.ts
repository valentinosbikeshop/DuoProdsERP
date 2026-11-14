import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { Database, Organization, Profile } from '@/types/database';

/**
 * Creates a privileged Supabase Admin client using SUPABASE_SERVICE_ROLE_KEY.
 * MUST ONLY BE CALLED ON THE SERVER (Route Handlers / Server Actions).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AuthenticatedContext {
  userId: string;
  email: string;
  profile: Profile | null;
  organization: Organization | null;
}

/**
 * Extracts and validates the authenticated user, their profile, and their organization
 * from an incoming NextRequest without trusting any client-supplied tenant IDs.
 */
export async function getAuthenticatedContext(req: NextRequest): Promise<AuthenticatedContext | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const admin = createAdminClient();
    const { data: profileData } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const profile = (profileData as Profile | null) ?? null;

    let organization: Organization | null = null;
    if (profile?.organization_id) {
      const { data: orgData } = await admin
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      organization = (orgData as Organization | null) ?? null;
    }

    return {
      userId: user.id,
      email: user.email || '',
      profile,
      organization,
    };
  } catch (err) {
    console.error('Error getting authenticated context:', err);
    return null;
  }
}
