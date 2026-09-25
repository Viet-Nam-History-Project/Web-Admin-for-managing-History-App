import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Edit3, History, Image as ImageIcon, MapPin } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { TimelineDetailClient } from '@/components/admin/TimelineDetailClient';
import { timelineAdminService } from '@/services/timelineAdminService';

export const dynamic = 'force-dynamic';

export default async function TimelineEraDetailPage({
  params,
}: {
  params: Promise<{ eraId: string }>;
}) {
  const { eraId } = await params;
  const era = await timelineAdminService.getEra(eraId).catch(() => null);

  if (!era) {
    notFound();
  }

  const events = era.events ?? [];
  const years = events.map((e) => e.year).filter((y) => typeof y === 'number');
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;

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
        / {era.title}
      </div>

      <PageHeader
        eyebrow="Trò chơi · Ghép niên đại"
        title={era.title}
        description={era.description || `Mã định danh: ${era.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/games/timeline-puzzle/${eraId}/edit`}>
              <Button variant="outline">
                <Edit3 className="h-4 w-4" /> Sửa giai đoạn
              </Button>
            </Link>

            <EntityActionButton
              method="DELETE"
              url={`/api/admin/games/timeline-puzzle/${eraId}`}
              variant="danger"
              label="Xóa giai đoạn"
              confirmMessage={`Xóa giai đoạn “${era.title}”? Bạn có thể khôi phục lại từ Thùng rác.`}
            />
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <History className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Số lượng sự kiện</p>
            <p className="mt-1 text-base font-black text-charcoal">
              {events.length} mốc lịch sử
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Khung thời gian</p>
            <p className="mt-1 text-base font-black text-charcoal">
              {minYear !== null && maxYear !== null
                ? minYear === maxYear
                  ? `Năm ${minYear}`
                  : `Năm ${minYear} – ${maxYear}`
                : 'Chưa có mốc năm'}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Ảnh bìa giai đoạn</p>
            <p className="mt-1 truncate text-xs font-medium text-stone-700">
              {era.coverMediaRef || era.thumbnailUrl ? (
                <a
                  href={era.coverMediaRef || era.thumbnailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-bronze hover:underline"
                >
                  Xem ảnh bìa
                </a>
              ) : (
                'Chưa đặt ảnh bìa'
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* Events Client Management */}
      <TimelineDetailClient era={era} initialEvents={events} />
    </AdminShell>
  );
}
