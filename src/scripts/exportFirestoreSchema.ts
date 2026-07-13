import { writeFileSync } from 'node:fs';
import { getAdminDb } from '@/lib/firebase/admin';

const COLLECTIONS = [
  'users',
  'admin_users',
  'periods',
  'periods_person',
  'games',
  'forum/posts/all',
  'media_assets',
  'admin_audit_logs',
];

async function main() {
  const db = getAdminDb();
  const schema: Record<string, string[]> = {};

  for (const path of COLLECTIONS) {
    const snap = await db.collection(path).limit(20).get().catch(() => null);
    const keys = new Set<string>();
    snap?.docs.forEach((doc) => Object.keys(doc.data()).forEach((key) => keys.add(key)));
    schema[path] = [...keys].sort();
  }

  writeFileSync('firestore-schema.export.json', JSON.stringify(schema, null, 2));
  console.log('Exported firestore-schema.export.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
