import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { AdminActor } from '@/lib/auth/requireAdmin';

export type AuditAction =
  | 'create'
  | 'update'
  | 'soft_delete'
  | 'restore'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'sync_graph'
  | 'import'
  | 'export'
  | 'run_ai'
  | 'ai_apply_suggestion'
  | 'role_update'
  | 'manual_xp_update'
  | 'account_update'
  | 'password_change'
  | 'logout'
  | 'permanent_delete'
  | 'user_ban'
  | 'user_unban'
  | 'session_revoke'
  | 'streak_reset';

export interface AuditLogInput {
  actor: AdminActor;
  action: AuditAction;
  entityType: string;
  entityPath: string;
  entityTitle?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(input: AuditLogInput) {
  await getAdminDb().collection(paths.auditLogs).add({
    actorUid: input.actor.uid,
    actorEmail: input.actor.email,
    action: input.action,
    entityType: input.entityType,
    entityPath: input.entityPath,
    entityTitle: input.entityTitle ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}
