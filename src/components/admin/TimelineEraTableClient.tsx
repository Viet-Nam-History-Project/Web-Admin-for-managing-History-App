'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Edit3, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { AdminTimelineEra } from '@/services/timelineAdminService';

export function TimelineEraTableClient({ eras }: { eras: AdminTimelineEra[] }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return eras.filter((era) => {
      const matchQuery =
        !query ||
        era.title.toLowerCase().includes(query.toLowerCase()) ||
        era.eraId.toLowerCase().includes(query.toLowerCase()) ||
        (era.description && era.description.toLowerCase().includes(query.toLowerCase()));

      const matchStatus = statusFilter === 'all' || (era.status ?? 'published') === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [eras, query, statusFilter]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
        <div className="relative min-w-72 flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pl-10 pr-4 text-sm outline-none transition focus:border-bronze focus:ring-4 focus:ring-gold/15"
            placeholder="Tìm theo tên kỷ nguyên, mã eraId hoặc mô tả..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm font-medium text-stone-700 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy Kỷ nguyên nào"
          description={
            eras.length === 0
              ? 'Chưa có kỷ nguyên nào trong hệ thống. Hãy tạo kỷ nguyên đầu tiên!'
              : 'Không có kỷ nguyên nào phù hợp với từ khóa tìm kiếm.'
          }
        />
      ) : (
        <DataTable className="min-w-[1000px]">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Ảnh</TableHeaderCell>
              <TableHeaderCell>Kỷ nguyên lịch sử</TableHeaderCell>
              <TableHeaderCell>Mô tả tóm tắt</TableHeaderCell>
              <TableHeaderCell>Số mốc sự kiện</TableHeaderCell>
              <TableHeaderCell>Trạng thái</TableHeaderCell>
              <TableHeaderCell>Thao tác</TableHeaderCell>
            </TableRow>
          </TableHead>
          <tbody>
            {filtered.map((era) => (
              <TableRow key={era.id}>
                <TableCell>
                  <div className="h-12 w-20 overflow-hidden rounded-lg bg-stone-200">
                    {era.coverMediaRef ? (
                      <img
                        className="h-full w-full object-cover"
                        src={era.coverMediaRef}
                        alt={era.title}
                      />
                    ) : null}
                  </div>
                </TableCell>

                <TableCell>
                  <Link
                    href={`/games/timeline-puzzle/${era.id}`}
                    className="font-black text-charcoal hover:text-bronze"
                  >
                    {era.title}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-stone-500">{era.eraId}</p>
                </TableCell>

                <TableCell>
                  <p className="line-clamp-2 max-w-sm text-xs leading-relaxed text-stone-600">
                    {era.description || 'Chưa có mô tả.'}
                  </p>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Calendar className="h-4 w-4 text-bronze" />
                    <span>{era.eventCount ?? era.events?.length ?? 0} mốc</span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge tone={era.status === 'published' ? 'green' : 'gold'}>
                    {era.status === 'published'
                      ? 'Đã xuất bản'
                      : era.status === 'draft'
                        ? 'Bản nháp'
                        : era.status ?? 'published'}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/games/timeline-puzzle/${era.id}`}>
                      <Button variant="ghost" title="Quản lý các mốc sự kiện">
                        <Eye className="h-3.5 w-3.5" /> Chi tiết
                      </Button>
                    </Link>

                    <Link href={`/games/timeline-puzzle/${era.id}/edit`}>
                      <Button variant="outline" title="Chỉnh sửa kỷ nguyên">
                        <Edit3 className="h-3.5 w-3.5" /> Sửa
                      </Button>
                    </Link>

                    <EntityActionButton
                      url={`/api/admin/games/timeline-puzzle/${era.id}?action=${era.status === 'published' ? 'unpublish' : 'publish'}`}
                      label={era.status === 'published' ? 'Gỡ' : 'Đăng'}
                    />

                    <EntityActionButton
                      method="DELETE"
                      url={`/api/admin/games/timeline-puzzle/${era.id}`}
                      variant="danger"
                      label="Xóa"
                      confirmMessage={`Bạn có chắc muốn xóa mềm kỷ nguyên “${era.title}”? Bạn có thể khôi phục lại từ Thùng rác.`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
