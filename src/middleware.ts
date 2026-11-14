import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user, supabase } = await updateSession(request);
    const { pathname } = request.nextUrl;

    const isPublicRoute = pathname === '/login' || pathname === '/register';
    const isPendingRoute = pathname === '/pending';
    const isApiRoute = pathname.startsWith('/api/');
    const isAuthCallback = pathname === '/api/auth/callback';
    const isPublicApi =
      isAuthCallback ||
      pathname === '/api/demo/enter' ||
      pathname === '/api/cron/keep-alive';

    // Always allow auth callback, demo entry, and cron keep-alive (each handles its own auth/validation)
    if (isPublicApi) {
      return supabaseResponse;
    }

    // API routes: require authentication
    if (isApiRoute) {
      if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      return supabaseResponse;
    }

    // Allow public access to login/register when not authenticated
    if (isPublicRoute && !user) {
      return supabaseResponse;
    }

    // Redirect unauthenticated users to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Authenticated user trying to access login/register — redirect to home
    if (isPublicRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check user profile status, role, and organization
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status, role, is_super_admin, organization_id, organizations(is_demo, is_active)')
      .eq('id', user.id)
      .single();

    if (!error && profile) {
      const org = (profile as any).organizations as { is_demo?: boolean; is_active?: boolean } | null;

      // Pending users or users without an assigned active organization can only access /pending
      const isPendingOrUnassigned =
        profile.status === 'pending' ||
        !profile.organization_id ||
        (org && org.is_active === false);

      if (isPendingOrUnassigned && !isPendingRoute) {
        return NextResponse.redirect(new URL('/pending', request.url));
      }

      // Active users with an active org should not be on /pending
      if (!isPendingOrUnassigned && isPendingRoute) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Governance is restricted to super_admin or non-demo company admins
      if (pathname.startsWith('/governance')) {
        const isSuperAdmin = Boolean((profile as any).is_super_admin);
        const isNonDemoCompanyAdmin = profile.role === 'admin' && !org?.is_demo;
        if (!isSuperAdmin && !isNonDemoCompanyAdmin) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
