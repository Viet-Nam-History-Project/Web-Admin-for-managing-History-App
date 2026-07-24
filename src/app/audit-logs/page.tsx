import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { auditAdminService } from '@/services/auditAdminService';
import { formatAdminDateTime } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';

const actionLabels: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  publish: 'Xuất bản',
  unpublish: 'Gỡ xuất bản',
  soft_delete: 'Chuyển vào thùng rác',
  restore: 'Khôi phục',
  permanent_delete: 'Xóa vĩnh viễn',
  delete: 'Xóa',
  index: 'Lập chỉ mục',
  pdf_index: 'Lập chỉ mục tài liệu',
  knowledge_index: 'Lập chỉ mục tài liệu',
  user_ban: 'Khóa tài khoản',
  user_unban: 'Mở khóa tài khoản',
};

const entityTypeLabels: Record<string, string> = {
  period: 'Thời kỳ',
  stage: 'Giai đoạn',
  event: 'Sự kiện',
  person: 'Nhân vật',
  article: 'Bài viết',
  report: 'Báo cáo',
  user: 'Người dùng',
  knowledge_source: 'Tài liệu',
};

export default async function AuditLogsPage() {
  const logs = (await auditAdminService.list().catch(() => ({ items: [] }))).items;
  return <AdminShell><PageHeader eyebrow="Hệ thống" title="Nhật ký hoạt động" description="Theo dõi các thay đổi quan trọng do quản trị viên thực hiện." />{logs.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Quản trị viên</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Đối tượng</TableHeaderCell></TableRow></TableHead><tbody>{logs.map((log) => <TableRow key={log.id}><TableCell>{formatAdminDateTime(log.createdAt)}</TableCell><TableCell>{log.actorEmail ?? 'Hệ thống'}</TableCell><TableCell><Badge tone={log.action === 'soft_delete' ? 'red' : 'gold'}>{actionLabels[log.action ?? ''] ?? 'Cập nhật'}</Badge></TableCell><TableCell>{entityTypeLabels[log.entityType ?? ''] ?? 'Nội dung'}</TableCell><TableCell className="font-bold">{log.entityTitle ?? 'Không có tiêu đề'}</TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có hoạt động" description="Các thay đổi quan trọng sẽ xuất hiện tại đây." />}</AdminShell>;
}
