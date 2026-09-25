'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { AdminTimelineEra } from '@/services/timelineAdminService';

const selectClass = 'h-11 w-full rounded-lg border border-[var(--border)] bg-white/80 px-3 text-sm outline-none transition focus:border-bronze focus:ring-4 focus:ring-gold/15';

export function TimelineEraForm({
  endpoint,
  returnTo = '/games/timeline-puzzle',
  initial,
  editing = false,
}: {
  endpoint: string;
  returnTo?: string;
  initial?: Partial<AdminTimelineEra>;
  editing?: boolean;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? initial?.name ?? '');
  const [eraId, setEraId] = useState(initial?.eraId ?? initial?.id ?? '');
  const [description, setDescription] = useState(initial?.description ?? initial?.shortDesc ?? '');
  const [coverMediaRef, setCoverMediaRef] = useState(initial?.coverMediaRef ?? initial?.thumbnailUrl ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'published');
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!editing && !eraId) {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (autoSlug) {
        setEraId(autoSlug);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        eraId: eraId.trim(),
        title: title.trim(),
        description: description.trim(),
        coverMediaRef: coverMediaRef.trim(),
        status,
        sortOrder: Number(sortOrder),
      };

      await adminFetch(endpoint, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu kỷ nguyên.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardTitle>Thông tin Kỷ nguyên Lịch sử</CardTitle>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field label="Tên kỷ nguyên / Thời kỳ">
            <Input
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ví dụ: Nhà Tây Sơn (1771-1802)"
            />
          </Field>

          <Field
            label="Mã kỷ nguyên (eraId)"
            hint="Chữ thường, số và gạch dưới (ví dụ: tay_son, chong_my). Không đổi sau khi tạo."
          >
            <Input
              required
              disabled={editing}
              value={eraId}
              onChange={(e) => setEraId(e.target.value)}
              placeholder="tay_son"
            />
          </Field>

          <div className="lg:col-span-2">
            <Field label="Mô tả tóm tắt" hint="Tóm tắt ngắn về bối cảnh hoặc chiến tích lịch sử nổi bật của thời kỳ này.">
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: Khởi nghĩa nông dân Tây Sơn lật đổ các tập đoàn phong kiến..."
              />
            </Field>
          </div>

          <Field label="Ảnh đại diện / coverMediaRef" hint="Đường dẫn ảnh đại diện của kỷ nguyên trong game.">
            <Input
              value={coverMediaRef}
              onChange={(e) => setCoverMediaRef(e.target.value)}
              placeholder="https://example.com/anh-ky-nguyen.jpg"
            />
          </Field>

          <Field label="Trạng thái">
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminTimelineEra['status'])}
            >
              <option value="published">Đã xuất bản (Published)</option>
              <option value="draft">Bản nháp (Draft)</option>
              <option value="archived">Lưu trữ (Archived)</option>
            </select>
          </Field>

          <Field label="Thứ tự hiển thị">
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(returnTo)}
          disabled={loading}
        >
          Hủy bỏ
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? 'Lưu thay đổi' : 'Tạo kỷ nguyên'}
        </Button>
      </div>
    </form>
  );
}
