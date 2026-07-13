import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { auditAdminService } from '@/services/auditAdminService';
import { formatAdminDateTime } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';
export default async function AuditLogsPage() {
  const logs = (await auditAdminService.list().catch(() => ({ items: [] }))).items;
  return <AdminShell><PageHeader eyebrow="Hệ thống" title="Audit logs" description="Dấu vết create, update, publish, unpublish, soft delete, restore và graph sync của quản trị viên." />{logs.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Admin</TableHeaderCell><TableHeaderCell>Action</TableHeaderCell><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Đối tượng</TableHeaderCell><TableHeaderCell>Firestore path</TableHeaderCell></TableRow></TableHead><tbody>{logs.map((log) => <TableRow key={log.id}><TableCell>{formatAdminDateTime(log.createdAt)}</TableCell><TableCell>{log.actorEmail ?? 'system'}</TableCell><TableCell><Badge tone={log.action === 'soft_delete' ? 'red' : 'gold'}>{log.action}</Badge></TableCell><TableCell>{log.entityType}</TableCell><TableCell className="font-bold">{log.entityTitle ?? 'N/A'}</TableCell><TableCell className="max-w-80 truncate text-xs">{log.entityPath}</TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có audit log" description="Thao tác quản trị mới sẽ được lưu trong admin_audit_logs." />}</AdminShell>;
}
