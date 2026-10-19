'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Download,
  Edit3,
  FileJson,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/State';
import { QuestionEditorModal } from '@/components/admin/QuestionEditorModal';
import { QuestionBatchImportModal } from '@/components/admin/QuestionBatchImportModal';
import { AdminQuestionItem, AdminQuizItem } from '@/services/quizAdminService';

export function QuizDetailClient({
  quiz,
  initialQuestions,
}: {
  quiz: AdminQuizItem;
  initialQuestions: AdminQuestionItem[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<AdminQuestionItem[]>(initialQuestions);

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestionItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reloadQuestions() {
    try {
      const res = await adminFetch<{ items: AdminQuestionItem[] }>(
        `/api/admin/games/quizzes/${quiz.id}/questions`,
      );
      if (res && res.items) {
        setQuestions(res.items);
      }
      router.refresh();
    } catch (err) {
      console.error('Reload questions error:', err);
    }
  }

  function handleOpenCreate() {
    setEditingQuestion(null);
    setEditorOpen(true);
  }

  function handleOpenEdit(q: AdminQuestionItem) {
    setEditingQuestion(q);
    setEditorOpen(true);
  }

  async function handleDeleteQuestion(questionId: string, order: number) {
    if (!window.confirm(`Bạn có chắc muốn xóa câu hỏi số ${order}?`)) return;

    setDeletingId(questionId);
    try {
      await adminFetch(`/api/admin/games/quizzes/${quiz.id}/questions/${questionId}`, {
        method: 'DELETE',
      });
      await reloadQuestions();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Xóa câu hỏi thất bại.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleExportJSON() {
    const exportData = questions.map((q) => ({
      orderQuestion: q.orderQuestion,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      imageUrl: q.imageUrl || null,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-${quiz.quizzslug}-questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const nextOrder =
    questions.length > 0
      ? Math.max(...questions.map((q) => q.orderQuestion ?? 0)) + 1
      : 1;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-bronze" />
          <h2 className="text-lg font-black text-charcoal">
            Danh sách câu hỏi trắc nghiệm ({questions.length} câu)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {questions.length > 0 ? (
            <Button variant="outline" onClick={handleExportJSON} title="Xuất file JSON câu hỏi">
              <Download className="h-4 w-4" /> Xuất JSON
            </Button>
          ) : null}

          <Button variant="outline" onClick={() => setImportOpen(true)} title="Nhập hàng loạt câu hỏi từ file JSON">
            <FileJson className="h-4 w-4 text-bronze" /> Nhập JSON
          </Button>

          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="grid gap-3">
          <EmptyState
            title="Chưa có câu hỏi nào trong bộ Quiz"
            description="Hãy thêm câu hỏi trắc nghiệm đầu tiên hoặc sử dụng tính năng Nhập JSON để tải lên hàng loạt."
          />
          <div className="flex justify-center gap-3">
            <Button onClick={() => setImportOpen(true)} variant="outline">
              <FileJson className="h-4 w-4" /> Nhập từ file JSON
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Thêm câu hỏi mới
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {questions.map((q) => {
            const isDeleting = deletingId === q.id;
            return (
              <div
                key={q.id}
                className="group relative rounded-2xl border border-[var(--border)] bg-white/80 p-5 shadow-museum transition hover:border-gold/50 hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/18 font-mono text-sm font-black text-bronze">
                      {q.orderQuestion}
                    </span>

                    <div className="flex-1">
                      <p className="text-base font-bold text-charcoal">{q.question}</p>

                      {q.imageUrl ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600">
                          <ImageIcon className="h-3.5 w-3.5 text-stone-500" />
                          <a
                            href={q.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-bronze hover:underline"
                          >
                            Xem ảnh minh họa
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenEdit(q)}
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Sửa
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteQuestion(q.id, q.orderQuestion)}
                      disabled={isDeleting}
                      title="Xóa câu hỏi"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Xóa
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, idx) => {
                    const isCorrect = q.correctAnswer === idx;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-sm transition ${
                          isCorrect
                            ? 'border-emerald-500/80 bg-emerald-50/80 font-bold text-emerald-950 ring-1 ring-emerald-500/30'
                            : 'border-[var(--border)] bg-stone-50/60 text-stone-700'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {q.explanation ? (
                  <div className="mt-3 rounded-xl border border-stone-200/80 bg-stone-50/70 p-3 text-xs leading-relaxed text-stone-600">
                    <span className="font-bold text-charcoal">Giải thích: </span>
                    {q.explanation}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <QuestionEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        quizSlug={quiz.id}
        initial={editingQuestion}
        nextOrderQuestion={nextOrder}
        onSaved={reloadQuestions}
      />

      {/* Batch Import Modal */}
      <QuestionBatchImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        quizSlug={quiz.id}
        onImported={reloadQuestions}
      />
    </div>
  );
}
