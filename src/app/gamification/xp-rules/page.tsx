import {
  CheckCircle2,
  Clock,
  Flame,
  Lightbulb,
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

          <div className="rounded-2xl border border-stone-200/90 bg-white px-5 py-3 shadow-sm text-center">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
              Công thức tổng quát
            </div>
            <div className="text-sm font-black text-bronze sm:text-base">
              Tổng XP = (Điểm cơ bản + Thưởng chính xác + Thưởng tốc độ) &times; Hệ số chuỗi ngày
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              (Kết quả được làm tròn lên số nguyên gần nhất nếu có số lẻ)
            </div>
          </div>
        </div>
      </div>

      {/* 4 Pillars of the XP System */}
      <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Base XP */}
        <Card className="border-[var(--border)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-base font-black text-charcoal">1. Điểm cơ bản</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Mỗi câu trả lời đúng được cộng 1 điểm cơ sở:
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-stone-50 p-2.5 text-center text-xs font-bold text-stone-800 border border-stone-200/70">
            Số câu trả lời đúng (tối thiểu 0 điểm)
          </div>
        </Card>

        {/* Accuracy Bonus */}
        <Card className="border-[var(--border)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="mt-3 text-base font-black text-charcoal">2. Thưởng độ chính xác</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Khi người học đạt tỷ lệ đúng từ 80% câu hỏi trở lên:
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-2.5 text-center text-xs font-bold text-emerald-800 border border-emerald-200/80">
            Độ chính xác &ge; 80% &rarr; Cộng 20 XP
          </div>
        </Card>

        {/* Speed Bonus */}
        <Card className="border-[var(--border)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="mt-3 text-base font-black text-charcoal">3. Thưởng tốc độ</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Hoàn thành phiên chơi dưới 30 giây và có ít nhất 1 câu đúng:
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-800 border border-amber-200/80">
            Thời gian &lt; 30 giây &rarr; Cộng 10 XP
          </div>
        </Card>

        {/* Streak Multiplier */}
        <Card className="border-[var(--border)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700 border border-orange-200/60">
              <Flame className="h-5 w-5 fill-orange-500 text-orange-500" />
            </div>
            <h3 className="mt-3 text-base font-black text-charcoal">4. Nhân hệ số chuỗi</h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Duy trì chuỗi học tập liên tục từ 3 ngày trở lên:
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-orange-50 p-2.5 text-center text-xs font-bold text-orange-800 border border-orange-200/80">
            Chuỗi &ge; 3 ngày &rarr; Nhân 1.5 lần
          </div>
        </Card>
      </div>

      {/* Simulator Section */}
      <div className="mb-10">
        <XpSimulatorClient />
      </div>

      {/* Guidance info card */}
      <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-bronze">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="text-sm text-stone-600 leading-relaxed">
            <h4 className="font-bold text-charcoal mb-1">Cơ chế tự động hóa trên ứng dụng di động</h4>
            <p>
              Khi người dùng kết thúc bất kỳ lượt chơi trắc nghiệm hay thử thách niên đại nào, ứng dụng di động sẽ tự động áp dụng công thức trên để tính ra số XP thưởng, cộng dồn vào tổng điểm (<code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-700">totalXP</code>), kiểm tra điều kiện thăng hạng (Rank) và tự động mở khóa các huy hiệu (Badges) tương ứng.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
