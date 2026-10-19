'use client';

import { useState } from 'react';
import { FileUp, Loader2, Upload, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';

const sampleJSON = `[
  {
    "orderQuestion": 1,
    "question": "Trận Điện Biên Phủ trên không diễn ra vào tháng năm nào?",
    "options": ["12/1972", "01/1973", "04/1975", "10/1954"],
    "correctAnswer": 0,
    "explanation": "Chiến dịch diễn ra trong 12 ngày đêm từ 18/12 đến 30/12/1972.",
    "imageUrl": null
  },
  {
    "orderQuestion": 2,
    "question": "Vĩ tuyến nào từng là giới tuyến quân sự tạm thời chia cắt hai miền Nam - Bắc?",
    "options": ["Vĩ tuyến 13", "Vĩ tuyến 15", "Vĩ tuyến 17", "Vĩ tuyến 21"],
    "correctAnswer": 2,
    "explanation": "Theo Hiệp định Geneva 1954, vĩ tuyến 17 (sông Bến Hải) là giới tuyến tạm thời.",
    "imageUrl": null
  }
]`;

export function QuestionBatchImportModal({
  isOpen,
  onClose,
  quizSlug,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  quizSlug: string;
  onImported: () => void;
}) {
  const [jsonText, setJsonText] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      validateJSON(content);
    };
    reader.onerror = () => {
      setError('Lỗi đọc file JSON.');
    };
    reader.readAsText(file);
  }

  function validateJSON(text: string) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setError('Dữ liệu JSON phải là một mảng [] danh sách câu hỏi.');
        setPreviewCount(null);
        return false;
      }
      setPreviewCount(parsed.length);
      setError('');
      return true;
    } catch {
      setError('Cú pháp JSON không hợp lệ.');
      setPreviewCount(null);
      return false;
    }
  }

  function handleTextChange(val: string) {
    setJsonText(val);
    if (val.trim()) {
      validateJSON(val);
    } else {
      setPreviewCount(null);
      setError('');
    }
  }

  async function handleImport() {
    setLoading(true);
    setError('');

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Dữ liệu JSON cần chứa ít nhất một câu hỏi.');
      }

      await adminFetch(`/api/admin/games/quizzes/${quizSlug}/questions`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });

      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h3 className="text-xl font-black text-charcoal">Nhập hàng loạt câu hỏi từ JSON</h3>
            <p className="text-xs text-stone-500">
              Nhập danh sách câu hỏi vào bộ quiz: <span className="font-mono font-bold text-bronze">{quizSlug}</span>
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

        <div className="mt-4 grid gap-4">
          <div>
            <label className="block text-sm font-bold text-charcoal">Cách 1: Tải lên file .json</label>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-stone-50 px-4 py-2.5 text-sm font-bold text-charcoal transition hover:bg-stone-100">
                <FileUp className="h-4 w-4 text-bronze" />
                Chọn file JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <button
                type="button"
                onClick={() => handleTextChange(sampleJSON)}
                className="text-xs font-semibold text-bronze hover:underline"
              >
                Dán dữ liệu mẫu
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-charcoal">
                Cách 2: Dán trực tiếp nội dung JSON
              </label>
              {previewCount !== null ? (
                <span className="text-xs font-bold text-emerald-600">
                  Đã nhận diện: {previewCount} câu hỏi hợp lệ
                </span>
              ) : null}
            </div>
            <Textarea
              className="mt-2 font-mono text-xs"
              rows={10}
              placeholder="Dán mảng JSON các câu hỏi tại đây..."
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || !jsonText.trim() || previewCount === null || previewCount === 0}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Tiến hành Import ({previewCount ?? 0} câu)
          </Button>
        </div>
      </div>
    </div>
  );
}
