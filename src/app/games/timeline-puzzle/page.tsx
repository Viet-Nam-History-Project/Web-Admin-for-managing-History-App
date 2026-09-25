import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/State';
import { TimelineEraTableClient } from '@/components/admin/TimelineEraTableClient';
import { timelineAdminService, AdminTimelineEra } from '@/services/timelineAdminService';

export const dynamic = 'force-dynamic';

export default async function TimelinePuzzlePage() {
  let eras: AdminTimelineEra[] = [];
  let error = '';

  try {
    const result = await timelineAdminService.listEras();
    eras = result.items;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Không tải được danh sách kỷ nguyên.';
  }

  const totalEvents = eras.reduce((sum, e) => sum + (e.eventCount || 0), 0);
  const publishedCount = eras.filter((e) => e.status === 'published').length;

  return (
    <AdminShell>
      <div className="mb-3 text-sm text-stone-500">
        <Link href="/games" className="font-bold text-bronze hover:underline">
          Trò chơi
        </Link>{' '}
        / Ghép niên đại
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title="Quản lý Ghép Niên Đại"
        description="Quản lý các kỷ nguyên lịch sử và danh sách sự kiện mốc thời gian dùng cho minigame thử thách sắp xếp lịch sử."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/content/trash">
              <Button variant="outline">
                <Trash2 className="h-4 w-4" /> Thùng rác
              </Button>
            </Link>
            <Link href="/games/timeline-puzzle/new">
              <Button>
                <Plus className="h-4 w-4" /> Tạo kỷ nguyên mới
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Tổng số Kỷ nguyên</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-charcoal">{eras.length}</span>
            <span className="text-xs text-stone-500">kỷ nguyên</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Đã xuất bản (Published)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{publishedCount}</span>
            <span className="text-xs text-stone-500">thời kỳ khả dụng</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Tổng số mốc sự kiện</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-bronze">{totalEvents}</span>
            <span className="text-xs text-stone-500">mốc thời gian</span>
          </div>
        </div>
      </div>

      {error ? (
        <EmptyState title="Lỗi tải dữ liệu Firestore" description={error} />
      ) : (
        <TimelineEraTableClient eras={eras} />
      )}
    </AdminShell>
  );
}
