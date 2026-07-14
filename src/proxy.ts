import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from './lib/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, favicon, and APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('ready_session')?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/worker');

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (!session) {
    if (isProtectedPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Allow accessing login/signup pages even with active sessions to permit re-login/role switching
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Role-based route protection
  if (session.role === 'worker') {
    if (pathname.startsWith('/dashboard') || pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/worker', request.url));
    }
  } else {
    // Hotel account
    if (pathname === '/worker') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    if (!session.onboardingCompleted) {
      if (pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } else {
      if (pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/worker',
    '/worker/:path*',
    '/login',
    '/signup',
  ],
};
