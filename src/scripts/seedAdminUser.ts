import { FieldValue } from 'firebase-admin/firestore';
import { UserRecord } from 'firebase-admin/auth';
import { loadEnvConfig } from '@next/env';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { ADMIN_ROLES } from '@/lib/auth/roles';

async function main() {
  loadEnvConfig(process.cwd());
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email) {
    throw new Error('Thiếu SEED_ADMIN_EMAIL. Ví dụ: SEED_ADMIN_EMAIL=admin@example.com npm run seed:admin');
  }
  if (password && password.length < 6) {
    throw new Error('SEED_ADMIN_PASSWORD phải có ít nhất 6 ký tự.');
  }

  const auth = getAdminAuth();
  let user: UserRecord;
  try {
    user = await auth.getUserByEmail(email);
    if (password) {
      user = await auth.updateUser(user.uid, { password, emailVerified: true, disabled: false });
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') throw error;
    if (!password) {
      throw new Error('Tài khoản chưa tồn tại. Hãy truyền thêm SEED_ADMIN_PASSWORD để tạo tài khoản mới.');
    }
    user = await auth.createUser({ email, password, emailVerified: true, disabled: false });
  }

  await getAdminDb().doc(`admin_users/${user.uid}`).set(
    {
      email,
      displayName: user.displayName ?? email,
      roles: ['super_admin'],
      allowedRoles: ADMIN_ROLES,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await auth.setCustomUserClaims(user.uid, {
    admin: true,
    roles: ['super_admin'],
  });

  console.log(`Đã cấp super_admin cho ${email} (${user.uid}).`);
  console.log('Mật khẩu chỉ được lưu trong Firebase Authentication, không lưu trong Firestore.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
