import { loadEnvConfig } from '@next/env';
import { FieldValue, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { collectContentHealth, CONTENT_HEALTH_VERSION } from '@/lib/analytics/contentHealth';

function normalize(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
}

function withoutAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('đ', 'd');
}

function searchTokens(...values: unknown[]) {
  const tokens = new Set<string>();
  for (const raw of values) {
    for (const candidate of [normalize(raw), withoutAccents(normalize(raw))]) {
      if (!candidate) continue;
      tokens.add(candidate.slice(0, 80));
      for (const word of candidate.split(/[^a-z0-9@._-]+/i).filter(Boolean)) {
        tokens.add(word.slice(0, 80));
        for (let length = 2; length <= Math.min(word.length, 20); length += 1) tokens.add(word.slice(0, length));
      }
    }
  }
  return [...tokens].slice(0, 200);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

function rankForXp(xp: number) {
  if (xp >= 5000) return 'Legend';
  if (xp >= 2500) return 'Platinum';
  if (xp >= 1200) return 'Gold';
  if (xp >= 600) return 'Silver';
  if (xp >= 200) return 'Bronze';
  return 'Newcomer';
}

async function commitBatches(operations: ((batch: WriteBatch) => void)[]) {
  const db = getAdminDb();
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();
    operations.slice(offset, offset + 400).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const db = getAdminDb();
  const contentHealth = await collectContentHealth(db);
  const [usersSnapshot, nestedReportsSnapshot, queueReportsSnapshot, sessionsSnapshot, forumSnapshot] = await Promise.all([
    db.collection('users').get(),
    db.collectionGroup('reports').get(),
    db.collection('forum_reports').get(),
    db.collectionGroup('sessions').get(),
    db.collection('forum').get(),
  ]);

  const operations: ((batch: WriteBatch) => void)[] = [];
  const userStats = { total: 0, active: 0, banned: 0, activeStreaks: 0, totalXp: 0 };
  const reportStats = { total: 0, pending: 0, reviewing: 0, resolved: 0, dismissed: 0 };
  let forumVisibilityBackfilled = 0;
  const daily = new Map<string, Record<string, any>>();

  for (const document of usersSnapshot.docs) {
    const data = document.data();
    const totalXP = Number(data.totalXP ?? 0);
    const accountStatus = data.accountStatus === 'banned' ? 'banned' : 'active';
    userStats.total += 1;
    userStats[accountStatus] += 1;
    if (Number(data.currentStreak ?? 0) > 0) userStats.activeStreaks += 1;
    userStats.totalXp += totalXP;
    const createdAt = toDate(data.createdAt);
    if (createdAt) {
      const key = dayKey(createdAt);
      const value = daily.get(key) ?? { sessions: 0, activeUsers: new Set<string>(), xp: 0, newUsers: 0, scoreTotal: 0, accuracyTotal: 0, timeTotal: 0, scoreBuckets: [0, 0, 0, 0, 0], games: {} };
      value.newUsers += 1;
      daily.set(key, value);
    }
    operations.push((batch) => batch.set(document.ref, {
      accountStatus,
      totalXP,
      currentStreak: Number(data.currentStreak ?? 0),
      longestStreak: Number(data.longestStreak ?? 0),
      totalSessions: Number(data.totalSessions ?? 0),
      highestScore: Number(data.highestScore ?? 0),
      currentRank: data.currentRank || rankForXp(totalXP),
      searchTokens: searchTokens(document.id, data.displayName, data.name, data.username, data.email),
    }, { merge: true }));
  }

  // Quy ước visibility rõ ràng để app có thể query an toàn bằng
  // `where('isHidden', '==', false)`. Các bài cũ chưa có trường này được
  // xem là công khai, trừ khi moderator đã đánh dấu ẩn từ trước.
  for (const document of forumSnapshot.docs) {
    if (typeof document.data().isHidden !== 'boolean') forumVisibilityBackfilled += 1;
    operations.push((batch) => batch.set(document.ref, {
      isHidden: document.data().isHidden === true,
    }, { merge: true }));
  }

  const reportsBySource = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const document of queueReportsSnapshot.docs) {
    reportsBySource.set(String(document.data().sourceReportPath || document.ref.path), document);
  }
  for (const document of nestedReportsSnapshot.docs) {
    if (/^forum\/[^/]+\/reports\/[^/]+$/.test(document.ref.path)) reportsBySource.set(document.ref.path, document);
  }

  for (const [sourcePath, document] of reportsBySource) {
    const data = document.data();
    const status = ['pending', 'reviewing', 'resolved', 'dismissed'].includes(data.status) ? data.status as keyof typeof reportStats : 'pending';
    reportStats.total += 1;
    reportStats[status] += 1;
    const queueRef = document.ref.parent.id === 'forum_reports'
      ? document.ref
      : db.doc(`forum_reports/${document.ref.parent.parent?.id}_${document.id}`);
    operations.push((batch) => batch.set(queueRef, {
      ...data,
      sourceReportPath: sourcePath,
      postHidden: data.postHidden === true,
      searchTokens: searchTokens(document.id, data.postId, data.postTitle, data.reporterId, data.reporterName, data.reporterEmail, data.reportedUserId, data.reportedUserName, data.reasonCode, data.reasonLabel),
    }, { merge: true }));
  }

  for (const document of sessionsSnapshot.docs) {
    const data = document.data();
    const playedAt = toDate(data.playedAt);
    if (!playedAt) continue;
    const key = dayKey(playedAt);
    const value = daily.get(key) ?? { sessions: 0, activeUsers: new Set<string>(), xp: 0, newUsers: 0, scoreTotal: 0, accuracyTotal: 0, timeTotal: 0, scoreBuckets: [0, 0, 0, 0, 0], games: {} };
    const score = Number(data.score ?? 0);
    const total = Number(data.totalQuestions ?? 0);
    const correct = Number(data.correctAnswers ?? 0);
    const accuracy = total > 0 ? (correct / total) * 100 : score;
    const userId = document.ref.parent.parent?.id;
    value.sessions += 1;
    if (userId) value.activeUsers.add(userId);
    value.xp += Number(data.xpGained ?? 0);
    value.scoreTotal += score;
    value.accuracyTotal += accuracy;
    value.timeTotal += Number(data.timeTaken ?? 0);
    const bucket = score <= 20 ? 0 : score <= 40 ? 1 : score <= 60 ? 2 : score <= 80 ? 3 : 4;
    value.scoreBuckets[bucket] += 1;
    const gameName = String(data.gameTitle || (data.type === 'quiz' ? 'Trắc nghiệm lịch sử' : 'Ghép niên đại'));
    const game = value.games[gameName] ?? { sessions: 0, scoreTotal: 0, accuracyTotal: 0, type: data.type === 'quiz' ? 'Trắc nghiệm' : 'Ghép niên đại' };
    game.sessions += 1;
    game.scoreTotal += score;
    game.accuracyTotal += accuracy;
    value.games[gameName] = game;
    daily.set(key, value);
  }

  for (const [date, value] of daily) {
    operations.push((batch) => batch.set(db.doc(`analytics_daily/${date}`), {
      date,
      sessions: value.sessions,
      activeUsers: value.activeUsers.size,
      xp: value.xp,
      newUsers: value.newUsers,
      scoreTotal: value.scoreTotal,
      accuracyTotal: value.accuracyTotal,
      timeTotal: value.timeTotal,
      scoreBuckets: value.scoreBuckets,
      games: value.games,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }));
  }

  const [periods, stages, events, persons, quizzes, questions, replies, trash] = await Promise.all([
    db.collection('periods').count().get(), db.collectionGroup('stages').count().get(),
    db.collectionGroup('events').count().get(), db.collectionGroup('persons').count().get(),
    db.collectionGroup('quizzes').count().get(), db.collectionGroup('questions').count().get(),
    db.collectionGroup('replies').count().get(), db.collection('admin_trash').count().get(),
  ]);
  const inventory = {
    periods: periods.data().count, stages: stages.data().count, events: events.data().count,
    persons: persons.data().count, quizzes: quizzes.data().count, questions: questions.data().count,
    forumPosts: forumSnapshot.size, forumReplies: replies.data().count,
  };
  const topLearners = usersSnapshot.docs.map((document) => {
    const data = document.data();
    return { uid: document.id, name: String(data.displayName || data.name || data.username || 'Người dùng'), email: String(data.email ?? ''), xp: Number(data.totalXP ?? 0), streak: Number(data.currentStreak ?? 0), rank: String(data.currentRank || rankForXp(Number(data.totalXP ?? 0))), sessions: Number(data.totalSessions ?? 0) };
  }).sort((left, right) => right.xp - left.xp).slice(0, 8);
  const streakRanges = [
    { range: '0 ngày', min: 0, max: 0 }, { range: '1–2 ngày', min: 1, max: 2 },
    { range: '3–6 ngày', min: 3, max: 6 }, { range: '7–13 ngày', min: 7, max: 13 },
    { range: '14+ ngày', min: 14, max: Number.POSITIVE_INFINITY },
  ].map((range) => ({ range: range.range, users: usersSnapshot.docs.filter((document) => { const streak = Number(document.data().currentStreak ?? 0); return streak >= range.min && streak <= range.max; }).length }));
  const forumEngagements = forumSnapshot.docs.reduce((sum, document) => sum + Number(document.data().likeCount ?? 0) + Number(document.data().replyCount ?? 0), 0);

  operations.push((batch) => batch.set(db.doc('admin_stats/users'), { ...userStats, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
  operations.push((batch) => batch.set(db.doc('admin_stats/forum_reports'), { ...reportStats, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
  operations.push((batch) => batch.set(db.doc('admin_stats/analytics_overview'), { inventory, topLearners, streakDistribution: streakRanges, forumEngagements, updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
  operations.push((batch) => batch.set(db.doc('admin_stats/dashboard'), {
    users: userStats.total, usersNew7d: 0, activeUsers7d: 0, ...inventory,
    quizSessions: sessionsSnapshot.size, forumComments: inventory.forumReplies,
    draftContent: contentHealth.draftContent,
    missingImage: contentHealth.missingImage,
    missingVideo: contentHealth.missingVideo,
    imageBreakdown: contentHealth.imageBreakdown,
    contentHealthVersion: CONTENT_HEALTH_VERSION,
    contentHealthCheckedAt: FieldValue.serverTimestamp(),
    deletedContent: trash.data().count,
    aiUnansweredQuestions: 0, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }));

  await commitBatches(operations);
  console.log(JSON.stringify({ users: userStats, reports: reportStats, forumVisibilityBackfilled, analyticsDays: daily.size, inventory, writes: operations.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
