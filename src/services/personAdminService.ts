import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import {
  PersonEventPayload,
  PersonPayload,
  PersonPeriodPayload,
  personEventSchema,
  personEventUpdateSchema,
  personPeriodSchema,
  personPeriodUpdateSchema,
  personSchema,
  personUpdateSchema,
} from '@/lib/validation/contentSchemas';
import { createCollectionRepository } from '@/services/baseRepository';
import { prepareFirestoreContent } from '@/services/contentMutationHelpers';
import { trashAdminService } from '@/services/trashAdminService';

export interface AdminPersonPeriod extends PersonPeriodPayload {
  id: string;
  personCount?: number;
  eventCount?: number;
  updatedAt?: unknown;
  updated_at?: unknown;
}

export interface AdminPerson extends PersonPayload {
  id: string;
  eventCount?: number;
  birth_year?: string;
  death_year?: string;
  updatedAt?: unknown;
  updated_at?: unknown;
}

export interface AdminPersonEvent extends PersonEventPayload {
  id: string;
  updatedAt?: unknown;
  updated_at?: unknown;
}

export interface HistoricalEventOption {
  eventRef: string;
  periodSlug: string;
  periodTitle: string;
  stageSlug: string;
  stageTitle: string;
  eventSlug: string;
  eventTitle: string;
}

export const personPeriodRepository = createCollectionRepository<AdminPersonPeriod>(paths.personPeriods);
export const personRepository = (periodSlug: string) => createCollectionRepository<AdminPerson>(paths.persons(periodSlug));
export const personEventRepository = (periodSlug: string, personSlug: string) =>
  createCollectionRepository<AdminPersonEvent>(paths.personEvents(periodSlug, personSlug));

function legacyDateFields(data: Partial<PersonPayload>) {
  const result: Record<string, unknown> = { ...data };
  if (Object.prototype.hasOwnProperty.call(data, 'birthDate')) result.birth_year = data.birthDate ?? '';
  if (Object.prototype.hasOwnProperty.call(data, 'deathDate')) result.death_year = data.deathDate ?? '';
  return result;
}

async function validateHistoricalEventRef(eventRef: string) {
  const event = await getAdminDb().doc(eventRef).get();
  if (!event.exists || event.data()?.status === 'deleted') {
    throw new Error('Sự kiện lịch sử được liên kết không tồn tại hoặc đã bị xóa.');
  }
}

async function enrichPerson(periodSlug: string, person: AdminPerson) {
  const count = await getAdminDb().collection(paths.personEvents(periodSlug, person.id)).count().get();
  return { ...person, eventCount: count.data().count };
}

export const personAdminService = {
  async listPeriods(includeDeleted = false) {
    const result = await personPeriodRepository.list({ orderBy: 'sortOrder', direction: 'asc', includeDeleted, limit: 250 });
    const items = await Promise.all(result.items.map(async (period) => {
      const persons = await getAdminDb().collection(paths.persons(period.id)).get();
      const eventCounts = await Promise.all(persons.docs.map((person) => person.ref.collection('events').count().get()));
      return {
        ...period,
        personCount: persons.docs.filter((person) => person.data().status !== 'deleted').length,
        eventCount: eventCounts.reduce((sum, snapshot) => sum + snapshot.data().count, 0),
      };
    }));
    return { ...result, items };
  },

  getPeriod: (periodSlug: string) => personPeriodRepository.get(periodSlug),

  async createPeriod(actor: AdminActor, payload: unknown) {
    const data = personPeriodSchema.parse(payload);
    if (await personPeriodRepository.get(data.slug)) throw new Error('Slug nhóm nhân vật đã tồn tại.');
    await personPeriodRepository.create(data.slug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'create', entityType: 'person_period', entityPath: `${paths.personPeriods}/${data.slug}`, entityTitle: data.title, after: data });
    return data.slug;
  },

  async updatePeriod(actor: AdminActor, periodSlug: string, payload: unknown) {
    const data = personPeriodUpdateSchema.parse(payload);
    const before = await this.getPeriod(periodSlug);
    if (!before) throw new Error('Không tìm thấy nhóm nhân vật.');
    await personPeriodRepository.update(periodSlug, prepareFirestoreContent(data));
    await writeAuditLog({ actor, action: 'update', entityType: 'person_period', entityPath: `${paths.personPeriods}/${periodSlug}`, entityTitle: before.title, before, after: data });
  },

  async softDeletePeriod(actor: AdminActor, periodSlug: string) {
    const before = await this.getPeriod(periodSlug);
    if (!before) throw new Error('Không tìm thấy nhóm nhân vật.');
    const previousStatus = before.status || 'draft';
    await personPeriodRepository.softDelete(periodSlug, actor.uid, previousStatus);
    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'person_period', entityPath: `${paths.personPeriods}/${periodSlug}`, title: before.title,
      slug: periodSlug, previousStatus, snapshotPreview: { title: before.title, personCount: before.personCount ?? 0 },
    });
    await writeAuditLog({ actor, action: 'soft_delete', entityType: 'person_period', entityPath: `${paths.personPeriods}/${periodSlug}`, entityTitle: before.title, before, after: { status: 'deleted' } });
  },

  async publishPeriod(actor: AdminActor, periodSlug: string) {
    const before = await this.getPeriod(periodSlug);
    if (!before) throw new Error('Không tìm thấy nhóm nhân vật.');
    if (!before.coverMediaRef) throw new Error('Không thể xuất bản: nhóm nhân vật cần có ảnh bìa.');
    await personPeriodRepository.publish(periodSlug);
    await writeAuditLog({ actor, action: 'publish', entityType: 'person_period', entityPath: `${paths.personPeriods}/${periodSlug}`, entityTitle: before.title, before, after: { status: 'published' } });
  },

  async unpublishPeriod(actor: AdminActor, periodSlug: string) {
    const before = await this.getPeriod(periodSlug);
    if (!before) throw new Error('Không tìm thấy nhóm nhân vật.');
    await personPeriodRepository.unpublish(periodSlug);
    await writeAuditLog({ actor, action: 'unpublish', entityType: 'person_period', entityPath: `${paths.personPeriods}/${periodSlug}`, entityTitle: before.title, before, after: { status: 'draft' } });
  },

  async listPersons(periodSlug: string, includeDeleted = false) {
    const result = await personRepository(periodSlug).list({ orderBy: 'sortOrder', direction: 'asc', includeDeleted, limit: 400 });
    return { ...result, items: await Promise.all(result.items.map((person) => enrichPerson(periodSlug, person))) };
  },

  getPerson: (periodSlug: string, personSlug: string) => personRepository(periodSlug).get(personSlug),

  async createPerson(actor: AdminActor, periodSlug: string, payload: unknown) {
    const data = personSchema.parse(payload);
    if (!await this.getPeriod(periodSlug)) throw new Error('Không tìm thấy nhóm nhân vật.');
    if (await this.getPerson(periodSlug, data.slug)) throw new Error('Slug nhân vật đã tồn tại trong nhóm này.');
    await personRepository(periodSlug).create(data.slug, legacyDateFields(data));
    await writeAuditLog({ actor, action: 'create', entityType: 'person', entityPath: paths.person(periodSlug, data.slug), entityTitle: data.name, after: data });
    return data.slug;
  },

  async updatePerson(actor: AdminActor, periodSlug: string, personSlug: string, payload: unknown) {
    const data = personUpdateSchema.parse(payload);
    const before = await this.getPerson(periodSlug, personSlug);
    if (!before) throw new Error('Không tìm thấy nhân vật.');
    await personRepository(periodSlug).update(personSlug, legacyDateFields(data));
    await writeAuditLog({ actor, action: 'update', entityType: 'person', entityPath: paths.person(periodSlug, personSlug), entityTitle: before.name, before, after: data });
  },

  async softDeletePerson(actor: AdminActor, periodSlug: string, personSlug: string) {
    const before = await this.getPerson(periodSlug, personSlug);
    if (!before) throw new Error('Không tìm thấy nhân vật.');
    const previousStatus = before.status || 'draft';
    await personRepository(periodSlug).softDelete(personSlug, actor.uid, previousStatus);
    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'person', entityPath: paths.person(periodSlug, personSlug), parentPath: `${paths.personPeriods}/${periodSlug}`,
      title: before.name, slug: personSlug, previousStatus, snapshotPreview: { name: before.name, periodSlug },
    });
    await writeAuditLog({ actor, action: 'soft_delete', entityType: 'person', entityPath: paths.person(periodSlug, personSlug), entityTitle: before.name, before, after: { status: 'deleted' } });
  },

  async publishPerson(actor: AdminActor, periodSlug: string, personSlug: string) {
    const before = await this.getPerson(periodSlug, personSlug);
    if (!before) throw new Error('Không tìm thấy nhân vật.');
    if (!before.coverMediaRef || !before.overview) throw new Error('Không thể xuất bản: nhân vật cần ảnh thumbnail và overview.');
    await personRepository(periodSlug).publish(personSlug);
    await writeAuditLog({ actor, action: 'publish', entityType: 'person', entityPath: paths.person(periodSlug, personSlug), entityTitle: before.name, before, after: { status: 'published' } });
  },

  async unpublishPerson(actor: AdminActor, periodSlug: string, personSlug: string) {
    const before = await this.getPerson(periodSlug, personSlug);
    if (!before) throw new Error('Không tìm thấy nhân vật.');
    await personRepository(periodSlug).unpublish(personSlug);
    await writeAuditLog({ actor, action: 'unpublish', entityType: 'person', entityPath: paths.person(periodSlug, personSlug), entityTitle: before.name, before, after: { status: 'draft' } });
  },

  listPersonEvents: (periodSlug: string, personSlug: string, includeDeleted = false) =>
    personEventRepository(periodSlug, personSlug).list({ orderBy: 'sortOrder', direction: 'asc', includeDeleted, limit: 400 }),

  getPersonEvent: (periodSlug: string, personSlug: string, eventSlug: string) =>
    personEventRepository(periodSlug, personSlug).get(eventSlug),

  async createPersonEvent(actor: AdminActor, periodSlug: string, personSlug: string, payload: unknown) {
    const data = personEventSchema.parse(payload);
    if (!await this.getPerson(periodSlug, personSlug)) throw new Error('Không tìm thấy nhân vật.');
    if (await this.getPersonEvent(periodSlug, personSlug, data.slug)) throw new Error('Slug sự kiện đã tồn tại cho nhân vật này.');
    await validateHistoricalEventRef(data.eventRef);
    await personEventRepository(periodSlug, personSlug).create(data.slug, data);
    await writeAuditLog({ actor, action: 'create', entityType: 'person_event', entityPath: paths.personEvent(periodSlug, personSlug, data.slug), entityTitle: data.title, after: data });
    return data.slug;
  },

  async updatePersonEvent(actor: AdminActor, periodSlug: string, personSlug: string, eventSlug: string, payload: unknown) {
    const data = personEventUpdateSchema.parse(payload);
    const before = await this.getPersonEvent(periodSlug, personSlug, eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện nhân vật.');
    if (data.eventRef) await validateHistoricalEventRef(data.eventRef);
    await personEventRepository(periodSlug, personSlug).update(eventSlug, data);
    await writeAuditLog({ actor, action: 'update', entityType: 'person_event', entityPath: paths.personEvent(periodSlug, personSlug, eventSlug), entityTitle: before.title, before, after: data });
  },

  async softDeletePersonEvent(actor: AdminActor, periodSlug: string, personSlug: string, eventSlug: string) {
    const before = await this.getPersonEvent(periodSlug, personSlug, eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện nhân vật.');
    const previousStatus = before.status || 'draft';
    await personEventRepository(periodSlug, personSlug).softDelete(eventSlug, actor.uid, previousStatus);
    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'person_event', entityPath: paths.personEvent(periodSlug, personSlug, eventSlug), parentPath: paths.person(periodSlug, personSlug),
      title: before.title, slug: eventSlug, previousStatus, snapshotPreview: { title: before.title, periodSlug, personSlug },
    });
    await writeAuditLog({ actor, action: 'soft_delete', entityType: 'person_event', entityPath: paths.personEvent(periodSlug, personSlug, eventSlug), entityTitle: before.title, before, after: { status: 'deleted' } });
  },

  async publishPersonEvent(actor: AdminActor, periodSlug: string, personSlug: string, eventSlug: string) {
    const before = await this.getPersonEvent(periodSlug, personSlug, eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện nhân vật.');
    if (!before.coverMediaRef || (!before.overview && !before.role && !before.description)) {
      throw new Error('Không thể xuất bản: sự kiện nhân vật cần ảnh và nội dung mô tả.');
    }
    await validateHistoricalEventRef(before.eventRef);
    await personEventRepository(periodSlug, personSlug).publish(eventSlug);
    await writeAuditLog({ actor, action: 'publish', entityType: 'person_event', entityPath: paths.personEvent(periodSlug, personSlug, eventSlug), entityTitle: before.title, before, after: { status: 'published' } });
  },

  async unpublishPersonEvent(actor: AdminActor, periodSlug: string, personSlug: string, eventSlug: string) {
    const before = await this.getPersonEvent(periodSlug, personSlug, eventSlug);
    if (!before) throw new Error('Không tìm thấy sự kiện nhân vật.');
    await personEventRepository(periodSlug, personSlug).unpublish(eventSlug);
    await writeAuditLog({ actor, action: 'unpublish', entityType: 'person_event', entityPath: paths.personEvent(periodSlug, personSlug, eventSlug), entityTitle: before.title, before, after: { status: 'draft' } });
  },

  async listHistoricalEventOptions(): Promise<HistoricalEventOption[]> {
    const periodSnapshot = await getAdminDb().collection(paths.periods).orderBy('sortOrder', 'asc').limit(250).get();
    const options: HistoricalEventOption[] = [];
    for (const periodDoc of periodSnapshot.docs) {
      if (periodDoc.data().status === 'deleted') continue;
      const stages = await periodDoc.ref.collection('stages').orderBy('sortOrder', 'asc').limit(400).get();
      for (const stageDoc of stages.docs) {
        if (stageDoc.data().status === 'deleted') continue;
        const events = await stageDoc.ref.collection('events').orderBy('sortOrder', 'asc').limit(600).get();
        events.docs.forEach((eventDoc) => {
          if (eventDoc.data().status === 'deleted') return;
          options.push({
            eventRef: eventDoc.ref.path, periodSlug: periodDoc.id, periodTitle: periodDoc.data().title ?? periodDoc.id,
            stageSlug: stageDoc.id, stageTitle: stageDoc.data().title ?? stageDoc.id,
            eventSlug: eventDoc.id, eventTitle: eventDoc.data().title ?? eventDoc.id,
          });
        });
      }
    }
    return options;
  },
};
