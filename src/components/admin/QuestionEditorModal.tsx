'use client';

import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { AdminQuestionItem } from '@/services/quizAdminService';

export function QuestionEditorModal({
  isOpen,
  onClose,
  quizSlug,
  initial,
  nextOrderQuestion = 1,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  quizSlug: string;
  initial?: AdminQuestionItem | null;
  nextOrderQuestion?: number;
  onSaved: () => void;
}) {
  const isEditing = Boolean(initial);

  const [orderQuestion, setOrderQuestion] = useState<number>(nextOrderQuestion);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setOrderQuestion(initial.orderQuestion ?? nextOrderQuestion);
      setQuestion(initial.question ?? '');
      const opts = initial.options && initial.options.length ? [...initial.options] : ['', '', '', ''];
      while (opts.length < 4) opts.push('');
      setOptions(opts);
      setCorrectAnswer(initial.correctAnswer ?? 0);
      setExplanation(initial.explanation ?? '');
      setImageUrl(initial.imageUrl ?? '');
    } else {
      setOrderQuestion(nextOrderQuestion);
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setExplanation('');
      setImageUrl('');
    }
    setError('');
  }, [initial, nextOrderQuestion, isOpen]);

  if (!isOpen) return null;

  function updateOption(idx: number, val: string) {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      setError('Cần nhập ít nhất 2 phương án đáp án.');
      setLoading(false);
      return;
    }

    if (correctAnswer >= filteredOptions.length) {
      setError('Vị trí đáp án đúng không hợp lệ với số lượng đáp án đã nhập.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        orderQuestion: Number(orderQuestion) || 1,
        question: question.trim(),
        options: filteredOptions,
        correctAnswer: Number(correctAnswer),
        explanation: explanation.trim(),
        imageUrl: imageUrl.trim() || null,
      };

      const url = isEditing
        ? `/api/admin/games/quizzes/${quizSlug}/questions/${initial!.id}`
        : `/api/admin/games/quizzes/${quizSlug}/questions`;

      await adminFetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu câu hỏi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h3 className="text-xl font-black text-charcoal">
              {isEditing ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
            </h3>
            <p className="text-xs text-stone-500">
              Bộ quiz: <span className="font-mono font-bold text-bronze">{quizSlug}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 grid gap-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Field label="Thứ tự câu">
                <Input
                  type="number"
                  min={1}
                  required
                  value={orderQuestion}
                  onChange={(e) => setOrderQuestion(Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Ảnh minh họa (tùy chọn)" hint="Dán đường dẫn ảnh tư liệu liên quan đến câu hỏi.">
                <div className="relative">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/anh-lich-su.jpg"
                  />
                  {imageUrl ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
              </Field>
            </div>
          </div>

          <Field label="Nội dung câu hỏi" hint="Câu hỏi trắc nghiệm ngắn gọn, chính xác theo sự kiện lịch sử.">
            <Textarea
              required
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ví dụ: Chiến dịch Hồ Chí Minh toàn thắng vào thời khắc nào ngày 30/4/1975?"
            />
          </Field>

          <div>
            <label className="text-sm font-bold text-charcoal">
              Các lựa chọn đáp án & Chọn đáp án đúng
            </label>
            <p className="mb-3 text-xs text-stone-500">
              Click vào biểu tượng vòng tròn hoặc chữ cái để đánh dấu đáp án chính xác (nổi bật màu xanh lá).
            </p>

            <div className="grid gap-3">
              {['A', 'B', 'C', 'D'].map((label, idx) => {
                const isCorrect = correctAnswer === idx;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-2xl border p-2.5 transition ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-[var(--border)] bg-stone-50/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(idx)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold transition ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                      }`}
                      title={isCorrect ? 'Đáp án đúng' : `Chọn đáp án ${label} là đúng`}
                    >
                      {isCorrect ? <Check className="h-5 w-5" /> : label}
                    </button>

                    <input
                      type="text"
                      required={idx < 2}
                      className="h-10 flex-1 rounded-xl border border-transparent bg-white px-3 text-sm outline-none focus:border-bronze focus:ring-2 focus:ring-gold/20"
                      placeholder={`Đáp án ${label}...`}
                      value={options[idx] ?? ''}
                      onChange={(e) => updateOption(idx, e.target.value)}
                    />

                    {isCorrect ? (
                      <span className="hidden items-center gap-1 text-xs font-bold text-emerald-700 sm:flex">
                        <CheckCircle2 className="h-4 w-4" /> Đáp án đúng
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="Giải thích đáp án" hint="Hiển thị cho người học sau khi trả lời để củng cố kiến thức.">
            <Textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Ví dụ: Vào lúc 11 giờ 30 phút ngày 30/4/1975, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập..."
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Lưu câu hỏi' : 'Thêm câu hỏi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
