import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { periodSchema, periodUpdateSchema, PeriodPayload } from '@/lib/validation/contentSchemas';
import { createCollectionRepository } from '@/services/baseRepository';
import { prepareFirestoreContent } from '@/services/contentMutationHelpers';
import { trashAdminService } from '@/services/trashAdminService';

export interface AdminPeriod extends PeriodPayload {
  id: string;
  stageCount?: number;
  eventCount?: number;
  updatedAt?: unknown;
  updated_at?: unknown;
}

export const periodRepository = createCollectionRepository<AdminPeriod>(paths.periods);

async function enrichCounts(period: AdminPeriod) {
  const stageSnapshot = await getAdminDb().collection(paths.stages(period.id)).get();
  let eventCount = 0;
  await Promise.all(stageSnapshot.docs.map(async (stage) => {
    const eventSnapshot = await stage.ref.collection('events').count().get();
    eventCount += eventSnapshot.data().count;
  }));
  return { ...period, stageCount: stageSnapshot.size, eventCount };
}

export const periodAdminService = {
  async list(options: { includeDeleted?: boolean; status?: string; search?: string } = {}) {
    const result = await periodRepository.list({
      orderBy: 'sortOrder',
      direction: 'asc',
      includeDeleted: options.includeDeleted,
      limit: 200,
    });
    const search = options.search?.trim().toLowerCase();
    const filtered = result.items.filter((item) => {
      if (options.status && item.status !== options.status) return false;
      if (search && !`${item.title} ${item.slug ?? item.id}`.toLowerCase().includes(search)) return false;
      return true;
    });
    return { ...result, items: await Promise.all(filtered.map(enrichCounts)) };
  },

  get: (slug: string) => periodRepository.get(slug),

  async create(actor: AdminActor, payload: unknown) {
    const data = periodSchema.parse(payload);
    const ref = getAdminDb().doc(paths.period(data.slug));
    if ((await ref.get()).exists) throw new Error('Slug thời kỳ đã tồn tại.');
    await periodRepository.create(data.slug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'create', entityType: 'period', entityPath: ref.path, entityTitle: data.title, after: data });
    return data.slug;
  },

  async update(actor: AdminActor, slug: string, payload: unknown) {
    const data = periodUpdateSchema.parse(payload);
    const before = await periodRepository.get(slug);
    if (!before) throw new Error('Không tìm thấy thời kỳ.');
    await periodRepository.update(slug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'update', entityType: 'period', entityPath: paths.period(slug), entityTitle: before.title, before, after: data });
  },

  async softDelete(actor: AdminActor, slug: string) {
    const before = await periodRepository.get(slug);
    if (!before) throw new Error('Không tìm thấy thời kỳ.');
    const previousStatus = before.status || 'draft';
    await periodRepository.softDelete(slug, actor.uid, previousStatus);
    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'period', entityPath: paths.period(slug), title: before.title,
      slug, previousStatus, snapshotPreview: { title: before.title, stageCount: before.stageCount ?? null },
    });
    await writeAuditLog({ actor, action: 'soft_delete', entityType: 'period', entityPath: paths.period(slug), entityTitle: before.title, before, after: { status: 'deleted' } });
  },

  async publish(actor: AdminActor, slug: string) {
    const before = await periodRepository.get(slug);
    if (!before) throw new Error('Không tìm thấy thời kỳ.');
    if (!before.coverMediaRef || (!before.summary && !before.description)) {
      throw new Error('Không thể xuất bản: cần ảnh bìa và summary hoặc description.');
    }
    await periodRepository.publish(slug);
    await writeAuditLog({ actor, action: 'publish', entityType: 'period', entityPath: paths.period(slug), entityTitle: before.title, before, after: { status: 'published' } });
  },

  async unpublish(actor: AdminActor, slug: string) {
    const before = await periodRepository.get(slug);
    if (!before) throw new Error('Không tìm thấy thời kỳ.');
    await periodRepository.unpublish(slug);
    await writeAuditLog({ actor, action: 'unpublish', entityType: 'period', entityPath: paths.period(slug), entityTitle: before.title, before, after: { status: 'draft' } });
  },
};
