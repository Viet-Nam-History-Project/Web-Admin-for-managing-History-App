import { loadEnvConfig } from '@next/env';
import { WriteBatch } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

const BATCH_SIZE = 400;

async function main() {
  loadEnvConfig(process.cwd());
  const db = getAdminDb();
  const posts = await db.collection('forum').get();
  const missingVisibility = posts.docs.filter((post) => typeof post.data().isHidden !== 'boolean');

  for (let offset = 0; offset < missingVisibility.length; offset += BATCH_SIZE) {
    const batch: WriteBatch = db.batch();
    for (const post of missingVisibility.slice(offset, offset + BATCH_SIZE)) {
      // Bài cũ chưa có cờ moderation được coi là công khai. Bài đã có cờ
      // `isHidden: true` không nằm trong danh sách này nên luôn được giữ kín.
      batch.set(post.ref, { isHidden: false }, { merge: true });
    }
    await batch.commit();
  }

  console.log(JSON.stringify({
    forumPosts: posts.size,
    visibilityBackfilled: missingVisibility.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
