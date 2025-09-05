
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect all routes except /login without a user
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in, redirect them from /login to home
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Admin route protection is now handled in the AdminLayout/Admin pages directly
  // to avoid running a DB query on every single request.

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
