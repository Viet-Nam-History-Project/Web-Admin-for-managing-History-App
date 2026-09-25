import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { trashAdminService } from '@/services/trashAdminService';
import {
  TimelineEraPayload,
  TimelineEvent,
  timelineEraSchema,
  timelineEraUpdateSchema,
  timelineEventSchema,
  timelineEventsBatchSchema,
} from '@/lib/validation/timelineSchemas';

export const TIMELINE_ERAS_COLLECTION = 'games/timelinepuzzle/eras';

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'object' && value && '_seconds' in value) {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') return value;
  return null;
}

export interface AdminTimelineEra extends TimelineEraPayload {
  id: string;
  name?: string;
  shortDesc?: string;
  thumbnailUrl?: string;
  eventCount: number;
  updated_at?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const erasColRef = () => getAdminDb().collection(TIMELINE_ERAS_COLLECTION);

function normalizeEraDoc(id: string, data: Record<string, unknown>): AdminTimelineEra {
  const title = String(data.title ?? data.name ?? id);
  const description = String(data.description ?? data.shortDesc ?? '');
  const coverMediaRef = String(data.coverMediaRef ?? data.thumbnailUrl ?? '');
  const events = Array.isArray(data.events)
    ? (data.events as Record<string, unknown>[]).map((e) => ({
        order: Number(e.order ?? 1),
        year: Number(e.year ?? 0),
        name: String(e.name ?? ''),
        desc: String(e.desc ?? ''),
        zone: String(e.zone ?? ''),
      }))
    : [];

  events.sort((a, b) => a.order - b.order || a.year - b.year);

  return {
    id,
    eraId: String(data.eraId ?? id),
    title,
    name: String(data.name ?? title),
    description,
    shortDesc: String(data.shortDesc ?? description),
    coverMediaRef,
    thumbnailUrl: String(data.thumbnailUrl ?? coverMediaRef),
    status: (data.status as AdminTimelineEra['status']) || 'published',
    sortOrder: Number(data.sortOrder ?? 0),
    events,
    eventCount: events.length,
    updated_at: toIsoDate(data.updated_at),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

export const timelineAdminService = {
  async listEras(includeDeleted = false): Promise<{ items: AdminTimelineEra[] }> {
    const snap = await erasColRef().get();
    const items: AdminTimelineEra[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (!includeDeleted && data.status === 'deleted') continue;
      items.push(normalizeEraDoc(doc.id, data));
    }

    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title));
    return { items };
  },

  async getEra(eraId: string): Promise<AdminTimelineEra | null> {
    const doc = await erasColRef().doc(eraId).get();
    if (!doc.exists) return null;
    return normalizeEraDoc(doc.id, doc.data() as Record<string, unknown>);
  },

  async createEra(actor: AdminActor, rawPayload: unknown): Promise<string> {
    const data = timelineEraSchema.parse(rawPayload);
    const docRef = erasColRef().doc(data.eraId);
    const existing = await docRef.get();
    if (existing.exists) throw new Error(`Kỷ nguyên với mã '${data.eraId}' đã tồn tại.`);

    // Lưu song song cả 2 chuẩn field để app mobile luôn đọc được
    const record = {
      eraId: data.eraId,
      title: data.title,
      name: data.title,
      description: data.description || '',
      shortDesc: data.description || '',
      coverMediaRef: data.coverMediaRef || '',
      thumbnailUrl: data.coverMediaRef || '',
      status: data.status || 'published',
      sortOrder: Number(data.sortOrder || 0),
      events: data.events || [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    await docRef.set(record);
    await writeAuditLog({
      actor,
      action: 'create',
      entityType: 'timeline_era',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${data.eraId}`,
      entityTitle: data.title,
      after: record,
    });

    return data.eraId;
  },

  async updateEra(actor: AdminActor, eraId: string, rawPayload: unknown) {
    const data = timelineEraUpdateSchema.parse(rawPayload);
    const docRef = erasColRef().doc(eraId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy kỷ nguyên để cập nhật.');

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    if (data.title !== undefined) updateData.name = data.title;
    if (data.description !== undefined) updateData.shortDesc = data.description;
    if (data.coverMediaRef !== undefined) updateData.thumbnailUrl = data.coverMediaRef;

    await docRef.set(updateData, { merge: true });
    await writeAuditLog({
      actor,
      action: 'update',
      entityType: 'timeline_era',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}`,
      entityTitle: data.title || String(before.data()?.title || before.data()?.name || eraId),
      before: before.data(),
      after: updateData,
    });
  },

  async publishEra(actor: AdminActor, eraId: string) {
    await this.updateEra(actor, eraId, { status: 'published' });
  },

  async unpublishEra(actor: AdminActor, eraId: string) {
    await this.updateEra(actor, eraId, { status: 'draft' });
  },

  async deleteEra(actor: AdminActor, eraId: string) {
    const docRef = erasColRef().doc(eraId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy kỷ nguyên để xóa.');

    const data = before.data() || {};
    const previousStatus = String(data.status || 'published');

    await docRef.set(
      {
        status: 'deleted',
        previousStatus,
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'timeline_era',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}`,
      title: String(data.title || data.name || eraId),
      slug: eraId,
      previousStatus,
      snapshotPreview: data,
    });

    await writeAuditLog({
      actor,
      action: 'soft_delete',
      entityType: 'timeline_era',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}`,
      entityTitle: String(data.title || data.name || eraId),
      before: data,
      after: { status: 'deleted' },
    });
  },

  async addEvent(actor: AdminActor, eraId: string, rawEvent: unknown): Promise<TimelineEvent[]> {
    const newEvent = timelineEventSchema.parse(rawEvent);
    const docRef = erasColRef().doc(eraId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy kỷ nguyên để thêm sự kiện.');

    const currentData = before.data() || {};
    const currentEvents: TimelineEvent[] = Array.isArray(currentData.events)
      ? [...currentData.events]
      : [];

    currentEvents.push(newEvent);
    currentEvents.sort((a, b) => a.order - b.order || a.year - b.year);

    await docRef.set(
      {
        events: currentEvents,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await writeAuditLog({
      actor,
      action: 'create',
      entityType: 'timeline_event',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}/events/${newEvent.order}`,
      entityTitle: newEvent.name,
      after: newEvent,
    });

    return currentEvents;
  },

  async updateEvent(
    actor: AdminActor,
    eraId: string,
    eventIndex: number,
    rawEvent: unknown,
  ): Promise<TimelineEvent[]> {
    const updatedEvent = timelineEventSchema.parse(rawEvent);
    const docRef = erasColRef().doc(eraId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy kỷ nguyên để sửa sự kiện.');

    const currentData = before.data() || {};
    const currentEvents: TimelineEvent[] = Array.isArray(currentData.events)
      ? [...currentData.events]
      : [];

    if (eventIndex < 0 || eventIndex >= currentEvents.length) {
      throw new Error('Chỉ số sự kiện không tồn tại.');
    }

    const previous = currentEvents[eventIndex];
    currentEvents[eventIndex] = updatedEvent;
    currentEvents.sort((a, b) => a.order - b.order || a.year - b.year);

    await docRef.set(
      {
        events: currentEvents,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await writeAuditLog({
      actor,
      action: 'update',
      entityType: 'timeline_event',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}/events/${eventIndex}`,
      entityTitle: updatedEvent.name,
      before: previous,
      after: updatedEvent,
    });

    return currentEvents;
  },

  async deleteEvent(actor: AdminActor, eraId: string, eventIndex: number): Promise<TimelineEvent[]> {
    const docRef = erasColRef().doc(eraId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy kỷ nguyên để xóa sự kiện.');

    const currentData = before.data() || {};
    const currentEvents: TimelineEvent[] = Array.isArray(currentData.events)
      ? [...currentData.events]
      : [];

    if (eventIndex < 0 || eventIndex >= currentEvents.length) {
      throw new Error('Chỉ số sự kiện không tồn tại.');
    }

    const removed = currentEvents.splice(eventIndex, 1)[0];

    // Re-index remaining events orders cleanly
    currentEvents.forEach((ev, idx) => {
      ev.order = idx + 1;
    });

    await docRef.set(
      {
        events: currentEvents,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await writeAuditLog({
      actor,
      action: 'permanent_delete',
      entityType: 'timeline_event',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}/events/${eventIndex}`,
      entityTitle: removed.name,
      before: removed,
      after: { deleted: true },
    });

    return currentEvents;
  },

  async batchImportEvents(
    actor: AdminActor,
    eraId: string,
    rawEvents: unknown,
    replaceExisting = false,
  ): Promise<TimelineEvent[]> {
    const newEvents = timelineEventsBatchSchema.parse(rawEvents);
    const docRef = erasColRef().doc(eraId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy kỷ nguyên để import sự kiện.');

    const currentData = before.data() || {};
    let finalEvents: TimelineEvent[] = replaceExisting
      ? []
      : Array.isArray(currentData.events)
        ? [...currentData.events]
        : [];

    finalEvents.push(...newEvents);
    finalEvents.sort((a, b) => a.year - b.year || a.order - b.order);

    // Clean order numbers from 1..N
    finalEvents = finalEvents.map((e, idx) => ({ ...e, order: idx + 1 }));

    await docRef.set(
      {
        events: finalEvents,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await writeAuditLog({
      actor,
      action: 'import',
      entityType: 'timeline_event',
      entityPath: `${TIMELINE_ERAS_COLLECTION}/${eraId}/events`,
      entityTitle: `Import ${newEvents.length} sự kiện dòng thời gian`,
      after: { count: finalEvents.length },
    });

    return finalEvents;
  },
};
