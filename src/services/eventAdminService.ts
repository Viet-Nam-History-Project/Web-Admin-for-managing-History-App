import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { paths } from '@/lib/firebase/firestorePaths';
import { eventSchema, eventUpdateSchema, EventPayload } from '@/lib/validation/contentSchemas';
import { createCollectionRepository } from '@/services/baseRepository';
import { prepareFirestoreContent } from '@/services/contentMutationHelpers';
import { trashAdminService } from '@/services/trashAdminService';
import { stageAdminService } from '@/services/stageAdminService';

export interface AdminEvent extends EventPayload {
  id: string;
  periodSlug?: string;
  stageSlug?: string;
  stageTitle?: string;
  updatedAt?: unknown;
  updated_at?: unknown;
}

export function eventRepository(periodSlug: string, stageSlug: string) {
  return createCollectionRepository<AdminEvent>(paths.events(periodSlug, stageSlug));
}

export const eventAdminService = {
  list: (periodSlug: string, stageSlug: string, includeDeleted = false) =>
    eventRepository(periodSlug, stageSlug).list({ orderBy: 'sortOrder', direction: 'asc', includeDeleted, limit: 400 }),

  async listAllInPeriod(periodSlug: string) {
    const stages = (await stageAdminService.list(periodSlug)).items;
    const groups = await Promise.all(stages.map(async (stage) => {
      const events = (await this.list(periodSlug, stage.id)).items;
      return events.map((event) => ({ ...event, periodSlug, stageSlug: stage.id, stageTitle: stage.title }));
    }));
    return groups.flat().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  get: (periodSlug: string, stageSlug: string, eventSlug: string) =>
    eventRepository(periodSlug, stageSlug).get(eventSlug),

  async create(actor: AdminActor, periodSlug: string, stageSlug: string, payload: unknown) {
    const data = eventSchema.parse(payload);
    if (await eventRepository(periodSlug, stageSlug).get(data.slug)) throw new Error('Slug sự kiện đã tồn tại trong giai đoạn này.');
    await eventRepository(periodSlug, stageSlug).create(data.slug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'create', entityType: 'event', entityPath: paths.event(periodSlug, stageSlug, data.slug), entityTitle: data.title, after: data });
    return data.slug;
  },

  async update(actor: AdminActor, periodSlug: string, stageSlug: string, eventSlug: string, payload: unknown) {
    const data = eventUpdateSchema.parse(payload);
    const before = await eventRepository(periodSlug, stageSlug).get(eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện.');
    await eventRepository(periodSlug, stageSlug).update(eventSlug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'update', entityType: 'event', entityPath: paths.event(periodSlug, stageSlug, eventSlug), entityTitle: before.title, before, after: data });
  },

  async softDelete(actor: AdminActor, periodSlug: string, stageSlug: string, eventSlug: string) {
    const before = await eventRepository(periodSlug, stageSlug).get(eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện.');
    const previousStatus = before.status || 'draft';
    await eventRepository(periodSlug, stageSlug).softDelete(eventSlug, actor.uid, previousStatus);
    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'event', entityPath: paths.event(periodSlug, stageSlug, eventSlug), parentPath: paths.stage(periodSlug, stageSlug),
      title: before.title, slug: eventSlug, previousStatus, snapshotPreview: { title: before.title, periodSlug, stageSlug },
    });
    await writeAuditLog({ actor, action: 'soft_delete', entityType: 'event', entityPath: paths.event(periodSlug, stageSlug, eventSlug), entityTitle: before.title, before, after: { status: 'deleted' } });
  },

  async publish(actor: AdminActor, periodSlug: string, stageSlug: string, eventSlug: string) {
    const before = await eventRepository(periodSlug, stageSlug).get(eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện.');
    const hasContent = Boolean(before.warCause?.length || before.details?.length || before.meaning?.length || before.content?.warSummary?.length || before.content?.result?.vn?.length || before.content?.result?.usAllies?.length);
    if (!before.summary || !before.coverMediaRef || !hasContent) {
      throw new Error('Không thể xuất bản: sự kiện cần summary, ảnh bìa và ít nhất một phần nội dung.');
    }
    await eventRepository(periodSlug, stageSlug).publish(eventSlug);
    await writeAuditLog({ actor, action: 'publish', entityType: 'event', entityPath: paths.event(periodSlug, stageSlug, eventSlug), entityTitle: before.title, before, after: { status: 'published' } });
  },

  async unpublish(actor: AdminActor, periodSlug: string, stageSlug: string, eventSlug: string) {
    const before = await eventRepository(periodSlug, stageSlug).get(eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện.');
    await eventRepository(periodSlug, stageSlug).unpublish(eventSlug);
    await writeAuditLog({ actor, action: 'unpublish', entityType: 'event', entityPath: paths.event(periodSlug, stageSlug, eventSlug), entityTitle: before.title, before, after: { status: 'draft' } });
  },
};
