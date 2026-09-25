import {
  Award,
  CheckCircle2,
  Flame,
  Footprints,
  Info,
  Medal,
  Ribbon,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

interface BadgeItemDef {
  id: string;
  name: string;
  description: string;
  condition: string;
  iconName: string;
  tone: 'gold' | 'red' | 'green' | 'neutral' | 'dark';
}

const BADGES_CATALOG: BadgeItemDef[] = [
  {
    id: 'first_play',
    name: 'Bước Chân Đầu Tiên',
    description: 'Hoàn thành lượt chơi đầu tiên',
    condition: 'Hoàn thành ít nhất 1 phiên học (totalSessions >= 1)',
    iconName: 'footsteps',
    tone: 'green',
  },
  {
    id: 'play_10',
    name: 'Chiến Binh Kiên Nhẫn',
    description: 'Hoàn thành 10 lượt chơi',
    condition: 'Tích lũy đạt 10 phiên học (totalSessions >= 10)',
    iconName: 'medal',
    tone: 'gold',
  },
  {
    id: 'play_50',
    name: 'Bậc Thầy Lịch Sử',
    description: 'Hoàn thành 50 lượt chơi',
    condition: 'Tích lũy đạt 50 phiên học (totalSessions >= 50)',
    iconName: 'ribbon',
    tone: 'dark',
  },
  {
    id: 'streak_3',
    name: 'Kiên Trì',
    description: 'Đạt chuỗi chơi 3 ngày liên tiếp',
    condition: 'Duy trì học tập liên tục (currentStreak >= 3)',
    iconName: 'flame',
    tone: 'gold',
  },
  {
    id: 'streak_7',
    name: 'Không Bỏ Cuộc',
    description: 'Đạt chuỗi chơi 7 ngày liên tiếp',
    condition: 'Duy trì học tập liên tục cả tuần (currentStreak >= 7)',
    iconName: 'flame-hot',
    tone: 'red',
  },
  {
    id: 'perfect_score',
    name: 'Hoàn Hảo',
    description: 'Trả lời đúng tất cả câu hỏi trong 1 lượt',
    condition: 'Đạt độ chính xác 100% (correctAnswers === totalQuestions)',
    iconName: 'star',
    tone: 'gold',
  },
  {
    id: 'speed_demon',
    name: 'Tốc Độ Ánh Sáng',
    description: 'Hoàn thành trong dưới 20 giây với điểm > 0',
    condition: 'Thời gian làm bài < 20 giây và có ít nhất 1 câu đúng',
    iconName: 'zap',
    tone: 'gold',
  },
  {
    id: 'rank_gold',
    name: 'Hạng Vàng',
    description: 'Đạt hạng Gold',
    condition: 'Tích lũy tối thiểu 1.200 XP',
    iconName: 'shield',
    tone: 'gold',
  },
  {
    id: 'rank_legend',
    name: 'Huyền Thoại',
    description: 'Đạt hạng Legend — cấp cao nhất',
    condition: 'Tích lũy tối thiểu 5.000 XP',
    iconName: 'trophy',
    tone: 'dark',
  },
];

function renderBadgeIcon(iconName: string) {
  switch (iconName) {
    case 'footsteps':
      return <Footprints className="h-6 w-6 text-emerald-600" />;
    case 'medal':
      return <Medal className="h-6 w-6 text-amber-600" />;
    case 'ribbon':
      return <Ribbon className="h-6 w-6 text-purple-600" />;
    case 'flame':
      return <Flame className="h-6 w-6 text-orange-500" />;
    case 'flame-hot':
      return <Flame className="h-6 w-6 fill-red-500 text-red-600" />;
    case 'star':
      return <Star className="h-6 w-6 fill-amber-400 text-amber-500" />;
    case 'zap':
      return <Zap className="h-6 w-6 fill-yellow-400 text-yellow-600" />;
    case 'shield':
      return <Shield className="h-6 w-6 text-amber-500" />;
    case 'trophy':
      return <Trophy className="h-6 w-6 fill-amber-400 text-amber-600" />;
    default:
      return <Award className="h-6 w-6 text-bronze" />;
  }
}

export default async function BadgesCatalogPage() {
  await requireAdmin(['super_admin', 'game_admin', 'analyst', 'viewer']);

  const db = getAdminDb();

  // Aggregate badge counts from users
  const badgeCounts: Record<string, number> = {};
  let totalUsers = 0;

  try {
    const [usersCountSnap, badgesGroupSnap] = await Promise.all([
      db.collection('users').count().get().catch(() => null),
      db.collectionGroup('badges').get().catch(() => null),
    ]);

    totalUsers = usersCountSnap?.data()?.count ?? 0;

    if (badgesGroupSnap) {
      badgesGroupSnap.docs.forEach((doc) => {
        const id = doc.id;
        badgeCounts[id] = (badgeCounts[id] || 0) + 1;
      });
    }
  } catch (err) {
    console.error('Error fetching badge statistics:', err);
  }

  const totalBadgesAwarded = Object.values(badgeCounts).reduce((a, b) => a + b, 0);

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Người dùng & Game hóa"
        title="Danh mục huy hiệu (Badges)"
        description="Tra cứu hệ thống 9 danh hiệu chính thức trong ứng dụng, tiêu chí mở khóa và tỷ lệ đạt được của người học."
      />

      {/* Info notice about mobile app logic */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-stone-700">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="leading-relaxed">
          <span className="font-bold text-charcoal">Quy tắc thẩm định huy hiệu: </span>
          Hệ thống huy hiệu được đồng bộ tự động khi người dùng kết thúc phiên học trên mobile app. Khi thỏa mãn điều kiện, app sẽ tự động ghi nhận vào subcollection <code className="rounded bg-amber-200/50 px-1 py-0.5 font-mono text-xs">users/[uid]/badges</code>.
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng loại huy hiệu"
          value={BADGES_CATALOG.length}
          hint="Huy hiệu chính thức"
          icon={Award}
        />
        <StatCard
          title="Tổng lượt đã trao"
          value={totalBadgesAwarded.toLocaleString('vi-VN')}
          hint="Tổng số huy hiệu người dùng đạt được"
          icon={Sparkles}
        />
        <StatCard
          title="Tổng người học"
          value={totalUsers.toLocaleString('vi-VN')}
          hint="Cơ sở tính tỷ lệ mở khóa"
          icon={CheckCircle2}
        />
      </div>

      {/* Badges Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {BADGES_CATALOG.map((badge) => {
          const unlockedCount = badgeCounts[badge.id] || 0;
          const unlockRate =
            totalUsers > 0 ? ((unlockedCount / totalUsers) * 100).toFixed(1) : '0.0';

          return (
            <Card
              key={badge.id}
              className="flex flex-col justify-between border-[var(--border)] p-5 transition hover:border-gold/60 hover:shadow-museum"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 shadow-sm ring-1 ring-stone-200/70">
                    {renderBadgeIcon(badge.iconName)}
                  </div>
                  <Badge tone={badge.tone}>{badge.id}</Badge>
                </div>

                <h3 className="mt-4 text-lg font-black text-charcoal">{badge.name}</h3>
                <p className="mt-1 text-sm font-medium text-stone-600">
                  {badge.description}
                </p>

                <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50/80 p-3 text-xs leading-relaxed text-stone-600">
                  <span className="font-bold text-charcoal">Điều kiện: </span>
                  {badge.condition}
                </div>
              </div>

              <div className="mt-5 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-500">Đã mở khóa:</span>
                  <span className="font-mono font-bold text-charcoal">
                    {unlockedCount.toLocaleString('vi-VN')} người ({unlockRate}%)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full bg-bronze transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, Number(unlockRate)))}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}
