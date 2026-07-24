import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export interface QualityIssue {
  id: string;
  entityType: 'period' | 'stage' | 'event';
  title: string;
  entityPath: string;
  adminHref: string;
  score: number;
  issues: string[];
}

function scoreEntity(data: Record<string, any>, options: { hasChildren?: boolean; needsVideo?: boolean } = {}) {
  let score = 0;
  const issues: string[] = [];
  if (data.title) score += 10; else issues.push('Thiếu tiêu đề');
  if (data.slug) score += 10; else issues.push('Thiếu đường dẫn định danh');
  if (data.coverMediaRef) score += 20; else issues.push('Thiếu ảnh');
  if (data.summary || data.overview || data.description) score += 20; else issues.push('Thiếu tóm tắt');
  const hasDetails = Boolean(data.details?.length || data.result?.length || data.warCause?.length || data.meaning?.length || data.content?.warSummary?.length);
  if (hasDetails) score += 25; else issues.push('Thiếu nội dung chi tiết');
  if (options.hasChildren) score += 15; else issues.push('Chưa có nội dung liên quan');
  if (options.needsVideo && !(data.videos?.length || data.youtubeId)) issues.push('Thiếu video');
  return { score, issues };
}

export const contentQualityService = {
  async scan(): Promise<QualityIssue[]> {
    const db = getAdminDb();
    const periodSnapshot = await db.collection(paths.periods).orderBy('sortOrder', 'asc').get();
    const issues: QualityIssue[] = [];
    for (const periodDoc of periodSnapshot.docs) {
      const period = periodDoc.data();
      if (period.status === 'deleted') continue;
      const stageSnapshot = await periodDoc.ref.collection('stages').orderBy('sortOrder', 'asc').get();
      const periodScore = scoreEntity(period, { hasChildren: stageSnapshot.size > 0 });
      issues.push({ id: periodDoc.id, entityType: 'period', title: period.title ?? periodDoc.id, entityPath: periodDoc.ref.path, adminHref: `/content/periods/${periodDoc.id}`, ...periodScore });
      for (const stageDoc of stageSnapshot.docs) {
        const stage = stageDoc.data();
        if (stage.status === 'deleted') continue;
        const eventSnapshot = await stageDoc.ref.collection('events').orderBy('sortOrder', 'asc').get();
        const stageScore = scoreEntity(stage, { hasChildren: eventSnapshot.size > 0 });
        issues.push({ id: `${periodDoc.id}/${stageDoc.id}`, entityType: 'stage', title: stage.title ?? stageDoc.id, entityPath: stageDoc.ref.path, adminHref: `/content/periods/${periodDoc.id}/stages/${stageDoc.id}`, ...stageScore });
        eventSnapshot.docs.forEach((eventDoc) => {
          const event = eventDoc.data();
          if (event.status === 'deleted') return;
          const eventScore = scoreEntity(event, { hasChildren: Boolean(event.relatedPersons?.length), needsVideo: true });
          issues.push({ id: `${periodDoc.id}/${stageDoc.id}/${eventDoc.id}`, entityType: 'event', title: event.title ?? eventDoc.id, entityPath: eventDoc.ref.path, adminHref: `/content/periods/${periodDoc.id}/stages/${stageDoc.id}/events/${eventDoc.id}`, ...eventScore });
        });
      }
    }
    return issues.sort((a, b) => a.score - b.score);
  },
};
