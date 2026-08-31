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
    
    // Always allow auth callback (it handles its own auth)
    if (isAuthCallback) {
      return supabaseResponse;
    }

    // API routes: require authentication (except auth callback above)
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

    // Check user profile status and role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single();

    if (!error && profile) {
      // Pending users can only access /pending
      if (profile.status === 'pending' && !isPendingRoute) {
        return NextResponse.redirect(new URL('/pending', request.url));
      }

      // Active users should not be on /pending
      if (profile.status === 'active' && isPendingRoute) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Only admins can access /governance
      if (pathname.startsWith('/governance') && profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login instead of allowing access
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
