import { RotateCcw } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { PermanentDeleteButton } from '@/components/admin/PermanentDeleteButton';
import { trashAdminService } from '@/services/trashAdminService';
import { formatAdminDateTime } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';
const entityTypeLabels: Record<string, string> = { period: 'Thời kỳ', stage: 'Giai đoạn', event: 'Sự kiện' };
export default async function TrashPage() {
  const items = await trashAdminService.list().catch(() => []);
  return <AdminShell><PageHeader eyebrow="Nội dung" title="Thùng rác" description="Xem lại nội dung đã xóa, khôi phục khi cần hoặc xóa vĩnh viễn." />
    {items.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Nội dung</TableHeaderCell><TableHeaderCell>Đã xóa</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{items.map((item) => <TableRow key={item.id}><TableCell><Badge tone="red">{entityTypeLabels[item.entityType] ?? 'Nội dung'}</Badge></TableCell><TableCell className="font-bold text-charcoal">{item.title}</TableCell><TableCell>{formatAdminDateTime(item.deletedAt)}</TableCell><TableCell>{item.restoreAvailable ? 'Có thể khôi phục' : 'Đã khôi phục'}</TableCell><TableCell>{item.restoreAvailable ? <div className="flex flex-wrap gap-2"><EntityActionButton url="/api/admin/trash" method="PATCH" label="Khôi phục" body={{ trashId: item.id }} /><PermanentDeleteButton trashId={item.id} title={item.title} /></div> : <RotateCcw className="h-4 w-4 text-emerald-600" />}</TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Thùng rác trống" description="Nội dung bị xóa sẽ xuất hiện tại đây." />}
  </AdminShell>;
}
