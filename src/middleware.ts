// Next.js Edge Middleware — protects all /dashboard, /pos, /customers, etc.
// Unauthenticated users are redirected to /login.
// The session cookie check is lightweight (existence only) — full validation
// happens inside each API route via getSessionUser().

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'njms_session';

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Check for session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE);
  if (!sessionCookie?.value) {
    // Redirect to login, preserving the intended destination
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
