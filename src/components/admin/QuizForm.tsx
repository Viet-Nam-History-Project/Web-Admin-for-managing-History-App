'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { AdminQuizItem } from '@/services/quizAdminService';

const selectClass = 'h-11 w-full rounded-lg border border-[var(--border)] bg-white/80 px-3 text-sm outline-none transition focus:border-bronze focus:ring-4 focus:ring-gold/15';

export interface HistoricalEventItem {
  periodID: string;
  periodTitle: string;
  stageID: string;
  stageTitle: string;
  eventid: string;
  eventTitle: string;
}

export function QuizForm({
  endpoint,
  returnTo = '/games/quizzes',
  initial,
  editing = false,
  historicalEvents = [],
}: {
  endpoint: string;
  returnTo?: string;
  initial?: Partial<AdminQuizItem>;
  editing?: boolean;
  historicalEvents?: HistoricalEventItem[];
}) {
  const router = useRouter();

  const [description, setDescription] = useState(initial?.description ?? '');
  const [quizzslug, setQuizzslug] = useState(initial?.quizzslug ?? '');
  const [level, setLevel] = useState(initial?.level ?? 'Dễ');
  const [status, setStatus] = useState(initial?.status ?? 'published');
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);
  const [timeLimit, setTimeLimit] = useState<number>(initial?.settings?.timeLimit ?? 60);
  const [maxPlayers, setMaxPlayers] = useState<number>(initial?.settings?.maxPlayers ?? 1);

  // Historical event selection hierarchy
  const [selectedPeriod, setSelectedPeriod] = useState(initial?.eventID?.periodID ?? '');
  const [selectedStage, setSelectedStage] = useState(initial?.eventID?.stageID ?? '');
  const [selectedEventId, setSelectedEventId] = useState(initial?.eventID?.eventid ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate slug from description when creating new quiz
  function handleDescriptionChange(val: string) {
    setDescription(val);
    if (!editing && !quizzslug) {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (autoSlug) {
        setQuizzslug(autoSlug);
      }
    }
  }

  // Filter distinct periods
  const sourcePeriods = useMemo(() => {
    const map = new Map<string, string>();
    historicalEvents.forEach((item) => {
      if (!map.has(item.periodID)) map.set(item.periodID, item.periodTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [historicalEvents]);

  // Filter stages based on selected period
  const sourceStages = useMemo(() => {
    if (!selectedPeriod) return [];
    const map = new Map<string, string>();
    historicalEvents
      .filter((item) => item.periodID === selectedPeriod)
      .forEach((item) => {
        if (!map.has(item.stageID)) map.set(item.stageID, item.stageTitle);
      });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [historicalEvents, selectedPeriod]);

  // Filter events based on selected period and stage
  const sourceEvents = useMemo(() => {
    if (!selectedPeriod || !selectedStage) return [];
    return historicalEvents.filter(
      (item) => item.periodID === selectedPeriod && item.stageID === selectedStage,
    );
  }, [historicalEvents, selectedPeriod, selectedStage]);

  const activeEvent = useMemo(
    () => historicalEvents.find((item) => item.eventid === selectedEventId),
    [historicalEvents, selectedEventId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        quizzslug: quizzslug.trim(),
        description: description.trim(),
        level,
        status,
        sortOrder: Number(sortOrder),
        settings: {
          timeLimit: Number(timeLimit) || 60,
          maxPlayers: Number(maxPlayers) || 1,
        },
      };

      if (activeEvent) {
        payload.eventID = {
          periodID: activeEvent.periodID,
          stageID: activeEvent.stageID,
          eventid: activeEvent.eventid,
          title: activeEvent.eventTitle,
        };
      }

      await adminFetch(endpoint, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu bộ quiz.');
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
        <CardTitle>Thông tin nhận diện bộ Quiz</CardTitle>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Field label="Tiêu đề / Mô tả bộ Quiz" hint="Mô tả nội dung hoặc chủ đề của bộ câu hỏi để người học dễ nhận biết.">
              <Textarea
                required
                rows={2}
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Ví dụ: Bộ câu hỏi về Trận Xuân Lộc 1975, mở màn cho chiến dịch giải phóng Sài Gòn..."
              />
            </Field>
          </div>

          <Field
            label="Slug định danh"
            hint="Chữ thường, số và gạch ngang (không dấu). Không thể đổi sau khi tạo."
          >
            <Input
              required
              disabled={editing}
              value={quizzslug}
              onChange={(e) => setQuizzslug(e.target.value)}
              placeholder="xuan-loc-1975-1"
            />
          </Field>

          <Field label="Cấp độ (Level)">
            <select
              className={selectClass}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="Dễ">Dễ</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Khó">Khó</option>
              <option value="Bộ 1">Bộ 1</option>
              <option value="Bộ 2">Bộ 2</option>
              <option value="Bộ 3">Bộ 3</option>
            </select>
          </Field>

          <Field label="Thời gian giới hạn (giây)" hint="Thời gian làm bài cho mỗi câu hỏi hoặc cả bộ đề (mặc định 60 giây).">
            <Input
              type="number"
              min={10}
              max={600}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            />
          </Field>

          <Field label="Số người chơi tối đa">
            <Input
              type="number"
              min={1}
              max={10}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            />
          </Field>

          <Field label="Trạng thái">
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminQuizItem['status'])}
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

      <Card>
        <CardTitle>Liên kết Sự kiện Lịch sử</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Gắn bộ Quiz với một sự kiện lịch sử cụ thể để người học có thể làm bài ôn tập ngay sau khi học xong bài đó.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="1. Chọn Thời kỳ">
            <select
              className={selectClass}
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setSelectedStage('');
                setSelectedEventId('');
              }}
            >
              <option value="">-- Chọn thời kỳ --</option>
              {sourcePeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="2. Chọn Giai đoạn">
            <select
              className={selectClass}
              disabled={!selectedPeriod}
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setSelectedEventId('');
              }}
            >
              <option value="">-- Chọn giai đoạn --</option>
              {sourceStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="3. Chọn Sự kiện">
            <select
              className={selectClass}
              disabled={!selectedStage}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">-- Chọn sự kiện --</option>
              {sourceEvents.map((ev) => (
                <option key={ev.eventid} value={ev.eventid}>
                  {ev.eventTitle}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {activeEvent ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 p-3.5 text-sm text-charcoal">
            <div>
              <span className="font-bold text-bronze">Đã chọn liên kết:</span> {activeEvent.eventTitle}
              <p className="text-xs text-stone-500">
                {activeEvent.periodTitle} &rarr; {activeEvent.stageTitle}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedPeriod('');
                setSelectedStage('');
                setSelectedEventId('');
              }}
              title="Hủy liên kết sự kiện"
            >
              <X className="h-4 w-4" /> Bỏ chọn
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs italic text-stone-400">
            * Không bắt buộc chọn nếu đây là bộ Quiz tổng hợp chung.
          </p>
        )}
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
          {editing ? 'Lưu thay đổi' : 'Tạo bộ quiz'}
        </Button>
      </div>
    </form>
  );
}
