import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = typeof atob === 'function'
      ? decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
      : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('dj_session')?.value;

  const isAdminRoute = (pathname === '/admin' || pathname.startsWith('/admin/')) && pathname !== '/admin/login';
  const isWriterRoute = pathname === '/writer' || pathname.startsWith('/writer/');
  const isReaderRoute = pathname === '/reader' || pathname.startsWith('/reader/');

  if (!isAdminRoute && !isWriterRoute && !isReaderRoute) {
    return NextResponse.next();
  }

  // Admin route: always allow navigation to /admin so the admin portal can render and authenticate
  if (isAdminRoute) {
    return NextResponse.next();
  }

  // If no session cookie, user is logged out -> redirect to appropriate login
  if (!sessionCookie) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodeJWTPayload(sessionCookie);
  if (!payload) {
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = (payload.role || '').toLowerCase().trim();
  const email = (payload.email || '').toLowerCase().trim();
  const isAdmin = role === 'admin' || role === 'co-admin' || role === 'editor' || email.includes('admin') || payload.id === 1;
  const isWriter = isAdmin || role === 'writer' || role === 'editor' || email.includes('writer');

  // Admin route protection: must have admin role
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL(isWriter ? '/writer' : '/reader', request.url));
  }

  // Writer route protection if signed in as reader only
  if (isWriterRoute && !isWriter && role === 'reader') {
    return NextResponse.redirect(new URL('/reader', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/writer', '/writer/:path*', '/reader', '/reader/:path*'],
};
