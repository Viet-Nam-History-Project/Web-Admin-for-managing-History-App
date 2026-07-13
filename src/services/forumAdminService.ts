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

type ReportFilters = { status?: string; reason?: string; search?: string };

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

export const forumAdminService = {
  async listReports(filters: ReportFilters = {}) {
    const db = getAdminDb();
    const snapshot = await db.collectionGroup('reports').get();
    const search = filters.search?.trim().toLocaleLowerCase('vi-VN') ?? '';
    const reportDocuments = snapshot.docs.filter((document) => /^forum\/[^/]+\/reports\/[^/]+$/.test(document.ref.path));
    const postIds = [...new Set(reportDocuments.map((document) => String(document.data().postId ?? document.ref.parent.parent?.id ?? '')).filter(Boolean))];
    const postSnapshots = postIds.length
      ? await db.getAll(...postIds.map((postId) => db.doc(`forum/${postId}`)))
      : [];
    const postsById = new Map(postSnapshots.map((document) => [document.id, document.data()]));

    const allItems = reportDocuments
      .map((document): ForumReportItem => {
        const data = document.data();
        const postId = String(data.postId ?? document.ref.parent.parent?.id ?? '');
        const post = postsById.get(postId);
        const postHidden = post?.isHidden === true;
        const storedStatus = VALID_STATUSES.has(data.status) ? data.status : 'pending';
        const status: ForumReportStatus = postHidden ? 'resolved' : storedStatus;
        return {
          id: document.id,
          path: document.ref.path,
          postId,
          postTitle: String(post?.title ?? data.postTitle ?? 'Bài viết không có tiêu đề'),
          postContent: String(post?.content ?? data.postContentSnapshot ?? ''),
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
      })
      .sort((left, right) => Date.parse(right.createdAt || '1970-01-01') - Date.parse(left.createdAt || '1970-01-01'));

    const items = allItems.filter((item) => {
      if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.reason && filters.reason !== 'all' && item.reasonCode !== filters.reason) return false;
      if (!search) return true;
      return [
        item.id,
        item.path,
        item.postId,
        item.postTitle,
        item.postContent,
        item.postContentSnapshot,
        item.description,
        item.reasonCode,
        item.reasonLabel,
        item.reporterName,
        item.reporterId,
        item.reporterEmail,
        item.reportedUserName,
        item.reportedUserId,
        item.moderatorName,
      ].some((value) => value.toLocaleLowerCase('vi-VN').includes(search));
    });

    return {
      items,
      stats: {
        total: allItems.length,
        pending: allItems.filter((item) => item.status === 'pending').length,
        reviewing: allItems.filter((item) => item.status === 'reviewing').length,
        resolved: allItems.filter((item) => item.status === 'resolved').length,
        dismissed: allItems.filter((item) => item.status === 'dismissed').length,
      },
    };
  },

  async moderate(
    actor: AdminActor,
    reportPath: string,
    action: ForumModerationAction,
    note = '',
  ) {
    if (!/^forum\/[^/]+\/reports\/[^/]+$/.test(reportPath)) {
      throw new Error('Đường dẫn báo cáo không hợp lệ.');
    }

    const db = getAdminDb();
    const reportRef = db.doc(reportPath);
    const reportSnapshot = await reportRef.get();
    if (!reportSnapshot.exists) throw new Error('Báo cáo không còn tồn tại.');

    const before = reportSnapshot.data() ?? {};
    const postRef = reportRef.parent.parent;
    if (!postRef) throw new Error('Không xác định được bài viết bị báo cáo.');
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
      await reportRef.update(reportUpdate);
    } else if (action === 'dismiss') {
      auditAction = 'moderation_dismiss';
      reportUpdate = { ...common, status: 'dismissed', resolution: 'no_violation', resolvedAt: FieldValue.serverTimestamp() };
      await reportRef.update(reportUpdate);
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
