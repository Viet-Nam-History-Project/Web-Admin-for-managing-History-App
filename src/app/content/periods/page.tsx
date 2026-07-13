import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { CoverImage } from '@/components/ui/CoverImage';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { ExportPeriodsButton } from '@/components/admin/ExportPeriodsButton';
import { periodAdminService, AdminPeriod } from '@/services/periodAdminService';
import { formatAdminDateTime, formatHistoricalRange } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';

export default async function PeriodsPage() {
  let periods: AdminPeriod[] = [];
  let error = '';
  try { periods = (await periodAdminService.list()).items; }
  catch (err) { error = err instanceof Error ? err.message : 'Không tải được thời kỳ.'; }

  return (
    <AdminShell>
      <PageHeader eyebrow="Nội dung" title="Quản lý nội dung lịch sử" description="Trung tâm quản lý thời kỳ, giai đoạn và sự kiện lịch sử."
        actions={<><ExportPeriodsButton /><Link href="/content/trash"><Button variant="outline"><Trash2 className="h-4 w-4" /> Thùng rác</Button></Link><Link href="/content/periods/new"><Button><Plus className="h-4 w-4" /> Tạo thời kỳ</Button></Link></>} />
      {error ? <EmptyState title="Không tải được Firestore" description={error} /> : periods.length === 0 ? <EmptyState title="Chưa có thời kỳ" description="Tạo thời kỳ đầu tiên hoặc kiểm tra cấu hình Firebase Admin." /> : (
        <DataTable className="min-w-[1320px]">
          <TableHead><TableRow><TableHeaderCell>Ảnh</TableHeaderCell><TableHeaderCell>Thời kỳ</TableHeaderCell><TableHeaderCell>Niên đại</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Stages</TableHeaderCell><TableHeaderCell>Events</TableHeaderCell><TableHeaderCell>Graph</TableHeaderCell><TableHeaderCell>Cập nhật</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead>
          <tbody>{periods.map((period) => {
            const slug = period.slug ?? period.id;
            return <TableRow key={period.id}>
              <TableCell><div className="h-12 w-20 overflow-hidden rounded-md bg-stone-200"><CoverImage source={period.coverMediaRef} alt={period.title} /></div></TableCell>
              <TableCell><Link href={`/content/periods/${slug}`} className="font-black text-charcoal hover:text-bronze">{period.title}</Link><p className="mt-1 text-xs text-stone-500">{slug}</p></TableCell>
              <TableCell>{formatHistoricalRange(period.startDate, period.endDate)}</TableCell>
              <TableCell><Badge tone={period.status === 'published' ? 'green' : 'gold'}>{period.status ?? 'draft'}</Badge></TableCell>
              <TableCell>{period.stageCount ?? 0}</TableCell><TableCell>{period.eventCount ?? 0}</TableCell>
              <TableCell><Badge tone={period.graphSyncStatus === 'synced' ? 'green' : period.graphSyncStatus === 'error' ? 'red' : 'neutral'}>{period.graphSyncStatus ?? 'pending'}</Badge></TableCell>
              <TableCell>{formatAdminDateTime(period.updatedAt ?? period.updated_at)}</TableCell>
              <TableCell><div className="flex flex-wrap gap-2"><Link href={`/content/periods/${slug}`}><Button variant="ghost">Mở</Button></Link><Link href={`/content/periods/${slug}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton url={`/api/admin/periods/${slug}?action=${period.status === 'published' ? 'unpublish' : 'publish'}`} label={period.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton url={`/api/admin/periods/${slug}`} method="DELETE" variant="danger" label="Xóa" confirmMessage={`Xóa mềm thời kỳ “${period.title}”? Stages/events sẽ được giữ nguyên để phục hồi.`} /></div></TableCell>
            </TableRow>;
          })}</tbody>
        </DataTable>
      )}
    </AdminShell>
  );
}
