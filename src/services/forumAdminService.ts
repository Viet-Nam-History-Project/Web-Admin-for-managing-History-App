import { FieldValue } from 'firebase-admin/firestore';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { getAdminDb } from '@/lib/firebase/admin';

export type ForumReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ForumModerationAction = 'review' | 'dismiss' | 'hide_post';

export interface ForumReportItem {
  id: string;
  path: string;
  postId: string;
  postTitle: string;
  postContent: string;
  postContentSnapshot: string;
  postHidden: boolean;
  reportedUserId: string;
  reportedUserName: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reasonCode: string;
  reasonLabel: string;
  description: string;
  status: ForumReportStatus;
  moderatorNote: string;
  moderatorName: string;
  resolution: string;
  createdAt: string;
  updatedAt: string;
}

type ReportFilters = { status?: string; reason?: string; search?: string; cursor?: string; pageSize?: number };

const VALID_STATUSES = new Set<ForumReportStatus>(['pending', 'reviewing', 'resolved', 'dismissed']);

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'object' && typeof (value as { seconds?: unknown }).seconds === 'number') {
    return new Date(Number((value as { seconds: number }).seconds) * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value: unknown) {
  return toDate(value)?.toISOString() ?? '';
}

function statusCounterUpdate(from: string, to: ForumReportStatus) {
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (from !== to) {
    update[from] = FieldValue.increment(-1);
    update[to] = FieldValue.increment(1);
  }
  return update;
}

export const forumAdminService = {
  async listReports(filters: ReportFilters = {}) {
    const db = getAdminDb();
    const search = filters.search?.trim().toLocaleLowerCase('vi-VN') ?? '';
    const pageSize = Math.min(100, Math.max(10, Number(filters.pageSize) || 25));
    let query: FirebaseFirestore.Query = db.collection('forum_reports');
    if (filters.status && filters.status !== 'all') query = query.where('status', '==', filters.status);
    if (filters.reason && filters.reason !== 'all') query = query.where('reasonCode', '==', filters.reason);
    if (search) query = query.where('searchTokens', 'array-contains', search);
    const filterCount = Number(Boolean(filters.status && filters.status !== 'all'))
      + Number(Boolean(filters.reason && filters.reason !== 'all'))
      + Number(Boolean(search));
    if (filterCount === 0 || filterCount > 1) query = query.orderBy('createdAt', 'desc');

    if (filters.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(filters.cursor, 'base64url').toString('utf8')) as { path?: string };
        if (/^forum_reports\/[^/]+$/.test(cursor.path ?? '')) {
          const cursorSnapshot = await db.doc(cursor.path!).get();
          if (cursorSnapshot.exists) query = query.startAfter(cursorSnapshot);
        }
      } catch {
        // Cursor sai định dạng được bỏ qua an toàn.
      }
    }

    const [snapshot, statsSnapshot] = await Promise.all([
      query.limit(pageSize + 1).get(),
      db.doc('admin_stats/forum_reports').get(),
    ]);
    const hasNextPage = snapshot.size > pageSize;
    const reportDocuments = snapshot.docs.slice(0, pageSize);

    const items = reportDocuments
      .map((document): ForumReportItem => {
        const data = document.data();
        const postId = String(data.postId ?? '');
        const postHidden = data.postHidden === true;
        const storedStatus = VALID_STATUSES.has(data.status) ? data.status : 'pending';
        const status: ForumReportStatus = postHidden ? 'resolved' : storedStatus;
        return {
          id: document.id,
          path: document.ref.path,
          postId,
          postTitle: String(data.postTitle ?? 'Bài viết không có tiêu đề'),
          postContent: String(data.postContentSnapshot ?? ''),
          postContentSnapshot: String(data.postContentSnapshot ?? ''),
          postHidden,
          reportedUserId: String(data.reportedUserId ?? ''),
          reportedUserName: String(data.reportedUserName ?? 'Không rõ'),
          reporterId: String(data.reporterId ?? ''),
          reporterName: String(data.reporterName ?? 'Không rõ'),
          reporterEmail: String(data.reporterEmail ?? ''),
          reasonCode: String(data.reasonCode ?? 'other'),
          reasonLabel: String(data.reasonLabel ?? 'Vi phạm khác'),
          description: String(data.description ?? ''),
          status,
          moderatorNote: String(data.moderatorNote ?? ''),
          moderatorName: String(data.moderatorName ?? ''),
          resolution: String(data.resolution ?? ''),
          createdAt: toIso(data.createdAt),
          updatedAt: toIso(data.updatedAt),
        };
      });
    const last = reportDocuments.at(-1);
    const nextCursor = hasNextPage && last
      ? Buffer.from(JSON.stringify({ path: last.ref.path })).toString('base64url')
      : null;
    const stats = statsSnapshot.data() ?? {};

    return {
      items,
      pageSize,
      hasNextPage,
      nextCursor,
      stats: {
        total: Number(stats.total ?? 0),
        pending: Number(stats.pending ?? 0),
        reviewing: Number(stats.reviewing ?? 0),
        resolved: Number(stats.resolved ?? 0),
        dismissed: Number(stats.dismissed ?? 0),
      },
    };
  },

  async moderate(
    actor: AdminActor,
    reportPath: string,
    action: ForumModerationAction,
    note = '',
  ) {
    if (!/^forum_reports\/[^/]+$/.test(reportPath)) {
      throw new Error('Đường dẫn báo cáo không hợp lệ.');
    }

    const db = getAdminDb();
    const reportRef = db.doc(reportPath);
    const reportSnapshot = await reportRef.get();
    if (!reportSnapshot.exists) throw new Error('Báo cáo không còn tồn tại.');

    const before = reportSnapshot.data() ?? {};
    const postPath = String(before.postPath ?? '');
    if (!/^forum\/[^/]+$/.test(postPath)) throw new Error('Không xác định được bài viết bị báo cáo.');
    const postRef = db.doc(postPath);
    const postSnapshot = await postRef.get();
    if (postSnapshot.data()?.isHidden === true && action !== 'hide_post') {
      throw new Error('Bài viết đã bị ẩn và báo cáo đã được xử lý.');
    }

    const common = {
      moderatorUid: actor.uid,
      moderatorName: actor.displayName || actor.email,
      moderatorEmail: actor.email,
      moderatorNote: note.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let auditAction: 'moderation_review' | 'moderation_dismiss' | 'moderation_hide_content';
    let reportUpdate: Record<string, unknown>;

    if (action === 'review') {
      auditAction = 'moderation_review';
      reportUpdate = { ...common, status: 'reviewing', resolution: 'under_review' };
      const batch = db.batch();
      batch.update(reportRef, reportUpdate);
      batch.set(db.doc('admin_stats/forum_reports'), statusCounterUpdate(String(before.status ?? 'pending'), 'reviewing'), { merge: true });
      await batch.commit();
    } else if (action === 'dismiss') {
      auditAction = 'moderation_dismiss';
      reportUpdate = { ...common, status: 'dismissed', resolution: 'no_violation', resolvedAt: FieldValue.serverTimestamp() };
      const batch = db.batch();
      batch.update(reportRef, reportUpdate);
      batch.set(db.doc('admin_stats/forum_reports'), statusCounterUpdate(String(before.status ?? 'pending'), 'dismissed'), { merge: true });
      await batch.commit();
    } else {
      auditAction = 'moderation_hide_content';
      reportUpdate = { ...common, status: 'resolved', resolution: 'content_hidden', resolvedAt: FieldValue.serverTimestamp() };
      const batch = db.batch();
      batch.update(reportRef, reportUpdate);
      batch.update(postRef, {
        isHidden: true,
        moderationStatus: 'removed',
        hiddenAt: FieldValue.serverTimestamp(),
        hiddenByUid: actor.uid,
        hiddenByName: actor.displayName || actor.email,
      });
      batch.set(db.doc('admin_stats/forum_reports'), statusCounterUpdate(String(before.status ?? 'pending'), 'resolved'), { merge: true });
      await batch.commit();
    }

    await writeAuditLog({
      actor,
      action: auditAction,
      entityType: 'forum_report',
      entityPath: reportPath,
      entityTitle: String(before.postTitle ?? before.postId ?? reportRef.id),
      before,
      after: { action, note: note.trim(), status: reportUpdate.status, resolution: reportUpdate.resolution },
    });

    return { ok: true };
  },
};
