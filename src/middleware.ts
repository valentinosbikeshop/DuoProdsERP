import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user, supabase } = await updateSession(request);
    const { pathname } = request.nextUrl;

    const isPublicRoute = pathname === '/login' || pathname === '/register';
    const isMfaRoute = pathname === '/mfa-challenge';
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

    // Check if authenticated user still needs to complete 2FA (TOTP AAL2)
    let requiresMfaVerification = false;
    if (user && Array.isArray(user.factors)) {
      const hasVerifiedMfa = user.factors.some((f: any) => f.status === 'verified');
      if (hasVerifiedMfa) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!aalData || aalData.currentLevel !== 'aal2') {
          requiresMfaVerification = true;
        }
      }
    }

    // API routes: require authentication + AAL2 if MFA enrolled
    if (isApiRoute) {
      if (!user || requiresMfaVerification) {
        return NextResponse.json(
          { error: requiresMfaVerification ? 'Se requiere verificación en dos pasos (2FA)' : 'No autorizado' },
          { status: 401 }
        );
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

    // Enforce 2FA challenge before accessing any dashboard or protected route
    if (requiresMfaVerification) {
      if (!isMfaRoute) {
        return NextResponse.redirect(new URL('/mfa-challenge', request.url));
      }
      return supabaseResponse;
    }

    // User already passed MFA (or does not have MFA) — redirect away from /mfa-challenge
    if (isMfaRoute) {
      return NextResponse.redirect(new URL('/', request.url));
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
      const isSuperAdmin = Boolean((profile as any).is_super_admin);

      // Pending users or users without an assigned active organization can only access /pending
      const isPendingOrUnassigned =
        profile.status === 'pending' ||
        !profile.organization_id ||
        (!isSuperAdmin && org && org.is_active === false);

      if (isPendingOrUnassigned && !isPendingRoute) {
        return NextResponse.redirect(new URL('/pending', request.url));
      }

      // Active users with an active org should not be on /pending
      if (!isPendingOrUnassigned && isPendingRoute) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Governance is restricted to super_admin or non-demo company admins
      if (pathname.startsWith('/governance')) {
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
