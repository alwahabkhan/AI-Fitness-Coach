/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const trainerRoutes = ['/trainer'];
const traineeRoutes = ['/trainee'];
const adminRoutes = ['/admin'];
const authRoutes = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session from cookies
  const sessionCookie = request.cookies.get('session');
  const isAuthenticated = !!sessionCookie;

  // Redirect root to login if not authenticated
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users based on role
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie.value);
        const userRole = session.user?.role;

        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        } else if (userRole === 'trainer') {
          return NextResponse.redirect(new URL('/trainer', request.url));
        } else if (userRole === 'trainee') {
          return NextResponse.redirect(new URL('/trainee', request.url));
        }
      } catch (error) {
        // Invalid session, allow to continue to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session');
        return response;
      }
    }
    return NextResponse.next();
  }

  // Redirect authenticated users away from login page
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      try {
        const session = JSON.parse(sessionCookie.value);
        const userRole = session.user?.role;

        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        } else if (userRole === 'trainer') {
          return NextResponse.redirect(new URL('/trainer', request.url));
        } else if (userRole === 'trainee') {
          return NextResponse.redirect(new URL('/trainee', request.url));
        }
      } catch (error) {
        // Invalid session, allow to continue to login
        const response = NextResponse.next();
        response.cookies.delete('session');
        return response;
      }
    }
    return NextResponse.next();
  }

  // Check admin routes
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const session = JSON.parse(sessionCookie.value);
      const userRole = session.user?.role;

      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  // Check trainer routes
  if (trainerRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const session = JSON.parse(sessionCookie.value);
      const userRole = session.user?.role;

      if (userRole !== 'trainer') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  // Check trainee routes
  if (traineeRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const session = JSON.parse(sessionCookie.value);
      const userRole = session.user?.role;

      if (userRole !== 'trainee') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
