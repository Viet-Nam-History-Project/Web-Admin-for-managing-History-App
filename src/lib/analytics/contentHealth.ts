import type { Firestore } from 'firebase-admin/firestore';

export const CONTENT_HEALTH_VERSION = 2;

export type ContentHealth = {
  version: number;
  missingImage: number;
  missingVideo: number;
  draftContent: number;
  imageBreakdown: Record<'periods' | 'stages' | 'events' | 'personGroups' | 'persons' | 'personEvents', number>;
  inspectedContent: number;
};

const emptyBreakdown = (): ContentHealth['imageBreakdown'] => ({
  periods: 0,
  stages: 0,
  events: 0,
  personGroups: 0,
  persons: 0,
  personEvents: 0,
});

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** An event may use images[] instead of coverMediaRef. */
function hasImage(data: Record<string, unknown>) {
  if (hasText(data.coverMediaRef)) return true;
  if (!Array.isArray(data.images)) return false;
  return data.images.some((image) => {
    if (!image || typeof image !== 'object') return false;
    const item = image as Record<string, unknown>;
    return hasText(item.link) || hasText(item.url);
  });
}

function hasVideo(data: Record<string, unknown>) {
  return hasText(data.youtubeId)
    || (Array.isArray(data.videos) && data.videos.some((video) => {
      if (hasText(video)) return true;
      return Boolean(video && typeof video === 'object' && (hasText((video as Record<string, unknown>).link) || hasText((video as Record<string, unknown>).url)));
    }));
}

function isDeleted(data: Record<string, unknown>) {
  return data.status === 'deleted';
}

/**
 * Counts media fields that are actually usable by the app. Deleted content is
 * deliberately excluded: its media should not turn the live-content health red.
 */
export async function collectContentHealth(db: Firestore): Promise<ContentHealth> {
  const imageBreakdown = emptyBreakdown();
  let missingVideo = 0;
  let draftContent = 0;
  let inspectedContent = 0;

  const inspect = (data: Record<string, unknown>, kind: keyof ContentHealth['imageBreakdown'], options: { requireVideo?: boolean } = {}) => {
    if (isDeleted(data)) return false;
    inspectedContent += 1;
    if (data.status === 'draft') draftContent += 1;
    if (!hasImage(data)) imageBreakdown[kind] += 1;
    if (options.requireVideo && !hasVideo(data)) missingVideo += 1;
    return true;
  };

  const [periodSnapshot, personGroupSnapshot] = await Promise.all([
    db.collection('periods').get(),
    db.collection('periods_person').get(),
  ]);

  for (const periodDoc of periodSnapshot.docs) {
    const period = periodDoc.data();
    if (!inspect(period, 'periods')) continue;
    const stages = await periodDoc.ref.collection('stages').get();
    for (const stageDoc of stages.docs) {
      const stage = stageDoc.data();
      if (!inspect(stage, 'stages')) continue;
      const events = await stageDoc.ref.collection('events').get();
      events.docs.forEach((eventDoc) => inspect(eventDoc.data(), 'events', { requireVideo: true }));
    }
  }

  for (const groupDoc of personGroupSnapshot.docs) {
    const group = groupDoc.data();
    if (!inspect(group, 'personGroups')) continue;
    const persons = await groupDoc.ref.collection('persons').get();
    for (const personDoc of persons.docs) {
      const person = personDoc.data();
      if (!inspect(person, 'persons')) continue;
      const events = await personDoc.ref.collection('events').get();
      events.docs.forEach((eventDoc) => inspect(eventDoc.data(), 'personEvents'));
    }
  }

  return {
    version: CONTENT_HEALTH_VERSION,
    missingImage: Object.values(imageBreakdown).reduce((total, value) => total + value, 0),
    missingVideo,
    draftContent,
    imageBreakdown,
    inspectedContent,
  };
}
