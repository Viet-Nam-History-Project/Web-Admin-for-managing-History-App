import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Edit3, HelpCircle, Landmark, Users } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardTitle } from '@/components/ui/Card';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { QuizDetailClient } from '@/components/admin/QuizDetailClient';
import { quizAdminService } from '@/services/quizAdminService';

export const dynamic = 'force-dynamic';

function levelTone(level: string): 'green' | 'gold' | 'red' | 'neutral' {
  const l = level.toLowerCase();
  if (l.includes('dễ') || l.includes('easy')) return 'green';
  if (l.includes('khó') || l.includes('hard')) return 'red';
  return 'gold';
}

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ quizSlug: string }>;
}) {
  const { quizSlug } = await params;
  const quiz = await quizAdminService.getQuiz(quizSlug).catch(() => null);

  if (!quiz) {
    notFound();
  }

  const questions = await quizAdminService.listQuestions(quizSlug).catch(() => []);

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
        / {quiz.quizzslug}
      </div>

      <PageHeader
        eyebrow="Trò chơi"
        title={quiz.description || quiz.quizzslug}
        description={`Slug: ${quiz.quizzslug} · ${questions.length} câu hỏi trắc nghiệm · Giới hạn ${quiz.settings?.timeLimit ?? 60}s`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/games/quizzes/${quizSlug}/edit`}>
              <Button variant="outline">
                <Edit3 className="h-4 w-4" /> Sửa thông tin
              </Button>
            </Link>

            <EntityActionButton
              url={`/api/admin/games/quizzes/${quizSlug}?action=${quiz.status === 'published' ? 'unpublish' : 'publish'}`}
              label={quiz.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'}
            />

            <EntityActionButton
              method="DELETE"
              url={`/api/admin/games/quizzes/${quizSlug}`}
              variant="danger"
              label="Xóa bộ quiz"
              confirmMessage={`Xóa mềm bộ quiz “${quiz.description || quizSlug}”? Bạn có thể khôi phục lại từ Thùng rác.`}
            />
          </div>
        }
      />

      {/* Quiz metadata summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Độ khó / Cấp độ</p>
            <div className="mt-1">
              <Badge tone={levelTone(quiz.level)}>{quiz.level}</Badge>
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Thời gian làm bài</p>
            <p className="mt-1 text-base font-black text-charcoal">
              {quiz.settings?.timeLimit ?? 60} giây
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Số người chơi</p>
            <p className="mt-1 text-base font-black text-charcoal">
              Tối đa {quiz.settings?.maxPlayers ?? 1} người
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-bronze">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Sự kiện lịch sử</p>
            <p className="mt-1 line-clamp-1 text-sm font-black text-charcoal" title={quiz.eventID?.title || 'Chung'}>
              {quiz.eventID?.title || 'Chung'}
            </p>
          </div>
        </Card>
      </div>

      {/* Question management */}
      <QuizDetailClient quiz={quiz} initialQuestions={questions} />
    </AdminShell>
  );
}
