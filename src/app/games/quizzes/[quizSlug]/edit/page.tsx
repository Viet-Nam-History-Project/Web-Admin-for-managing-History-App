import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuizForm } from '@/components/admin/QuizForm';
import { quizAdminService } from '@/services/quizAdminService';

export const dynamic = 'force-dynamic';

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ quizSlug: string }>;
}) {
  const { quizSlug } = await params;
  const quiz = await quizAdminService.getQuiz(quizSlug).catch(() => null);

  if (!quiz) {
    notFound();
  }

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
        /{' '}
        <Link href={`/games/quizzes/${quizSlug}`} className="font-bold text-bronze hover:underline">
          {quiz.quizzslug}
        </Link>{' '}
        / Chỉnh sửa
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title="Chỉnh sửa bộ Quiz"
        description={`Cập nhật thông tin nhận diện, cấp độ và liên kết sự kiện cho bộ câu hỏi “${quiz.description}”.`}
      />

      <QuizForm
        editing
        initial={quiz}
        endpoint={`/api/admin/games/quizzes/${quizSlug}`}
        returnTo={`/games/quizzes/${quizSlug}`}
        historicalEvents={historicalEvents}
      />
    </AdminShell>
  );
}
