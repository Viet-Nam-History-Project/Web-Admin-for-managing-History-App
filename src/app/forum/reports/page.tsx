import { Fragment } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Search, SearchCheck, XCircle } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { EmptyState } from '@/components/ui/State';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { ExportReportsButton } from '@/components/forum/ExportReportsButton';
import { ReportModerationActions } from '@/components/forum/ReportModerationActions';
import { formatAdminDateTime } from '@/lib/utils/historicalDate';
import { forumAdminService, ForumReportStatus } from '@/services/forumAdminService';

export const dynamic = 'force-dynamic';

const reasonOptions = [
  ['spam', 'Spam hoặc quảng cáo'],
  ['harassment', 'Quấy rối hoặc xúc phạm'],
  ['hate_speech', 'Ngôn từ thù ghét'],
  ['historical_misinformation', 'Thông tin lịch sử sai lệch'],
  ['inappropriate_content', 'Nội dung không phù hợp'],
  ['impersonation', 'Mạo danh người khác'],
  ['other', 'Vi phạm khác'],
] as const;

const statusLabel: Record<ForumReportStatus, string> = {
  pending: 'Chờ xử lý',
  reviewing: 'Đang kiểm tra',
  resolved: 'Đã xử lý',
  dismissed: 'Đã bỏ qua',
};

const statusTone: Record<ForumReportStatus, 'gold' | 'red' | 'green' | 'neutral'> = {
  pending: 'red',
  reviewing: 'gold',
  resolved: 'green',
  dismissed: 'neutral',
};

export default async function ForumReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; reason?: string; search?: string }>;
}) {
  const filters = await searchParams;
  const appliedFilters = { ...filters, status: filters.status ?? 'pending' };
  const result = await forumAdminService.listReports(appliedFilters).catch(() => ({
    items: [],
    stats: { total: 0, pending: 0, reviewing: 0, resolved: 0, dismissed: 0 },
  }));

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Cộng đồng"
        title="Báo cáo vi phạm"
        description="Kiểm tra báo cáo từ Sử đàn, ghi nhận kết quả và ẩn nội dung vi phạm khỏi ứng dụng."
        actions={<ExportReportsButton rows={result.items.map((item) => [formatAdminDateTime(item.createdAt), statusLabel[item.status], item.reasonLabel, item.postTitle, item.reporterName, item.reportedUserName, item.description])} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Tổng báo cáo" value={result.stats.total} icon={AlertTriangle} />
        <StatCard title="Chờ xử lý" value={result.stats.pending} icon={Clock3} />
        <StatCard title="Đang kiểm tra" value={result.stats.reviewing} icon={SearchCheck} />
        <StatCard title="Đã xử lý" value={result.stats.resolved} icon={CheckCircle2} />
        <StatCard title="Đã bỏ qua" value={result.stats.dismissed} icon={XCircle} />
      </div>

      <form className="my-5 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="grid min-w-72 flex-1 gap-1">
          <span className="text-xs font-bold text-stone-500">Tìm kiếm</span>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
            <Input name="search" defaultValue={filters.search} className="w-full pl-9" placeholder="Tiêu đề, người dùng hoặc mô tả" />
          </div>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-stone-500">Trạng thái</span>
          <select name="status" defaultValue={appliedFilters.status} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="reviewing">Đang kiểm tra</option>
            <option value="resolved">Đã xử lý</option>
            <option value="dismissed">Đã bỏ qua</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-stone-500">Loại vi phạm</span>
          <select name="reason" defaultValue={filters.reason ?? 'all'} className="h-11 max-w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm">
            <option value="all">Tất cả</option>
            {reasonOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Button type="submit">Lọc dữ liệu</Button>
        <Link href="/forum/reports"><Button type="button" variant="outline">Đặt lại</Button></Link>
      </form>

      {result.items.length ? (
        <DataTable className="min-w-[1180px]">
          <TableHead><TableRow><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Vi phạm</TableHeaderCell><TableHeaderCell>Bài viết</TableHeaderCell><TableHeaderCell>Người báo cáo</TableHeaderCell><TableHeaderCell>Người bị báo cáo</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell></TableRow></TableHead>
          <tbody>
            {result.items.map((item) => (
              <Fragment key={item.path}>
                <TableRow>
                  <TableCell className="whitespace-nowrap">{formatAdminDateTime(item.createdAt)}</TableCell>
                  <TableCell><p className="font-bold text-charcoal">{item.reasonLabel}</p><p className="mt-1 max-w-64 text-xs text-stone-500 line-clamp-2">{item.description}</p></TableCell>
                  <TableCell><p className="max-w-72 font-black text-charcoal">{item.postTitle}</p><p className="mt-1 text-xs text-stone-500">ID: {item.postId}</p></TableCell>
                  <TableCell><p className="font-semibold">{item.reporterName}</p><p className="text-xs text-stone-500">{item.reporterEmail || item.reporterId}</p></TableCell>
                  <TableCell><p className="font-semibold">{item.reportedUserName}</p>{item.reportedUserId ? <Link className="text-xs font-bold text-bronze hover:underline" href={`/users/${item.reportedUserId}`}>Xem người dùng</Link> : null}</TableCell>
                  <TableCell><Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge></TableCell>
                </TableRow>
                <TableRow className="bg-black/[0.025]">
                  <TableCell colSpan={6} className="p-5">
                    <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
                      <div className="grid gap-4">
                        <div><p className="text-xs font-black uppercase tracking-wide text-stone-500">Mô tả của người báo cáo</p><p className="mt-2 whitespace-pre-wrap leading-6 text-charcoal">{item.description || 'Không có mô tả.'}</p></div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-stone-500">Nội dung đầy đủ của bài viết</p>
                          <h3 className="mt-2 text-lg font-black text-charcoal">{item.postTitle}</h3>
                          <p className="mt-2 whitespace-pre-wrap leading-6 text-stone-600">{item.postContent || 'Không có nội dung bài viết.'}</p>
                        </div>
                      </div>
                      <ReportModerationActions reportPath={item.path} status={item.status} postHidden={item.postHidden} initialNote={item.moderatorNote} />
                    </div>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState title="Không có báo cáo phù hợp" description="Báo cáo mới từ ứng dụng sẽ xuất hiện tại đây." />
      )}
    </AdminShell>
  );
}
