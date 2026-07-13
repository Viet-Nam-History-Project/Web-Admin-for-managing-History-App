import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export interface ListOptions {
  limit?: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface RepositoryListResult<T> {
  items: T[];
  lastDoc?: QueryDocumentSnapshot;
}

export function createCollectionRepository<T extends { id?: string }>(collectionPath: string) {
  const collectionRef = () => getAdminDb().collection(collectionPath);

  return {
    async list(options: ListOptions = {}): Promise<RepositoryListResult<T>> {
      const limit = options.limit ?? 50;
      const orderField = options.orderBy ?? 'sortOrder';
      const direction = options.direction ?? 'asc';
      const snap = await collectionRef().orderBy(orderField, direction).limit(limit).get();
      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as T)
        .filter((item) => options.includeDeleted || (item as Record<string, unknown>).status !== 'deleted');
      return {
        items,
        lastDoc: snap.docs.at(-1),
      };
    },
    async get(id: string): Promise<T | null> {
      const doc = await collectionRef().doc(id).get();
      return doc.exists ? ({ id: doc.id, ...doc.data() } as T) : null;
    },
    async create(id: string, data: Record<string, unknown>) {
      await collectionRef().doc(id).set({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    },
    async update(id: string, data: Record<string, unknown>) {
      await collectionRef().doc(id).set(
        {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    },
    async softDelete(id: string, deletedBy: string, previousStatus = 'draft') {
      await collectionRef().doc(id).set(
        {
          status: 'deleted',
          previousStatus,
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy,
          updatedAt: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    },
    async publish(id: string) {
      await this.update(id, { status: 'published' });
    },
    async unpublish(id: string) {
      await this.update(id, { status: 'draft' });
    },
  };
}
