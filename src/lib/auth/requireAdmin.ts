import { headers } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { AdminRole, hasAnyRole } from '@/lib/auth/roles';

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
  if (!token) {
    throw new AdminAuthError('Thiếu Firebase ID token.');
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const adminDoc = await getAdminDb().doc(`${paths.adminUsers}/${decoded.uid}`).get();

  if (!adminDoc.exists) {
    throw new AdminPermissionError('Tài khoản không thuộc admin_users.');
  }

  const data = adminDoc.data() ?? {};
  if (data.status !== 'active') {
    throw new AdminPermissionError('Tài khoản admin chưa active hoặc đã bị khóa.');
  }

  const roles = Array.isArray(data.roles) ? data.roles : [];
  if (!hasAnyRole(roles, allowedRoles)) {
    throw new AdminPermissionError('Không đủ quyền thực hiện thao tác này.');
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? data.email ?? '',
    displayName: data.displayName,
    roles,
  };
}
