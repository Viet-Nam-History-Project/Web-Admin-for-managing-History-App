import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { TimelineEraForm } from '@/components/admin/TimelineEraForm';
import { timelineAdminService } from '@/services/timelineAdminService';

export const dynamic = 'force-dynamic';

export default async function EditTimelineEraPage({
  params,
}: {
  params: Promise<{ eraId: string }>;
}) {
  const { eraId } = await params;
  const era = await timelineAdminService.getEra(eraId).catch(() => null);

  if (!era) {
    notFound();
  }

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
        /{' '}
        <Link href={`/games/timeline-puzzle/${eraId}`} className="font-bold text-bronze hover:underline">
          {era.title}
        </Link>{' '}
        / Chỉnh sửa
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title="Chỉnh sửa Kỷ nguyên"
        description={`Cập nhật tên, mô tả và thứ tự hiển thị của kỷ nguyên “${era.title}”.`}
      />

      <TimelineEraForm
        editing
        initial={era}
        endpoint={`/api/admin/games/timeline-puzzle/${eraId}`}
        returnTo={`/games/timeline-puzzle/${eraId}`}
      />
    </AdminShell>
  );
}
