import { loadEnvConfig } from '@next/env';
import { FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

const BATCH_SIZE = 400;

function isLegacyDraft(data: FirebaseFirestore.DocumentData) {
  // Dữ liệu nhân vật được migrate từ schema cũ có `updated_at`, không có
  // createdAt/updatedAt chuẩn của màn quản trị mới. Chỉ nhóm này được publish
  // tự động; mọi bản nháp mới vẫn phải do admin xuất bản thủ công.
  return data.status === 'draft'
    && data.updated_at != null
    && data.createdAt == null
    && data.updatedAt == null;
}

async function commit(operations: ((batch: WriteBatch) => void)[]) {
  const db = getAdminDb();
  for (let offset = 0; offset < operations.length; offset += BATCH_SIZE) {
    const batch = db.batch();
    operations.slice(offset, offset + BATCH_SIZE).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const apply = process.argv.includes('--apply');
  const db = getAdminDb();
  const groups = await db.collection('periods_person').get();
  const operations: ((batch: WriteBatch) => void)[] = [];
  let persons = 0;
  let personEvents = 0;

  for (const group of groups.docs) {
    if (group.data().status !== 'published') continue;
    const people = await group.ref.collection('persons').get();
    for (const person of people.docs) {
      if (!isLegacyDraft(person.data())) continue;
      persons += 1;
      operations.push((batch) => batch.set(person.ref, {
        status: 'published',
        publishedAt: FieldValue.serverTimestamp(),
      }, { merge: true }));

      const events = await person.ref.collection('events').get();
      for (const event of events.docs) {
        if (event.data().status != null || event.data().isDeleted === true) continue;
        personEvents += 1;
        operations.push((batch) => batch.set(event.ref, {
          status: 'published',
          publishedAt: FieldValue.serverTimestamp(),
        }, { merge: true }));
      }
    }
  }

  if (apply) await commit(operations);
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', persons, personEvents, writes: operations.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
