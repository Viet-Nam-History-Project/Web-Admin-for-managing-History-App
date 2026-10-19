'use client';

import { useState } from 'react';
import { FileUp, Loader2, Upload, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { TimelineEvent } from '@/lib/validation/timelineSchemas';

const sampleTimelineJSON = `[
  {
    "order": 1,
    "year": 1785,
    "name": "Chiến thắng Rạch Gầm - Xoài Mút",
    "zone": "Tiền Giang",
    "desc": "Quân Tây Sơn đánh tan 5 vạn quân Xiêm xâm lược."
  },
  {
    "order": 2,
    "year": 1789,
    "name": "Đại thắng Ngọc Hồi - Đống Đa",
    "zone": "Thăng Long",
    "desc": "Quang Trung thần tốc đại phá 29 vạn quân Mãn Thanh."
  }
]`;

export function TimelineBatchImportModal({
  isOpen,
  onClose,
  eraId,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  eraId: string;
  onImported: (updatedEvents: TimelineEvent[]) => void;
}) {
  const [jsonText, setJsonText] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);
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
        setError('Dữ liệu JSON phải là một mảng [] danh sách các mốc sự kiện.');
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
        throw new Error('Dữ liệu JSON cần chứa ít nhất một mốc sự kiện.');
      }

      const res = await adminFetch<{ ok: boolean; events: TimelineEvent[] }>(
        `/api/admin/games/timeline-puzzle/${eraId}/events?mode=${replaceMode ? 'replace' : 'append'}`,
        {
          method: 'POST',
          body: JSON.stringify(parsed),
        },
      );

      if (res && res.events) {
        onImported(res.events);
      }
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
            <h3 className="text-xl font-black text-charcoal">Nhập hàng loạt sự kiện niên đại</h3>
            <p className="text-xs text-stone-500">
              Kỷ nguyên: <span className="font-mono font-bold text-bronze">{eraId}</span>
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
                onClick={() => handleTextChange(sampleTimelineJSON)}
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
                  Đã nhận diện: {previewCount} sự kiện hợp lệ
                </span>
              ) : null}
            </div>
            <Textarea
              className="mt-2 font-mono text-xs"
              rows={8}
              placeholder="Dán mảng JSON danh sách sự kiện tại đây..."
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
            <input
              type="checkbox"
              id="replaceMode"
              className="h-4 w-4 rounded text-bronze focus:ring-gold"
              checked={replaceMode}
              onChange={(e) => setReplaceMode(e.target.checked)}
            />
            <label htmlFor="replaceMode" className="cursor-pointer font-medium">
              Ghi đè toàn bộ danh sách sự kiện hiện có của kỷ nguyên (mặc định: bổ sung thêm)
            </label>
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
            Tiến hành Import ({previewCount ?? 0} sự kiện)
          </Button>
        </div>
      </div>
    </div>
  );
}
