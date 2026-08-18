import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('firebaseAuthToken')?.value;

  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If user is not logged in and trying to access a protected route
  if (!token && !isPublicRoute) {
    // Allow request, individual Server Actions & pages will enforce auth checks
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
