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
export default async function TrashPage() {
  const items = await trashAdminService.list().catch(() => []);
  return <AdminShell><PageHeader eyebrow="Nội dung" title="Thùng rác" description="Dữ liệu bị xóa mềm vẫn nằm nguyên tại Firestore. Khôi phục sẽ trả lại trạng thái trước khi xóa và ghi audit log." />
    {items.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Nội dung</TableHeaderCell><TableHeaderCell>Đường dẫn</TableHeaderCell><TableHeaderCell>Đã xóa</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{items.map((item) => <TableRow key={item.id}><TableCell><Badge tone="red">{item.entityType}</Badge></TableCell><TableCell className="font-bold text-charcoal">{item.title}<p className="text-xs font-normal text-stone-500">{item.slug}</p></TableCell><TableCell className="max-w-72 truncate text-xs">{item.entityPath}</TableCell><TableCell>{formatAdminDateTime(item.deletedAt)}</TableCell><TableCell>{item.restoreAvailable ? 'Có thể khôi phục' : 'Đã khôi phục'}</TableCell><TableCell>{item.restoreAvailable ? <div className="flex flex-wrap gap-2"><EntityActionButton url="/api/admin/trash" method="PATCH" label="Khôi phục" body={{ trashId: item.id }} /><PermanentDeleteButton trashId={item.id} title={item.title} /></div> : <RotateCcw className="h-4 w-4 text-emerald-600" />}</TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Thùng rác trống" description="Các period, stage và event bị xóa mềm sẽ xuất hiện tại đây." />}
  </AdminShell>;
}
