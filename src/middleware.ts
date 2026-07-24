import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/auth/adminSessionToken';

function unauthenticated(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Phiên quản trị không hợp lệ.' }, { status: 401 });
  }
  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/login' || pathname.startsWith('/api/auth/session') || pathname.startsWith('/content/')) {
    return NextResponse.next();
  }
  // Cho phép API client chuyển Bearer token tới route; requireAdmin() sẽ verify token
  // và Custom Claims trước khi bất kỳ service Firestore nào được gọi.
  if (pathname.startsWith('/api/admin/') && request.headers.get('authorization')?.startsWith('Bearer ')) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? '';
  if (!secret || !token || !(await verifyAdminSessionToken(token, secret))) {
    return unauthenticated(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
