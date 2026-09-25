import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuizForm } from '@/components/admin/QuizForm';
import { quizAdminService } from '@/services/quizAdminService';

export const dynamic = 'force-dynamic';

export default async function NewQuizPage() {
  const historicalEvents = await quizAdminService.listHistoricalEvents().catch(() => []);

  return (
    <AdminShell>
      <div className="mb-3 text-sm text-stone-500">
        <Link href="/games" className="font-bold text-bronze hover:underline">
          Trò chơi
        </Link>{' '}
        /{' '}
        <Link href="/games/quizzes" className="font-bold text-bronze hover:underline">
          Quản lý quiz
        </Link>{' '}
        / Tạo bộ quiz mới
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title="Tạo bộ Quiz mới"
        description="Thiết lập bộ câu hỏi mới, định cấu hình thời gian và liên kết với sự kiện lịch sử."
      />

      <QuizForm
        endpoint="/api/admin/games/quizzes"
        returnTo="/games/quizzes"
        historicalEvents={historicalEvents}
      />
    </AdminShell>
  );
}
