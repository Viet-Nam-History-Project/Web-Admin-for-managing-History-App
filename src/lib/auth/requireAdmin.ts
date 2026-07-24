import { cookies, headers } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase/admin';
import { AdminRole, hasAnyRole } from '@/lib/auth/roles';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/auth/adminSessionToken';

export interface AdminActor {
  uid: string;
  email: string;
  displayName?: string;
  roles: string[];
}

export class AdminAuthError extends Error {
  status = 401;
}

export class AdminPermissionError extends Error {
  status = 403;
}

async function getBearerToken() {
  const headerList = await headers();
  const authorization = headerList.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length);
}

export async function requireAdmin(allowedRoles: AdminRole[] = []): Promise<AdminActor> {
  const token = await getBearerToken();
  let actor: AdminActor | null = null;
  if (token) {
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    const roles = Array.isArray(decoded.roles)
      ? decoded.roles.filter((role): role is string => typeof role === 'string')
      : [];
    if (decoded.admin !== true || roles.length === 0) {
      throw new AdminPermissionError('ID token không có Custom Claims quản trị.');
    }
    actor = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
      roles,
    };
  } else {
    const cookieToken = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value ?? '';
    const secret = process.env.ADMIN_SESSION_SECRET ?? '';
    const session = secret && cookieToken
      ? await verifyAdminSessionToken(cookieToken, secret)
      : null;
    if (session) actor = session;
  }

  if (!actor) throw new AdminAuthError('Thiếu hoặc hết hạn phiên quản trị.');
  const roles = actor.roles;
  if (!hasAnyRole(roles, allowedRoles)) {
    throw new AdminPermissionError('Không đủ quyền thực hiện thao tác này.');
  }
  return actor;
}
