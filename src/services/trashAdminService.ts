import { FieldValue } from 'firebase-admin/firestore';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export type TrashEntityType =
  | 'period'
  | 'stage'
  | 'event'
  | 'person_period'
  | 'person'
  | 'person_event'
  | 'article'
  | 'museum'
  | 'quiz'
  | 'question'
  | 'timeline_era'
  | 'forum_post';

export interface TrashItem {
  id: string;
  entityType: TrashEntityType;
  entityPath: string;
  parentPath?: string;
  title: string;
  slug: string;
  deletedAt?: unknown;
  deletedBy: string;
  previousStatus: string;
  restoreAvailable: boolean;
  snapshotPreview?: Record<string, unknown>;
}

function trashIdFor(entityPath: string) {
  return Buffer.from(entityPath).toString('base64url');
}

export const trashRepository = {
  async add(input: Omit<TrashItem, 'id' | 'deletedAt' | 'restoreAvailable'>) {
    const id = trashIdFor(input.entityPath);
    await getAdminDb().collection(paths.trash).doc(id).set({
      ...input,
      restoreAvailable: true,
      deletedAt: FieldValue.serverTimestamp(),
    });
    return id;
  },

  async list() {
    const snapshot = await getAdminDb().collection(paths.trash).orderBy('deletedAt', 'desc').limit(250).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TrashItem);
  },

  async get(id: string) {
    const snapshot = await getAdminDb().collection(paths.trash).doc(id).get();
    return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as TrashItem) : null;
  },

  async markRestored(id: string, actor: AdminActor) {
    await getAdminDb().collection(paths.trash).doc(id).set({
      restoreAvailable: false,
      restoredAt: FieldValue.serverTimestamp(),
      restoredBy: actor.uid,
    }, { merge: true });
  },
  async remove(id: string) {
    await getAdminDb().collection(paths.trash).doc(id).delete();
  },
};

export const trashAdminService = {
  list: () => trashRepository.list(),

  async addDeletedEntity(
    actor: AdminActor,
    input: {
      entityType: TrashEntityType;
      entityPath: string;
      parentPath?: string;
      title: string;
      slug: string;
      previousStatus: string;
      snapshotPreview?: Record<string, unknown>;
    },
  ) {
    return trashRepository.add({ ...input, deletedBy: actor.uid });
  },

  async restore(actor: AdminActor, trashId: string) {
    const item = await trashRepository.get(trashId);
    if (!item) throw new Error('Không tìm thấy mục trong thùng rác.');
    if (!item.restoreAvailable) throw new Error('Mục này đã được khôi phục trước đó.');

    const ref = getAdminDb().doc(item.entityPath);
    const before = await ref.get();
    if (!before.exists) throw new Error('Document gốc không còn tồn tại nên không thể khôi phục an toàn.');

    await ref.set({
      status: item.previousStatus || 'draft',
      previousStatus: FieldValue.delete(),
      deletedAt: FieldValue.delete(),
      deletedBy: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    await trashRepository.markRestored(trashId, actor);
    await writeAuditLog({
      actor,
      action: 'restore',
      entityType: item.entityType,
      entityPath: item.entityPath,
      entityTitle: item.title,
      before: before.data(),
      after: { status: item.previousStatus || 'draft' },
    });
  },

  async permanentDelete(actor: AdminActor, trashId: string, confirmation: string) {
    if (!actor.roles.includes('super_admin')) throw new Error('Chỉ super_admin được xóa vĩnh viễn.');
    if (confirmation !== 'DELETE') throw new Error('Cần nhập chính xác DELETE để xác nhận.');
    const item = await trashRepository.get(trashId);
    if (!item) throw new Error('Không tìm thấy mục trong thùng rác.');
    if (!item.restoreAvailable) throw new Error('Không thể xóa vĩnh viễn mục đã được khôi phục.');

    const db = getAdminDb();
    const entityRef = db.doc(item.entityPath);
    const snapshot = await entityRef.get();
    if (snapshot.exists && snapshot.data()?.status !== 'deleted') {
      throw new Error('Document không còn ở trạng thái deleted. Hãy tải lại Thùng rác.');
    }

    if (snapshot.exists) await db.recursiveDelete(entityRef);
    await trashRepository.remove(trashId);
    await writeAuditLog({
      actor,
      action: 'permanent_delete',
      entityType: item.entityType,
      entityPath: item.entityPath,
      entityTitle: item.title,
      before: snapshot.data() ?? item.snapshotPreview,
      after: { permanentlyDeleted: true },
    });
  },
};
