import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export interface AdminAuditLog {
  id: string;
  actorEmail?: string;
  action?: string;
  entityType?: string;
  entityPath?: string;
  entityTitle?: string;
  createdAt?: unknown;
  before?: unknown;
  after?: unknown;
}

export const auditAdminService = {
  async list(options: { entityPathPrefix?: string; limit?: number } = {}) {
    const snapshot = await getAdminDb().collection(paths.auditLogs).orderBy('createdAt', 'desc').limit(options.limit ?? 250).get();
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminAuditLog);
    if (options.entityPathPrefix) items = items.filter((item) => item.entityPath?.startsWith(options.entityPathPrefix as string));
    return { items };
  },
};
