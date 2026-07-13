import { paths, canonicalId } from '@/lib/firebase/firestorePaths';
import { graphRepository } from '@/lib/graph/graphRepository';

type SyncEntity = {
  slug?: string;
  id?: string;
  title?: string;
  status?: string;
  updatedAt?: unknown;
};

function getSlug(entity: SyncEntity) {
  return entity.slug ?? entity.id ?? '';
}

export const graphSyncService = {
  async syncPeriod(periodSlug: string, data: SyncEntity) {
    const firestorePath = paths.period(periodSlug);
    await graphRepository.upsertPeriod({
      canonicalId: canonicalId('Period', firestorePath),
      firestorePath,
      slug: getSlug(data) || periodSlug,
      title: data.title ?? periodSlug,
      status: data.status,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
      metadata: data as Record<string, unknown>,
    });
  },
  async syncStage(periodSlug: string, stageSlug: string, data: SyncEntity) {
    const firestorePath = paths.stage(periodSlug, stageSlug);
    await graphRepository.upsertStage({
      canonicalId: canonicalId('Stage', firestorePath),
      firestorePath,
      slug: getSlug(data) || stageSlug,
      title: data.title ?? stageSlug,
      status: data.status,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
      metadata: data as Record<string, unknown>,
    });
    await graphRepository.createRelationship(
      canonicalId('Period', paths.period(periodSlug)),
      canonicalId('Stage', firestorePath),
      'HAS_STAGE',
    );
  },
  async syncEvent(periodSlug: string, stageSlug: string, eventSlug: string, data: SyncEntity) {
    const firestorePath = paths.event(periodSlug, stageSlug, eventSlug);
    await graphRepository.upsertEvent({
      canonicalId: canonicalId('Event', firestorePath),
      firestorePath,
      slug: getSlug(data) || eventSlug,
      title: data.title ?? eventSlug,
      status: data.status,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
      metadata: data as Record<string, unknown>,
    });
    await graphRepository.createRelationship(
      canonicalId('Stage', paths.stage(periodSlug, stageSlug)),
      canonicalId('Event', firestorePath),
      'HAS_EVENT',
    );
    await graphRepository.createRelationship(
      canonicalId('Event', firestorePath),
      canonicalId('Period', paths.period(periodSlug)),
      'BELONGS_TO_PERIOD',
    );
  },
};
