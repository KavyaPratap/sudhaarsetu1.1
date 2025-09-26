
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const publicRoutes = ['/login'];
  const adminRoutes = ['/admin', '/admin/departments', '/admin/analytics', '/admin/issue'];
  const workerRoutes = ['/worker', '/worker/my-work', '/worker/issue'];

  // If user is not logged in and trying to access a protected route, redirect to login
  if (!user && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in, prevent them from accessing the login page
  if (user && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    if (profile?.role !== 'admin' && isAdminRoute) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    
    const isWorkerRoute = workerRoutes.some(route => pathname.startsWith(route));
    if (profile?.role !== 'worker' && isWorkerRoute) {
        return NextResponse.redirect(new URL('/', request.url));
    }
  }


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
