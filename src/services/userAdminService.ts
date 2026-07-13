import { FieldValue } from 'firebase-admin/firestore';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  avatar: string;
  totalXP: number;
  currentRank: string;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  highestScore: number;
  lastPlayedDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  disabled: boolean;
  accountStatus: string;
  banReason?: string;
}

export interface ManagedUserDetail extends ManagedUser {
  bio: string;
  emailVerified: boolean;
  lastSignInAt?: string;
  tokensValidAfterTime?: string;
  badges: { id: string; name: string; description: string; earnedAt?: unknown }[];
  sessions: { id: string; type: string; title: string; score: number; accuracy: number; xp: number; timeTaken: number; playedAt?: unknown }[];
}

function rankForXp(xp: number) {
  if (xp >= 5000) return 'Legend';
  if (xp >= 2500) return 'Platinum';
  if (xp >= 1200) return 'Gold';
  if (xp >= 600) return 'Silver';
  if (xp >= 200) return 'Bronze';
  return 'Newcomer';
}

async function listAuthUsers() {
  const users = new Map<string, Awaited<ReturnType<ReturnType<typeof getAdminAuth>['getUser']>>>();
  let pageToken: string | undefined;
  do {
    const page = await getAdminAuth().listUsers(1000, pageToken);
    page.users.forEach((user) => users.set(user.uid, user));
    pageToken = page.pageToken;
  } while (pageToken && users.size < 5000);
  return users;
}

function mapUser(uid: string, data: Record<string, any>, authUser?: Awaited<ReturnType<ReturnType<typeof getAdminAuth>['getUser']>>): ManagedUser {
  const disabled = Boolean(authUser?.disabled || data.accountStatus === 'banned');
  return {
    uid,
    email: String(data.email || authUser?.email || ''),
    displayName: String(data.displayName || data.name || authUser?.displayName || data.username || 'Người dùng'),
    username: String(data.username ?? ''),
    avatar: String(data.avatar || data.photo || authUser?.photoURL || ''),
    totalXP: Number(data.totalXP ?? 0),
    currentRank: String(data.currentRank || rankForXp(Number(data.totalXP ?? 0))),
    currentStreak: Number(data.currentStreak ?? 0),
    longestStreak: Number(data.longestStreak ?? 0),
    totalSessions: Number(data.totalSessions ?? 0),
    highestScore: Number(data.highestScore ?? 0),
    lastPlayedDate: String(data.lastPlayedDate ?? ''),
    createdAt: data.createdAt ?? authUser?.metadata.creationTime,
    updatedAt: data.updatedAt,
    disabled,
    accountStatus: disabled ? 'banned' : 'active',
    banReason: data.banReason,
  };
}

export const userAdminService = {
  async list(options: { search?: string; status?: string; rank?: string } = {}) {
    const db = getAdminDb();
    const [snapshot, authUsers] = await Promise.all([
      db.collection(paths.users).limit(5000).get(),
      listAuthUsers(),
    ]);
    const search = options.search?.trim().toLowerCase();
    const allItems = snapshot.docs.map((doc) => mapUser(doc.id, doc.data(), authUsers.get(doc.id)));
    const items = allItems.filter((user) => {
      if (search && !`${user.displayName} ${user.username} ${user.email} ${user.uid}`.toLowerCase().includes(search)) return false;
      if (options.status && options.status !== 'all' && user.accountStatus !== options.status) return false;
      if (options.rank && options.rank !== 'all' && user.currentRank !== options.rank) return false;
      return true;
    }).sort((a, b) => b.totalXP - a.totalXP);
    return {
      items,
      stats: {
        total: allItems.length,
        active: allItems.filter((user) => !user.disabled).length,
        banned: allItems.filter((user) => user.disabled).length,
        activeStreaks: allItems.filter((user) => user.currentStreak > 0).length,
        totalXp: allItems.reduce((sum, user) => sum + user.totalXP, 0),
      },
    };
  },

  async get(uid: string): Promise<ManagedUserDetail | null> {
    const db = getAdminDb();
    const userRef = db.doc(`${paths.users}/${uid}`);
    const [snapshot, authUser, badgesSnapshot, sessionsSnapshot] = await Promise.all([
      userRef.get(),
      getAdminAuth().getUser(uid).catch(() => undefined),
      userRef.collection('badges').orderBy('earnedAt', 'desc').limit(100).get().catch(() => null),
      db.collection(paths.historySessions(uid)).orderBy('playedAt', 'desc').limit(50).get().catch(() => null),
    ]);
    if (!snapshot.exists) return null;
    const data = snapshot.data() ?? {};
    return {
      ...mapUser(uid, data, authUser),
      bio: String(data.bio ?? ''),
      emailVerified: Boolean(authUser?.emailVerified),
      lastSignInAt: authUser?.metadata.lastSignInTime,
      tokensValidAfterTime: authUser?.tokensValidAfterTime,
      badges: badgesSnapshot?.docs.map((doc) => ({ id: doc.id, name: String(doc.data().name ?? doc.data().badgeId ?? doc.id), description: String(doc.data().description ?? ''), earnedAt: doc.data().earnedAt })) ?? [],
      sessions: sessionsSnapshot?.docs.map((doc) => {
        const session = doc.data();
        const total = Number(session.totalQuestions ?? 0);
        const correct = Number(session.correctAnswers ?? 0);
        return { id: doc.id, type: String(session.type ?? 'quiz'), title: String(session.gameTitle || session.quizId || 'Phiên học'), score: Number(session.score ?? 0), accuracy: total ? Math.round((correct / total) * 100) : 0, xp: Number(session.xpGained ?? 0), timeTaken: Number(session.timeTaken ?? 0), playedAt: session.playedAt };
      }) ?? [],
    };
  },

  async setDisabled(actor: AdminActor, uid: string, disabled: boolean, reason: string) {
    if (uid === actor.uid) throw new Error('Không thể khóa chính tài khoản admin đang sử dụng.');
    if (!reason.trim()) throw new Error('Cần nhập lý do khóa/mở khóa.');
    const before = await this.get(uid);
    if (!before) throw new Error('Không tìm thấy người dùng.');
    await getAdminAuth().updateUser(uid, { disabled });
    if (disabled) await getAdminAuth().revokeRefreshTokens(uid);
    await getAdminDb().doc(`${paths.users}/${uid}`).set(disabled ? {
      accountStatus: 'banned', banReason: reason.trim(), bannedAt: FieldValue.serverTimestamp(), bannedBy: actor.uid, updatedAt: FieldValue.serverTimestamp(),
    } : {
      accountStatus: 'active', banReason: FieldValue.delete(), bannedAt: FieldValue.delete(), bannedBy: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await writeAuditLog({ actor, action: disabled ? 'user_ban' : 'user_unban', entityType: 'user', entityPath: `${paths.users}/${uid}`, entityTitle: before.displayName, before: { disabled: before.disabled }, after: { disabled, reason } });
  },

  async adjustXp(actor: AdminActor, uid: string, delta: number, reason: string) {
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) throw new Error('Mức điều chỉnh XP phải là số nguyên khác 0 và không vượt quá 100.000.');
    if (reason.trim().length < 3) throw new Error('Cần nhập lý do điều chỉnh XP.');
    const ref = getAdminDb().doc(`${paths.users}/${uid}`);
    let beforeXp = 0;
    let afterXp = 0;
    let nextRank = 'Newcomer';
    await getAdminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('Không tìm thấy người dùng.');
      beforeXp = Number(snapshot.data()?.totalXP ?? 0);
      afterXp = Math.max(0, beforeXp + delta);
      nextRank = rankForXp(afterXp);
      transaction.set(ref, { totalXP: afterXp, currentRank: nextRank, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    await writeAuditLog({ actor, action: 'manual_xp_update', entityType: 'user', entityPath: ref.path, entityTitle: uid, before: { totalXP: beforeXp }, after: { totalXP: afterXp, currentRank: nextRank, delta, reason: reason.trim() } });
  },

  async resetStreak(actor: AdminActor, uid: string, reason: string) {
    if (reason.trim().length < 3) throw new Error('Cần nhập lý do reset streak.');
    const ref = getAdminDb().doc(`${paths.users}/${uid}`);
    const before = await ref.get();
    if (!before.exists) throw new Error('Không tìm thấy người dùng.');
    await ref.set({ currentStreak: 0, lastPlayedDate: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAuditLog({ actor, action: 'streak_reset', entityType: 'user', entityPath: ref.path, entityTitle: String(before.data()?.displayName ?? uid), before: { currentStreak: before.data()?.currentStreak, lastPlayedDate: before.data()?.lastPlayedDate }, after: { currentStreak: 0, lastPlayedDate: null, reason: reason.trim() } });
  },

  async revokeSessions(actor: AdminActor, uid: string) {
    if (uid === actor.uid) throw new Error('Hãy dùng nút Đăng xuất trong Settings cho tài khoản hiện tại.');
    const user = await this.get(uid);
    if (!user) throw new Error('Không tìm thấy người dùng.');
    await getAdminAuth().revokeRefreshTokens(uid);
    await writeAuditLog({ actor, action: 'session_revoke', entityType: 'user', entityPath: `${paths.users}/${uid}`, entityTitle: user.displayName, after: { sessionsRevoked: true } });
  },
};
