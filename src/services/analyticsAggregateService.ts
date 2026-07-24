import { FieldPath } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import type { AnalyticsPoint, LearningAnalytics } from '@/services/analyticsService';

function parseDate(value: string | undefined, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function getAggregatedLearningAnalytics(range: { from?: string; to?: string } = {}): Promise<LearningAnalytics> {
  const db = getAdminDb();
  const now = new Date();
  const endFallback = new Date();
  const startFallback = new Date(endFallback);
  startFallback.setDate(startFallback.getDate() - 29);
  const rangeStart = parseDate(range.from, startFallback);
  const rangeEnd = parseDate(range.to, endFallback);
  if (rangeStart > rangeEnd) throw new Error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
  const rangeDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1;
  if (rangeDays > 366) throw new Error('Khoảng phân tích tối đa là 366 ngày.');
  const fromDate = dateKey(rangeStart);
  const toDate = dateKey(rangeEnd);

  const [dailySnapshot, overviewSnapshot, usersSnapshot] = await Promise.all([
    db.collection('analytics_daily').orderBy(FieldPath.documentId()).startAt(fromDate).endAt(toDate).get(),
    db.doc('admin_stats/analytics_overview').get(),
    db.doc('admin_stats/users').get(),
  ]);
  const byDate = new Map(dailySnapshot.docs.map((document) => [document.id, document.data()]));
  const activity: AnalyticsPoint[] = [];
  for (let offset = 0; offset < rangeDays; offset += 1) {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + offset);
    const key = dateKey(date);
    const data = byDate.get(key) ?? {};
    activity.push({
      date: key,
      label: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date),
      sessions: Number(data.sessions ?? 0),
      activeUsers: Number(data.activeUsers ?? 0),
      xp: Number(data.xp ?? 0),
      newUsers: Number(data.newUsers ?? 0),
    });
  }

  let sessions = 0; let scoreTotal = 0; let accuracyTotal = 0; let xp = 0; let timeTotal = 0;
  const scoreBuckets = [0, 0, 0, 0, 0];
  const games = new Map<string, { sessions: number; scoreTotal: number; accuracyTotal: number; type: string }>();
  dailySnapshot.docs.forEach((document) => {
    const data = document.data();
    sessions += Number(data.sessions ?? 0); scoreTotal += Number(data.scoreTotal ?? 0);
    accuracyTotal += Number(data.accuracyTotal ?? 0); xp += Number(data.xp ?? 0); timeTotal += Number(data.timeTotal ?? 0);
    (Array.isArray(data.scoreBuckets) ? data.scoreBuckets : []).forEach((value: unknown, index: number) => { if (index < 5) scoreBuckets[index] += Number(value ?? 0); });
    Object.entries(data.games ?? {}).forEach(([name, raw]) => {
      const value = raw as Record<string, unknown>;
      const current = games.get(name) ?? { sessions: 0, scoreTotal: 0, accuracyTotal: 0, type: String(value.type ?? 'Khác') };
      current.sessions += Number(value.sessions ?? 0); current.scoreTotal += Number(value.scoreTotal ?? 0); current.accuracyTotal += Number(value.accuracyTotal ?? 0);
      games.set(name, current);
    });
  });
  const overview = overviewSnapshot.data() ?? {};
  const userStats = usersSnapshot.data() ?? {};
  const gameTypes = new Map<string, number>();
  games.forEach((value) => gameTypes.set(value.type, (gameTypes.get(value.type) ?? 0) + value.sessions));

  return {
    rangeDays, fromDate, toDate,
    generatedAt: overview.updatedAt?.toDate?.().toISOString?.() ?? now.toISOString(),
    summary: {
      totalUsers: Number(userStats.total ?? 0),
      newUsers: activity.reduce((sum, point) => sum + point.newUsers, 0),
      activeUsers: activity.reduce((sum, point) => sum + point.activeUsers, 0),
      sessions,
      averageScore: sessions ? round(scoreTotal / sessions) : 0,
      averageAccuracy: sessions ? round(accuracyTotal / sessions) : 0,
      totalXpEarned: xp,
      averageTimeMinutes: sessions ? round(timeTotal / sessions / 60) : 0,
      retentionRate: Number(overview.retentionRate ?? 0),
      forumEngagements: Number(overview.forumEngagements ?? 0),
    },
    activity,
    scoreDistribution: ['0–20', '21–40', '41–60', '61–80', '81–100'].map((name, index) => ({ range: name, sessions: scoreBuckets[index] })),
    gameDistribution: [...gameTypes].map(([name, value]) => ({ name, value })),
    streakDistribution: Array.isArray(overview.streakDistribution) ? overview.streakDistribution : [],
    contentStatus: Array.isArray(overview.contentStatus) ? overview.contentStatus : [],
    topLearners: Array.isArray(overview.topLearners) ? overview.topLearners : [],
    topGames: [...games].map(([name, value]) => ({ name, sessions: value.sessions, averageScore: value.sessions ? round(value.scoreTotal / value.sessions) : 0, averageAccuracy: value.sessions ? round(value.accuracyTotal / value.sessions) : 0 })).sort((left, right) => right.sessions - left.sessions).slice(0, 8),
    inventory: overview.inventory ?? { periods: 0, stages: 0, events: 0, persons: 0, quizzes: 0, questions: 0, forumPosts: 0, forumReplies: 0 },
  };
}
