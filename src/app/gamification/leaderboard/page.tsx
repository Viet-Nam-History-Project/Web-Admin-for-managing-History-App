import { Crown, Flame, Sparkles, Trophy } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LeaderboardTableClient, LeaderboardUser } from '@/components/admin/LeaderboardTableClient';
import { userAdminService } from '@/services/userAdminService';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  await requireAdmin(['super_admin', 'game_admin', 'analyst', 'viewer']);

  const result = await userAdminService.list({ pageSize: 100 }).catch(() => ({
    items: [],
    pageSize: 100,
    hasNextPage: false,
    nextCursor: null,
    stats: { total: 0, active: 0, banned: 0, activeStreaks: 0, totalXp: 0 },
  }));

  // Ensure plain objects for RSC -> Client Component boundary
  const users: LeaderboardUser[] = result.items.map((u) => ({
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    username: u.username,
    avatar: u.avatar,
    totalXP: u.totalXP,
    currentRank: u.currentRank,
    currentStreak: u.currentStreak,
    longestStreak: u.longestStreak,
    totalSessions: u.totalSessions,
    highestScore: u.highestScore,
    lastPlayedDate: u.lastPlayedDate,
    accountStatus: u.accountStatus,
  }));

  const top1 = users[0];
  const totalTopXp = users.reduce((acc, u) => acc + (u.totalXP || 0), 0);
  const avgTopXp = users.length > 0 ? Math.round(totalTopXp / users.length) : 0;

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Người dùng & Game hóa"
        title="Bảng xếp hạng người chơi"
        description="Vinh danh các cao thủ có điểm kinh nghiệm (XP) cao nhất, chuỗi ngày học tập bền bỉ và nhiều phiên chơi nhất."
      />

      {/* Stats Overview */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Quán quân hiện tại"
          value={top1 ? top1.displayName : 'Chưa có'}
          valueClassName="text-xl sm:text-2xl"
          hint={top1 ? `${top1.totalXP.toLocaleString('vi-VN')} XP` : undefined}
          icon={Crown}
        />
        <StatCard
          title="Tổng XP toàn hệ thống"
          value={result.stats.totalXp.toLocaleString('vi-VN')}
          hint="Điểm tích lũy từ trò chơi & bài tập"
          icon={Sparkles}
        />
        <StatCard
          title="Chuỗi ngày học tập (Streak)"
          value={result.stats.activeStreaks}
          hint="Người dùng đang duy trì chuỗi học"
          icon={Flame}
        />
        <StatCard
          title="XP trung bình Top 100"
          value={avgTopXp.toLocaleString('vi-VN')}
          hint="Trung bình điểm của nhóm dẫn đầu"
          icon={Trophy}
        />
      </div>

      <LeaderboardTableClient users={users} />
    </AdminShell>
  );
}
