'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { TimelineEvent } from '@/lib/validation/timelineSchemas';

export function TimelineEventModal({
  isOpen,
  onClose,
  eraId,
  initial,
  eventIndex,
  nextOrder = 1,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  eraId: string;
  initial?: TimelineEvent | null;
  eventIndex?: number | null;
  nextOrder?: number;
  onSaved: (updatedEvents: TimelineEvent[]) => void;
}) {
  const isEditing = initial !== null && initial !== undefined && eventIndex !== null && eventIndex !== undefined;

  const [order, setOrder] = useState<number>(nextOrder);
  const [year, setYear] = useState<number>(1975);
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [desc, setDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setOrder(initial.order ?? nextOrder);
      setYear(initial.year ?? 0);
      setName(initial.name ?? '');
      setZone(initial.zone ?? '');
      setDesc(initial.desc ?? '');
    } else {
      setOrder(nextOrder);
      setYear(1975);
      setName('');
      setZone('');
      setDesc('');
    }
    setError('');
  }, [initial, nextOrder, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: TimelineEvent = {
        order: Number(order) || 1,
        year: Number(year) || 0,
        name: name.trim(),
        zone: zone.trim(),
        desc: desc.trim(),
      };

      const url = isEditing
        ? `/api/admin/games/timeline-puzzle/${eraId}/events/${eventIndex}`
        : `/api/admin/games/timeline-puzzle/${eraId}/events`;

      const res = await adminFetch<{ ok: boolean; events: TimelineEvent[] }>(url, {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.events) {
        onSaved(res.events);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu sự kiện.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h3 className="text-xl font-black text-charcoal">
              {isEditing ? 'Chỉnh sửa mốc sự kiện' : 'Thêm mốc sự kiện mới'}
            </h3>
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

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Năm xảy ra" hint="Số nguyên (số âm nếu trước Công nguyên)">
              <Input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="Ví dụ: 1975"
              />
            </Field>

            <Field label="Thứ tự sự kiện" hint="Thứ tự mốc trong game (1..N)">
              <Input
                type="number"
                min={1}
                required
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Tên sự kiện lịch sử" hint="Tên mốc ngắn gọn để người chơi dễ ghi nhớ và ghép nối.">
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Chiến dịch Điện Biên Phủ"
            />
          </Field>

          <Field label="Khu vực / Chiến trường (zone)" hint="Địa danh diễn ra (ví dụ: Điện Biên, Sài Gòn, Tây Nguyên...)">
            <Input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ví dụ: Điện Biên"
            />
          </Field>

          <Field label="Mô tả tóm tắt sự kiện" hint="Mô tả ngắn hiển thị khi người chơi lật mở hoặc xem giải thích.">
            <Textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Chiến thắng lừng lẫy năm châu chấn động địa cầu, buộc Pháp ký hiệp định Geneva..."
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Lưu thay đổi' : 'Thêm sự kiện'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
