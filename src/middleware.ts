import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user, supabase } = await updateSession(request);
    const { pathname } = request.nextUrl;

    const isPublicRoute = pathname === '/login' || pathname === '/register';
    const isPendingRoute = pathname === '/pending';
    const isApiRoute = pathname.startsWith('/api/');
    
    // Allow public access to public routes
    if (isPublicRoute && !user) {
      return supabaseResponse;
    }

    if (isApiRoute) {
      return supabaseResponse;
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user) {
      if (isPublicRoute) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        if (profile.status === 'pending' && !isPendingRoute) {
          return NextResponse.redirect(new URL('/pending', request.url));
        }

        if (profile.status === 'active' && isPendingRoute) {
          return NextResponse.redirect(new URL('/', request.url));
        }

        if (pathname.startsWith('/governance') && profile.role !== 'admin') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next({
      request,
    });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
