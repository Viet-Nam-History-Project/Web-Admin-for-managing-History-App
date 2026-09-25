'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Download,
  Edit3,
  FileJson,
  History,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/State';
import { TimelineEventModal } from '@/components/admin/TimelineEventModal';
import { TimelineBatchImportModal } from '@/components/admin/TimelineBatchImportModal';
import { AdminTimelineEra } from '@/services/timelineAdminService';
import { TimelineEvent } from '@/lib/validation/timelineSchemas';

export function TimelineDetailClient({
  era,
  initialEvents,
}: {
  era: AdminTimelineEra;
  initialEvents: TimelineEvent[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  function handleOpenCreate() {
    setEditingEvent(null);
    setEditingIndex(null);
    setEditorOpen(true);
  }

  function handleOpenEdit(item: TimelineEvent, idx: number) {
    setEditingEvent(item);
    setEditingIndex(idx);
    setEditorOpen(true);
  }

  async function handleDeleteEvent(idx: number, eventName: string) {
    if (!window.confirm(`Bạn có chắc muốn xóa sự kiện "${eventName}"?`)) return;

    setDeletingIndex(idx);
    try {
      const res = await adminFetch<{ events: TimelineEvent[] }>(
        `/api/admin/games/timeline-puzzle/${era.id}/events/${idx}`,
        { method: 'DELETE' },
      );
      if (res && res.events) {
        setEvents(res.events);
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Xóa sự kiện thất bại.');
    } finally {
      setDeletingIndex(null);
    }
  }

  function handleExportJSON() {
    const exportData = events.map((e) => ({
      order: e.order,
      year: e.year,
      name: e.name,
      zone: e.zone || '',
      desc: e.desc || '',
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${era.id}-events.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const nextOrder =
    events.length > 0
      ? Math.max(...events.map((e) => e.order ?? 0)) + 1
      : 1;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/78 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-bronze" />
          <h2 className="text-lg font-black text-charcoal">
            Dòng sự kiện lịch sử ({events.length} sự kiện)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {events.length > 0 ? (
            <Button
              variant="outline"
              onClick={handleExportJSON}
              title="Xuất danh sách sự kiện ra file JSON"
            >
              <Download className="h-4 w-4" /> Xuất JSON
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            title="Nhập hàng loạt sự kiện từ file JSON"
          >
            <FileJson className="h-4 w-4 text-bronze" /> Nhập JSON
          </Button>

          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" /> Thêm sự kiện
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="grid gap-3">
          <EmptyState
            title="Chưa có sự kiện nào trong giai đoạn này"
            description="Hãy thêm sự kiện lịch sử đầu tiên hoặc sử dụng tính năng Nhập JSON để tải lên hàng loạt mốc thời gian."
          />
          <div className="flex justify-center gap-3">
            <Button onClick={() => setImportOpen(true)} variant="outline">
              <FileJson className="h-4 w-4" /> Nhập từ file JSON
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Thêm sự kiện mới
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 before:absolute before:bottom-3 before:left-3 sm:before:left-4 before:top-3 before:w-0.5 before:bg-gradient-to-b before:from-gold before:via-bronze/40 before:to-stone-300">
          <div className="grid gap-4">
            {events.map((item, idx) => {
              const isDeleting = deletingIndex === idx;
              return (
                <div
                  key={`${item.order}-${item.year}-${idx}`}
                  className="group relative rounded-2xl border border-[var(--border)] bg-white/85 p-5 shadow-museum transition hover:border-gold/60 hover:bg-white"
                >
                  {/* Timeline connector dot */}
                  <span className="absolute -left-[1.85rem] sm:-left-[2.35rem] top-7 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-bronze text-white shadow-sm ring-2 ring-bronze/30 transition group-hover:scale-110 group-hover:bg-gold">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-gold/18 px-2.5 py-1 font-mono text-xs font-black text-bronze">
                        Thứ tự: #{item.order}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-sm font-black text-emerald-800 border border-emerald-200/70">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        Năm {item.year < 0 ? `${Math.abs(item.year)} TCN` : item.year}
                      </span>

                      {item.zone ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                          <MapPin className="h-3.5 w-3.5 text-stone-500" />
                          {item.zone}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenEdit(item, idx)}
                        title="Chỉnh sửa sự kiện"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Sửa
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteEvent(idx, item.name)}
                        disabled={isDeleting}
                        title="Xóa sự kiện"
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

                  <h3 className="mt-2 text-base font-bold text-charcoal sm:text-lg">
                    {item.name}
                  </h3>

                  {item.desc ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                      {item.desc}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <TimelineEventModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        eraId={era.id}
        initial={editingEvent}
        eventIndex={editingIndex}
        nextOrder={nextOrder}
        onSaved={(updated) => {
          setEvents(updated);
          router.refresh();
        }}
      />

      {/* Batch Import Modal */}
      <TimelineBatchImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        eraId={era.id}
        onImported={(updated) => {
          setEvents(updated);
          router.refresh();
        }}
      />
    </div>
  );
}
