import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { collectContentHealth, CONTENT_HEALTH_VERSION } from '@/lib/analytics/contentHealth';

type FirestoreRecord = Record<string, any>;

export interface AnalyticsPoint {
  date: string;
  label: string;
  sessions: number;
  activeUsers: number;
  xp: number;
  newUsers: number;
}

export interface LearningAnalytics {
  rangeDays: number;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  summary: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    sessions: number;
    averageScore: number;
    averageAccuracy: number;
    totalXpEarned: number;
    averageTimeMinutes: number;
    retentionRate: number;
    forumEngagements: number;
  };
  activity: AnalyticsPoint[];
  scoreDistribution: { range: string; sessions: number }[];
  gameDistribution: { name: string; value: number }[];
  streakDistribution: { range: string; users: number }[];
  contentStatus: { name: string; published: number; draft: number; deleted: number }[];
  topLearners: { uid: string; name: string; email: string; xp: number; streak: number; rank: string; sessions: number }[];
  topGames: { name: string; sessions: number; averageScore: number; averageAccuracy: number }[];
  inventory: { periods: number; stages: number; events: number; persons: number; quizzes: number; questions: number; forumPosts: number; forumReplies: number };
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return null;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function safeDocs(collection: FirebaseFirestore.Query) {
  try { return (await collection.get()).docs; }
  catch { return []; }
}

function parseDateInput(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getLearningAnalytics(range: { from?: string; to?: string } = {}): Promise<LearningAnalytics> {
  const db = getAdminDb();
  const now = new Date();
  const todayInVietnam = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const defaultEnd = parseDateInput(todayInVietnam, true) as Date;
  const defaultStart = parseDateInput(todayInVietnam) as Date;
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  const rangeStart = parseDateInput(range.from) ?? defaultStart;
  const rangeEnd = parseDateInput(range.to, true) ?? defaultEnd;
  if (rangeStart > rangeEnd) throw new Error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
  const days = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1;
  if (days > 366) throw new Error('Khoảng phân tích tối đa là 366 ngày để đảm bảo hiệu năng biểu đồ.');
  const previousStart = new Date(rangeStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const previousEnd = new Date(rangeStart.getTime() - 1);

  const [userDocs, sessionDocs, forumDocs, replyDocs, quizDocs, questionDocs, personDocs] = await Promise.all([
    safeDocs(db.collection(paths.users).limit(5000)),
    safeDocs(db.collectionGroup('sessions').orderBy('playedAt', 'desc').limit(10000)),
    safeDocs(db.collection(paths.forumPosts).limit(5000)),
    safeDocs(db.collectionGroup('replies').limit(10000)),
    safeDocs(db.collectionGroup('quizzes').limit(5000)),
    safeDocs(db.collectionGroup('questions').limit(20000)),
    safeDocs(db.collectionGroup('persons').limit(5000)),
  ]);

  const users = userDocs.map((doc) => ({ id: doc.id, ...doc.data() } as FirestoreRecord));
  const sessions = sessionDocs.map((doc) => ({
    id: doc.id,
    userId: doc.ref.parent.parent?.id ?? '',
    ...doc.data(),
    playedDate: toDate(doc.data().playedAt),
  } as FirestoreRecord & { playedDate: Date | null; userId: string }));
  const currentSessions = sessions.filter((session) => session.playedDate && session.playedDate >= rangeStart && session.playedDate <= rangeEnd);
  const previousSessions = sessions.filter((session) => session.playedDate && session.playedDate >= previousStart && session.playedDate <= previousEnd);

  const currentActive = new Set(currentSessions.map((session) => session.userId).filter(Boolean));
  const previousActive = new Set(previousSessions.map((session) => session.userId).filter(Boolean));
  const returnedUsers = [...previousActive].filter((uid) => currentActive.has(uid)).length;
  const retentionRate = previousActive.size ? (returnedUsers / previousActive.size) * 100 : 0;

  const activityMap = new Map<string, AnalyticsPoint>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(rangeStart);
    date.setUTCDate(date.getUTCDate() + offset);
    const key = dateKey(date);
    activityMap.set(key, {
      date: key,
      label: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date),
      sessions: 0,
      activeUsers: 0,
      xp: 0,
      newUsers: 0,
    });
  }

  const dailyUsers = new Map<string, Set<string>>();
  currentSessions.forEach((session) => {
    if (!session.playedDate) return;
    const key = dateKey(session.playedDate);
    const point = activityMap.get(key);
    if (!point) return;
    point.sessions += 1;
    point.xp += Number(session.xpGained ?? 0);
    if (!dailyUsers.has(key)) dailyUsers.set(key, new Set());
    if (session.userId) dailyUsers.get(key)?.add(session.userId);
  });
  dailyUsers.forEach((uids, key) => { const point = activityMap.get(key); if (point) point.activeUsers = uids.size; });

  let newUsers = 0;
  users.forEach((user) => {
    const createdAt = toDate(user.createdAt);
    if (createdAt && createdAt >= rangeStart && createdAt <= rangeEnd) {
      newUsers += 1;
      const point = activityMap.get(dateKey(createdAt));
      if (point) point.newUsers += 1;
    }
  });

  let totalScore = 0;
  let totalAccuracy = 0;
  let totalXp = 0;
  let totalTime = 0;
  const scoreBuckets = [0, 0, 0, 0, 0];
  const gameMap = new Map<string, { sessions: number; score: number; accuracy: number }>();
  currentSessions.forEach((session) => {
    const score = Number(session.score ?? 0);
    const total = Number(session.totalQuestions ?? 0);
    const correct = Number(session.correctAnswers ?? 0);
    const accuracy = total > 0 ? (correct / total) * 100 : score;
    totalScore += score;
    totalAccuracy += accuracy;
    totalXp += Number(session.xpGained ?? 0);
    totalTime += Number(session.timeTaken ?? 0);
    const normalizedScore = Math.min(100, Math.max(0, score));
    const bucket = normalizedScore <= 20 ? 0 : normalizedScore <= 40 ? 1 : normalizedScore <= 60 ? 2 : normalizedScore <= 80 ? 3 : 4;
    scoreBuckets[bucket] += 1;
    const name = String(session.gameTitle || (session.type === 'quiz' ? 'Trắc nghiệm lịch sử' : 'Ghép niên đại'));
    const aggregate = gameMap.get(name) ?? { sessions: 0, score: 0, accuracy: 0 };
    aggregate.sessions += 1;
    aggregate.score += score;
    aggregate.accuracy += accuracy;
    gameMap.set(name, aggregate);
  });

  const typeCounts = new Map<string, number>();
  currentSessions.forEach((session) => {
    const label = session.type === 'quiz' ? 'Trắc nghiệm' : 'Ghép niên đại';
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  });

  const streakRanges = [
    { label: '0 ngày', min: 0, max: 0 }, { label: '1–2 ngày', min: 1, max: 2 },
    { label: '3–6 ngày', min: 3, max: 6 }, { label: '7–13 ngày', min: 7, max: 13 },
    { label: '14+ ngày', min: 14, max: Number.POSITIVE_INFINITY },
  ];

  const contentStatus = new Map<string, { published: number; draft: number; deleted: number }>();
  const addContent = (name: string, data: FirestoreRecord) => {
    const value = contentStatus.get(name) ?? { published: 0, draft: 0, deleted: 0 };
    const status = data.status === 'published' ? 'published' : data.status === 'deleted' ? 'deleted' : 'draft';
    value[status] += 1;
    contentStatus.set(name, value);
  };
  const periodDocs = await safeDocs(db.collection(paths.periods).limit(500));
  let stageCount = 0;
  let eventCount = 0;
  for (const periodDoc of periodDocs) {
    addContent('Thời kỳ', periodDoc.data());
    const stageDocs = await safeDocs(periodDoc.ref.collection('stages').limit(1000));
    stageCount += stageDocs.length;
    for (const stageDoc of stageDocs) {
      addContent('Giai đoạn', stageDoc.data());
      const eventDocs = await safeDocs(stageDoc.ref.collection('events').limit(2000));
      eventCount += eventDocs.length;
      eventDocs.forEach((eventDoc) => addContent('Sự kiện', eventDoc.data()));
    }
  }

  const forumEngagements = forumDocs.reduce((sum, doc) => sum + Number(doc.data().likeCount ?? 0) + Number(doc.data().replyCount ?? 0), 0);
  const topLearners = [...users].sort((a, b) => Number(b.totalXP ?? 0) - Number(a.totalXP ?? 0)).slice(0, 8).map((user) => ({
    uid: user.id,
    name: String(user.displayName || user.name || user.username || 'Người dùng'),
    email: String(user.email ?? ''),
    xp: Number(user.totalXP ?? 0),
    streak: Number(user.currentStreak ?? 0),
    rank: String(user.currentRank ?? 'Newcomer'),
    sessions: Number(user.totalSessions ?? 0),
  }));

  return {
    rangeDays: days,
    fromDate: dateKey(rangeStart),
    toDate: dateKey(rangeEnd),
    generatedAt: now.toISOString(),
    summary: {
      totalUsers: users.length,
      newUsers,
      activeUsers: currentActive.size,
      sessions: currentSessions.length,
      averageScore: currentSessions.length ? round(totalScore / currentSessions.length) : 0,
      averageAccuracy: currentSessions.length ? round(totalAccuracy / currentSessions.length) : 0,
      totalXpEarned: totalXp,
      averageTimeMinutes: currentSessions.length ? round(totalTime / currentSessions.length / 60) : 0,
      retentionRate: round(retentionRate),
      forumEngagements,
    },
    activity: [...activityMap.values()],
    scoreDistribution: ['0–20', '21–40', '41–60', '61–80', '81–100'].map((range, index) => ({ range, sessions: scoreBuckets[index] })),
    gameDistribution: [...typeCounts].map(([name, value]) => ({ name, value })),
    streakDistribution: streakRanges.map((range) => ({ range: range.label, users: users.filter((user) => Number(user.currentStreak ?? 0) >= range.min && Number(user.currentStreak ?? 0) <= range.max).length })),
    contentStatus: [...contentStatus].map(([name, value]) => ({ name, ...value })),
    topLearners,
    topGames: [...gameMap].map(([name, value]) => ({ name, sessions: value.sessions, averageScore: round(value.score / value.sessions), averageAccuracy: round(value.accuracy / value.sessions) })).sort((a, b) => b.sessions - a.sessions).slice(0, 8),
    inventory: {
      periods: periodDocs.length, stages: stageCount, events: eventCount, persons: personDocs.length,
      quizzes: quizDocs.length, questions: questionDocs.length, forumPosts: forumDocs.length, forumReplies: replyDocs.length,
    },
  };
}

async function safeCount(collectionPath: string) {
  try {
    const snapshot = await getAdminDb().collection(collectionPath).count().get();
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

async function safeGroupCount(collectionId: string) {
  try {
    const snapshot = await getAdminDb().collectionGroup(collectionId).count().get();
    return snapshot.data().count;
  } catch { return 0; }
}

export async function getDashboardStats() {
  const db = getAdminDb();
  const cached = await db.doc('admin_stats/dashboard').get().catch(() => null);
  if (cached?.exists && Number(cached.data()?.contentHealthVersion) === CONTENT_HEALTH_VERSION) {
    const value = cached.data() ?? {};
    return {
      users: Number(value.users ?? 0), usersNew7d: Number(value.usersNew7d ?? 0), activeUsers7d: Number(value.activeUsers7d ?? 0),
      periods: Number(value.periods ?? 0), stages: Number(value.stages ?? 0), events: Number(value.events ?? 0), persons: Number(value.persons ?? 0),
      quizzes: Number(value.quizzes ?? 0), questions: Number(value.questions ?? 0), quizSessions: Number(value.quizSessions ?? 0),
      forumPosts: Number(value.forumPosts ?? 0), forumComments: Number(value.forumComments ?? 0), draftContent: Number(value.draftContent ?? 0),
      missingImage: Number(value.missingImage ?? 0), missingVideo: Number(value.missingVideo ?? 0), deletedContent: Number(value.deletedContent ?? 0),
      aiUnansweredQuestions: Number(value.aiUnansweredQuestions ?? 0),
      imageBreakdown: value.imageBreakdown ?? {},
    };
  }
  const [users, periods, forumPosts, persons, quizzes, questions, quizSessions, trash] = await Promise.all([
    safeCount(paths.users),
    safeCount(paths.periods),
    safeCount(paths.forumPosts),
    safeGroupCount('persons'),
    safeGroupCount('quizzes'),
    safeGroupCount('questions'),
    safeGroupCount('sessions'),
    safeCount(paths.trash),
  ]);

  const health = await collectContentHealth(db);
  const stages = await safeGroupCount('stages');
  const events = await safeGroupCount('events');

  return {
    users,
    usersNew7d: 0,
    activeUsers7d: 0,
    periods,
    stages,
    events,
    persons,
    quizzes,
    questions,
    quizSessions,
    forumPosts,
    forumComments: 0,
    draftContent: health.draftContent,
    missingImage: health.missingImage,
    missingVideo: health.missingVideo,
    deletedContent: trash,
    aiUnansweredQuestions: 0,
    imageBreakdown: health.imageBreakdown,
  };
}
