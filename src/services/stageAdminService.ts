import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { paths } from '@/lib/firebase/firestorePaths';
import { getAdminDb } from '@/lib/firebase/admin';
import { stageSchema, stageUpdateSchema, StagePayload } from '@/lib/validation/contentSchemas';
import { createCollectionRepository } from '@/services/baseRepository';
import { prepareFirestoreContent } from '@/services/contentMutationHelpers';
import { trashAdminService } from '@/services/trashAdminService';

export interface AdminStage extends StagePayload {
  id: string;
  eventCount?: number;
  updatedAt?: unknown;
  updated_at?: unknown;
}

export function stageRepository(periodSlug: string) {
  return createCollectionRepository<AdminStage>(paths.stages(periodSlug));
}

export const stageAdminService = {
  async list(periodSlug: string, includeDeleted = false) {
    const result = await stageRepository(periodSlug).list({ orderBy: 'sortOrder', direction: 'asc', includeDeleted, limit: 250 });
    const items = await Promise.all(result.items.map(async (stage) => {
      const count = await getAdminDb().collection(paths.events(periodSlug, stage.id)).count().get();
      return { ...stage, eventCount: count.data().count };
    }));
    return { ...result, items };
  },
  get: (periodSlug: string, stageSlug: string) => stageRepository(periodSlug).get(stageSlug),

  async create(actor: AdminActor, periodSlug: string, payload: unknown) {
    const data = stageSchema.parse(payload);
    if (await stageRepository(periodSlug).get(data.slug)) throw new Error('Slug giai đoạn đã tồn tại trong thời kỳ này.');
    await stageRepository(periodSlug).create(data.slug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'create', entityType: 'stage', entityPath: paths.stage(periodSlug, data.slug), entityTitle: data.title, after: data });
    return data.slug;
  },

  async update(actor: AdminActor, periodSlug: string, stageSlug: string, payload: unknown) {
    const data = stageUpdateSchema.parse(payload);
    const before = await stageRepository(periodSlug).get(stageSlug);
    if (!before) throw new Error('Không tìm thấy giai đoạn.');
    await stageRepository(periodSlug).update(stageSlug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'update', entityType: 'stage', entityPath: paths.stage(periodSlug, stageSlug), entityTitle: before.title, before, after: data });
  },

  async softDelete(actor: AdminActor, periodSlug: string, stageSlug: string) {
    const before = await stageRepository(periodSlug).get(stageSlug);
    if (!before) throw new Error('Không tìm thấy giai đoạn.');
    const previousStatus = before.status || 'draft';
    await stageRepository(periodSlug).softDelete(stageSlug, actor.uid, previousStatus);
    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'stage', entityPath: paths.stage(periodSlug, stageSlug), parentPath: paths.period(periodSlug),
      title: before.title, slug: stageSlug, previousStatus, snapshotPreview: { title: before.title, periodSlug },
    });
    await writeAuditLog({ actor, action: 'soft_delete', entityType: 'stage', entityPath: paths.stage(periodSlug, stageSlug), entityTitle: before.title, before, after: { status: 'deleted' } });
  },

  async publish(actor: AdminActor, periodSlug: string, stageSlug: string) {
    const before = await stageRepository(periodSlug).get(stageSlug);
    if (!before) throw new Error('Không tìm thấy giai đoạn.');
    if (!before.coverMediaRef || !before.overview) {
      throw new Error('Không thể xuất bản: giai đoạn cần ảnh bìa và overview.');
    }
    await stageRepository(periodSlug).publish(stageSlug);
    await writeAuditLog({ actor, action: 'publish', entityType: 'stage', entityPath: paths.stage(periodSlug, stageSlug), entityTitle: before.title, before, after: { status: 'published' } });
  },

  async unpublish(actor: AdminActor, periodSlug: string, stageSlug: string) {
    const before = await stageRepository(periodSlug).get(stageSlug);
    if (!before) throw new Error('Không tìm thấy giai đoạn.');
    await stageRepository(periodSlug).unpublish(stageSlug);
    await writeAuditLog({ actor, action: 'unpublish', entityType: 'stage', entityPath: paths.stage(periodSlug, stageSlug), entityTitle: before.title, before, after: { status: 'draft' } });
  },
};
