import {
  Award,
  Crown,
  Diamond,
  Info,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

interface RankTierDef {
  name: string;
  minXP: number;
  maxXP: number;
  description: string;
  color: string;
  tone: 'gold' | 'red' | 'green' | 'neutral' | 'dark';
}

const RANK_TIERS: RankTierDef[] = [
  {
    name: 'Newcomer',
    minXP: 0,
    maxXP: 199,
    description: 'Người mới bắt đầu tìm hiểu dòng chảy lịch sử dân tộc.',
    color: '#9CA3AF',
    tone: 'neutral',
  },
  {
    name: 'Bronze',
    minXP: 200,
    maxXP: 599,
    description: 'Người học cơ bản, đã hoàn thành các mốc kiến thức khởi đầu.',
    color: '#CD7F32',
    tone: 'gold',
  },
  {
    name: 'Silver',
    minXP: 600,
    maxXP: 1199,
    description: 'Chiến binh trung cấp, duy trì thói quen học tập đều đặn.',
    color: '#C0C0C0',
    tone: 'neutral',
  },
  {
    name: 'Gold',
    minXP: 1200,
    maxXP: 2499,
    description: 'Học giả cao cấp, nắm vững đa dạng các thời kỳ lịch sử.',
    color: '#FFD700',
    tone: 'gold',
  },
  {
    name: 'Platinum',
    minXP: 2500,
    maxXP: 4999,
    description: 'Bậc thầy lịch sử, dẫn đầu về hiểu biết và chuỗi kiên trì.',
    color: '#E5E4E2',
    tone: 'dark',
  },
  {
    name: 'Legend',
    minXP: 5000,
    maxXP: Infinity,
    description: 'Huyền thoại sử học, cấp bậc danh giá và vinh dự cao nhất.',
    color: '#FF4500',
    tone: 'red',
  },
];

function renderRankIcon(rankName: string) {
  switch (rankName) {
    case 'Legend':
      return <Crown className="h-6 w-6 text-red-500 fill-red-400" />;
    case 'Platinum':
      return <Diamond className="h-6 w-6 text-slate-700" />;
    case 'Gold':
      return <ShieldCheck className="h-6 w-6 text-amber-500" />;
    case 'Silver':
      return <Shield className="h-6 w-6 text-slate-400" />;
    case 'Bronze':
      return <Shield className="h-6 w-6 text-amber-700" />;
    default:
      return <Award className="h-6 w-6 text-stone-400" />;
  }
}

export default async function RanksCatalogPage() {
  await requireAdmin(['super_admin', 'game_admin', 'analyst', 'viewer']);

  const db = getAdminDb();
  const rankCounts: Record<string, number> = {};
  let totalUsers = 0;

  try {
    const [totalSnap, ...tierSnaps] = await Promise.all([
      db.collection('users').count().get().catch(() => null),
      ...RANK_TIERS.map((tier) =>
        db.collection('users').where('currentRank', '==', tier.name).count().get().catch(() => null),
      ),
    ]);

    totalUsers = totalSnap?.data()?.count ?? 0;

    RANK_TIERS.forEach((tier, idx) => {
      const snap = tierSnaps[idx];
      rankCounts[tier.name] = snap?.data()?.count ?? 0;
    });
  } catch (err) {
    console.error('Error fetching rank stats:', err);
  }

  const legendCount = rankCounts['Legend'] || 0;
  const platinumCount = rankCounts['Platinum'] || 0;

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Người dùng & Game hóa"
        title="Hệ thống cấp bậc xếp hạng (Ranks)"
        description="Quy định ngưỡng điểm kinh nghiệm (XP), thứ tự đẳng cấp người học và cơ cấu phân bổ người chơi qua từng thứ hạng."
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-sm text-stone-700">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="leading-relaxed">
          <span className="font-bold text-charcoal">Cơ chế tự động thăng hạng: </span>
          Cấp bậc người dùng được tính toán tức thì theo tổng số điểm kinh nghiệm (totalXP) tích lũy được từ các trò chơi Quiz, Ghép niên đại và thử thách lịch sử.
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Tổng cấp bậc"
          value={RANK_TIERS.length}
          hint="6 thứ hạng từ Newcomer đến Legend"
          icon={Award}
        />
        <StatCard
          title="Huyền thoại (Legend)"
          value={legendCount.toLocaleString('vi-VN')}
          hint="Người chơi đạt mốc từ 5.000 XP"
          icon={Crown}
        />
        <StatCard
          title="Bạch kim & Huyền thoại"
          value={(legendCount + platinumCount).toLocaleString('vi-VN')}
          hint="Nhóm người chơi tinh hoa cấp cao"
          icon={Sparkles}
        />
      </div>

      {/* Distribution visual progress bar */}
      <div className="mb-8 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-charcoal mb-2">
          Phân bổ tỷ lệ người chơi theo thứ hạng
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Tổng cộng {totalUsers.toLocaleString('vi-VN')} người dùng trên toàn hệ thống
        </p>

        <div className="flex h-5 w-full overflow-hidden rounded-xl bg-stone-100 p-0.5">
          {RANK_TIERS.map((tier) => {
            const count = rankCounts[tier.name] || 0;
            const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={tier.name}
                title={`${tier.name}: ${count} người (${pct.toFixed(1)}%)`}
                className="h-full first:rounded-l-lg last:rounded-r-lg transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: tier.color,
                }}
              />
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          {RANK_TIERS.map((tier) => {
            const count = rankCounts[tier.name] || 0;
            const pct = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0.0';
            return (
              <div key={tier.name} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="font-semibold text-charcoal">{tier.name}:</span>
                <span className="font-mono text-stone-500">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {RANK_TIERS.map((tier, idx) => {
          const count = rankCounts[tier.name] || 0;
          const pct = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0.0';

          return (
            <Card
              key={tier.name}
              className="flex flex-col justify-between border-[var(--border)] p-5 transition hover:border-gold/60 hover:shadow-museum"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 shadow-sm ring-1 ring-stone-200/70">
                    {renderRankIcon(tier.name)}
                  </div>
                  <Badge tone={tier.tone}>Bậc #{idx + 1}</Badge>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-charcoal">{tier.name}</h3>
                  <span className="font-mono text-xs font-black text-bronze">
                    {tier.maxXP === Infinity
                      ? `>= ${tier.minXP.toLocaleString('vi-VN')} XP`
                      : `${tier.minXP.toLocaleString('vi-VN')} – ${tier.maxXP.toLocaleString('vi-VN')} XP`}
                  </span>
                </div>

                <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <div className="mt-5 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-500">Số người đạt bậc:</span>
                  <span className="font-mono font-bold text-charcoal">
                    {count.toLocaleString('vi-VN')} ({pct}%)
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
}
