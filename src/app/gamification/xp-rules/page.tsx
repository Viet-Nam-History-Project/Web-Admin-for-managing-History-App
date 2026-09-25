import {
  CheckCircle2,
  Clock,
  Code2,
  Flame,
  Sparkles,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { XpSimulatorClient } from '@/components/admin/XpSimulatorClient';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

export default async function XpRulesPage() {
  await requireAdmin(['super_admin', 'game_admin', 'analyst', 'viewer']);

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Người dùng & Game hóa"
        title="Quy tắc tính điểm kinh nghiệm (XP Rules)"
        description="Chi tiết công thức tính toán điểm kinh nghiệm, các khoản thưởng khuyến khích (thưởng chính xác, thưởng tốc độ) và hệ số nhân chuỗi ngày học."
      />

      {/* Overview formula banner */}
      <div className="mb-8 rounded-3xl border border-gold/40 bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-amber-50/10 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/25 text-bronze ring-1 ring-gold/40">
              <Sparkles className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-black text-charcoal sm:text-xl">
                Công thức chuẩn hóa điểm thưởng
              </h2>
              <p className="text-xs text-stone-600">
                Áp dụng đồng nhất cho tất cả trò chơi trong ứng dụng di động
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 font-mono text-xs font-black text-bronze shadow-sm sm:text-sm">
            Total XP = Math.ceil((Base XP + Accuracy Bonus + Speed Bonus) &times; Streak Multiplier)
          </div>
        </div>
      </div>

      {/* 4 Pillars of the XP System */}
      <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Base XP */}
        <Card className="border-[var(--border)] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-black text-charcoal">1. Điểm cơ bản (Base XP)</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Mỗi câu trả lời đúng được quy đổi trực tiếp thành điểm cơ sở:
          </p>
          <div className="mt-3 rounded-lg bg-stone-50 p-2 font-mono text-xs font-bold text-stone-800">
            Base XP = max(0, score)
          </div>
        </Card>

        {/* Accuracy Bonus */}
        <Card className="border-[var(--border)] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="mt-3 text-base font-black text-charcoal">2. Thưởng chính xác</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Khi người học trả lời đúng từ 80% câu hỏi trở lên:
          </p>
          <div className="mt-3 rounded-lg bg-emerald-50/80 p-2 font-mono text-xs font-bold text-emerald-800 border border-emerald-200/50">
            Accuracy &ge; 80% &rarr; +20 XP
          </div>
        </Card>

        {/* Speed Bonus */}
        <Card className="border-[var(--border)] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="mt-3 text-base font-black text-charcoal">3. Thưởng tốc độ</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Hoàn thành toàn bộ câu hỏi trong thời gian ngắn và có điểm:
          </p>
          <div className="mt-3 rounded-lg bg-amber-50/80 p-2 font-mono text-xs font-bold text-amber-800 border border-amber-200/50">
            Time &lt; 30s &rarr; +10 XP
          </div>
        </Card>

        {/* Streak Multiplier */}
        <Card className="border-[var(--border)] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700 border border-orange-200/60">
            <Flame className="h-5 w-5 fill-orange-500 text-orange-500" />
          </div>
          <h3 className="mt-3 text-base font-black text-charcoal">4. Nhân chuỗi ngày</h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            Duy trì chuỗi học liên tục từ 3 ngày trở lên sẽ được kích hoạt nhân:
          </p>
          <div className="mt-3 rounded-lg bg-orange-50/80 p-2 font-mono text-xs font-bold text-orange-800 border border-orange-200/50">
            Streak &ge; 3 ngày &rarr; &times; 1.5
          </div>
        </Card>
      </div>

      {/* Simulator Section */}
      <div className="mb-10">
        <XpSimulatorClient />
      </div>

      {/* Code reference card */}
      <div className="rounded-2xl border border-stone-200/80 bg-stone-900 p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-stone-400 text-xs font-mono mb-3">
          <Code2 className="h-4 w-4" />
          <span>VietNamHistoryNativeReactApp / src / services / xpService.ts</span>
        </div>
        <pre className="overflow-x-auto text-xs font-mono text-stone-200 leading-relaxed">
{`export function calculateXP(params: XPCalculationParams): XPBreakdown {
  const { score, correctAnswers, totalQuestions, timeTaken, currentStreak } = params;

  const baseXP = Math.max(0, score);
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  const accuracyBonus = accuracy >= 0.8 ? 20 : 0;
  const speedBonus = timeTaken < 30 ? 10 : 0;
  const streakMultiplier = currentStreak >= 3 ? 1.5 : 1;

  const rawTotal = (baseXP + accuracyBonus + speedBonus) * streakMultiplier;
  const totalXP = Math.ceil(rawTotal);

  return { baseXP, accuracyBonus, speedBonus, streakMultiplier, totalXP };
}`}
        </pre>
      </div>
    </AdminShell>
  );
}
