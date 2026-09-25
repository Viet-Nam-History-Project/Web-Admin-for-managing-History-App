import Link from 'next/link';
import { Plus, Trash2, Gamepad2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/State';
import { QuizTableClient } from '@/components/admin/QuizTableClient';
import { quizAdminService, AdminQuizItem } from '@/services/quizAdminService';

export const dynamic = 'force-dynamic';

export default async function QuizzesPage() {
  let quizzes: AdminQuizItem[] = [];
  let error = '';

  try {
    const result = await quizAdminService.listQuizzes();
    quizzes = result.items;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Không tải được danh sách quiz.';
  }

  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questionCount || 0), 0);
  const publishedCount = quizzes.filter((q) => q.status === 'published').length;

  return (
    <AdminShell>
      <div className="mb-3 text-sm text-stone-500">
        <Link href="/games" className="font-bold text-bronze hover:underline">
          Trò chơi
        </Link>{' '}
        / Quản lý quiz
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title="Quản lý Quiz Lịch Sử"
        description="Quản lý các bộ câu hỏi ôn tập lịch sử, độ khó, thời gian và sự kiện lịch sử liên kết với ứng dụng người dùng."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/content/trash">
              <Button variant="outline">
                <Trash2 className="h-4 w-4" /> Thùng rác
              </Button>
            </Link>
            <Link href="/games/quizzes/new">
              <Button>
                <Plus className="h-4 w-4" /> Tạo bộ quiz mới
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Tổng số bộ Quiz</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-charcoal">{quizzes.length}</span>
            <span className="text-xs text-stone-500">bộ đề</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Đã xuất bản (Published)</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{publishedCount}</span>
            <span className="text-xs text-stone-500">bộ đề khả dụng</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Tổng số câu hỏi trắc nghiệm</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-bronze">{totalQuestions}</span>
            <span className="text-xs text-stone-500">câu hỏi</span>
          </div>
        </div>
      </div>

      {error ? (
        <EmptyState title="Lỗi tải dữ liệu Firestore" description={error} />
      ) : (
        <QuizTableClient quizzes={quizzes} />
      )}
    </AdminShell>
  );
}
