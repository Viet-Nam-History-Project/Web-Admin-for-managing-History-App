import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineEraForm } from '@/components/admin/TimelineEraForm';

export const dynamic = 'force-dynamic';

export default function NewTimelineEraPage() {
  return (
    <AdminShell>
      <div className="mb-3 text-sm text-stone-500">
        <Link href="/games" className="font-bold text-bronze hover:underline">
          Trò chơi
        </Link>{' '}
        /{' '}
        <Link href="/games/timeline-puzzle" className="font-bold text-bronze hover:underline">
          Ghép niên đại
        </Link>{' '}
        / Tạo kỷ nguyên mới
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title="Tạo Kỷ nguyên mới"
        description="Thêm một thời kỳ lịch sử mới cho minigame thử thách sắp xếp dòng thời gian."
      />

      <TimelineEraForm
        endpoint="/api/admin/games/timeline-puzzle"
        returnTo="/games/timeline-puzzle"
      />
    </AdminShell>
  );
}
