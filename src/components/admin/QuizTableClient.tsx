'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Eye, Edit3, HelpCircle, Landmark, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { AdminQuizItem } from '@/services/quizAdminService';

function levelTone(level: string): 'green' | 'gold' | 'red' | 'neutral' {
  const l = level.toLowerCase();
  if (l.includes('dễ') || l.includes('easy')) return 'green';
  if (l.includes('khó') || l.includes('hard')) return 'red';
  return 'gold';
}

export function QuizTableClient({ quizzes }: { quizzes: AdminQuizItem[] }) {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return quizzes.filter((q) => {
      const matchQuery =
        !query ||
        q.description.toLowerCase().includes(query.toLowerCase()) ||
        q.quizzslug.toLowerCase().includes(query.toLowerCase()) ||
        q.eventID?.title.toLowerCase().includes(query.toLowerCase());

      const matchLevel =
        levelFilter === 'all' || q.level.toLowerCase() === levelFilter.toLowerCase();

      const matchStatus = statusFilter === 'all' || (q.status ?? 'published') === statusFilter;

      return matchQuery && matchLevel && matchStatus;
    });
  }, [quizzes, query, levelFilter, statusFilter]);

  const distinctLevels = useMemo(() => {
    return Array.from(new Set(quizzes.map((q) => q.level))).filter(Boolean);
  }, [quizzes]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
        <div className="relative min-w-72 flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pl-10 pr-4 text-sm outline-none transition focus:border-bronze focus:ring-4 focus:ring-gold/15"
            placeholder="Tìm theo tên bộ quiz, slug hoặc sự kiện..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm font-medium text-stone-700 outline-none"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">Tất cả cấp độ</option>
            {distinctLevels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>

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
          title="Không tìm thấy bộ Quiz nào"
          description={
            quizzes.length === 0
              ? 'Chưa có bộ quiz nào trong hệ thống. Hãy tạo bộ quiz đầu tiên!'
              : 'Không có bộ quiz nào phù hợp với bộ lọc hiện tại.'
          }
        />
      ) : (
        <DataTable className="min-w-[1050px]">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Bộ câu hỏi (Quiz)</TableHeaderCell>
              <TableHeaderCell>Sự kiện lịch sử</TableHeaderCell>
              <TableHeaderCell>Cấp độ</TableHeaderCell>
              <TableHeaderCell>Số câu hỏi</TableHeaderCell>
              <TableHeaderCell>Thời gian</TableHeaderCell>
              <TableHeaderCell>Trạng thái</TableHeaderCell>
              <TableHeaderCell>Thao tác</TableHeaderCell>
            </TableRow>
          </TableHead>
          <tbody>
            {filtered.map((quiz) => (
              <TableRow key={quiz.id}>
                <TableCell>
                  <Link
                    href={`/games/quizzes/${quiz.id}`}
                    className="font-black text-charcoal hover:text-bronze"
                  >
                    {quiz.description || quiz.id}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-stone-500">{quiz.id}</p>
                </TableCell>

                <TableCell>
                  {quiz.eventID ? (
                    <div className="flex items-start gap-1.5 text-xs text-stone-700">
                      <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bronze" />
                      <span className="line-clamp-2" title={quiz.eventID.title}>
                        {quiz.eventID.title}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs italic text-stone-400">Chung</span>
                  )}
                </TableCell>

                <TableCell>
                  <Badge tone={levelTone(quiz.level)}>{quiz.level}</Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <HelpCircle className="h-4 w-4 text-bronze" />
                    <span>{quiz.questionCount ?? 0} câu</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-stone-600">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    <span>{quiz.settings?.timeLimit ?? 60}s</span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge tone={quiz.status === 'published' ? 'green' : 'gold'}>
                    {quiz.status === 'published'
                      ? 'Đã xuất bản'
                      : quiz.status === 'draft'
                        ? 'Bản nháp'
                        : quiz.status ?? 'published'}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/games/quizzes/${quiz.id}`}>
                      <Button variant="ghost" title="Xem danh sách câu hỏi">
                        <Eye className="h-3.5 w-3.5" /> Chi tiết
                      </Button>
                    </Link>

                    <Link href={`/games/quizzes/${quiz.id}/edit`}>
                      <Button variant="outline" title="Chỉnh sửa bộ đề">
                        <Edit3 className="h-3.5 w-3.5" /> Sửa
                      </Button>
                    </Link>

                    <EntityActionButton
                      url={`/api/admin/games/quizzes/${quiz.id}?action=${quiz.status === 'published' ? 'unpublish' : 'publish'}`}
                      label={quiz.status === 'published' ? 'Gỡ' : 'Đăng'}
                    />

                    <EntityActionButton
                      method="DELETE"
                      url={`/api/admin/games/quizzes/${quiz.id}`}
                      variant="danger"
                      label="Xóa"
                      confirmMessage={`Bạn có chắc chắn muốn xóa mềm bộ quiz “${quiz.description || quiz.id}”? Bạn có thể khôi phục lại từ Thùng rác.`}
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
