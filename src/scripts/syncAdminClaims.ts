import { loadEnvConfig } from '@next/env';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { ADMIN_ROLES, AdminRole } from '@/lib/auth/roles';

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole);
}

async function main() {
  loadEnvConfig(process.cwd());
  const auth = getAdminAuth();
  const snapshot = await getAdminDb().collection('admin_users').get();
  let updated = 0;
  let skipped = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    const roles = Array.isArray(data.roles) ? data.roles.filter(isAdminRole) : [];
    const active = data.status === 'active' && roles.length > 0;
    try {
      const user = await auth.getUser(document.id);
      await auth.setCustomUserClaims(user.uid, {
        ...(user.customClaims ?? {}),
        admin: active,
        roles: active ? roles : [],
      });
      updated += 1;
    } catch (error) {
      console.warn(`Bỏ qua admin_users/${document.id}:`, error instanceof Error ? error.message : error);
      skipped += 1;
    }
  }

  console.log(JSON.stringify({ adminDocuments: snapshot.size, updated, skipped }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
