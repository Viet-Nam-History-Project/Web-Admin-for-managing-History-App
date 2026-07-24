import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/auth/adminSessionToken';

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? '';
  if (value.length < 32) throw new Error('Server chưa cấu hình ADMIN_SESSION_SECRET.');
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Thiếu Firebase ID token.' }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(authorization.slice(7), true);
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles.filter((role): role is string => typeof role === 'string')
      : [];
    if (decoded.admin !== true || roles.length === 0) {
      return NextResponse.json({ error: 'Tài khoản chưa có Custom Claims quản trị.' }, { status: 403 });
    }

    const token = await createAdminSessionToken({
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
      roles,
    }, sessionSecret());
    const response = NextResponse.json({ ok: true, expiresIn: ADMIN_SESSION_TTL_SECONDS });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Không thể tạo admin session:', error);
    return NextResponse.json({ error: 'Không thể xác thực phiên quản trị.' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? '';
    const session = token
      ? await verifyAdminSessionToken(token, sessionSecret())
      : null;
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        uid: session.uid,
        email: session.email,
        displayName: session.displayName,
        roles: session.roles,
      },
      expiresAt: session.exp,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
