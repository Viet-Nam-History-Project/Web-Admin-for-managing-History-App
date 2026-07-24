'use client';

import { FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Database, Eye, FileText, Pencil, RefreshCw, Save, Square, Trash2, Upload, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/State';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import type { KnowledgeSource } from '@/services/knowledgeAdminService';

type PeriodOption = { id: string; title: string };

const STATUS_LABELS: Record<KnowledgeSource['status'], string> = {
  uploaded: 'Chờ index',
  indexing: 'Đang index',
  paused: 'Đã tạm dừng',
  ready: 'Sẵn sàng',
  failed: 'Lỗi',
  disabled: 'Đã gỡ',
};

function statusTone(status: KnowledgeSource['status']) {
  if (status === 'ready') return 'green' as const;
  if (status === 'failed') return 'red' as const;
  if (status === 'uploaded' || status === 'indexing' || status === 'paused') return 'gold' as const;
  return 'neutral' as const;
}

type IndexJobProgress = {
  status: string;
  phase: string;
  total_chunks: number;
  completed_chunks: number;
  current_page: number;
  resumable: boolean;
};

const PHASE_LABELS: Record<string, string> = {
  queued: 'Đang xếp hàng',
  parsing: 'Đang đọc/OCR PDF',
  embeddings: 'Đang tạo embedding',
  entities: 'Đang trích entity và quan hệ',
  saving: 'Đang lưu Neo4j',
  stopping: 'Đang dừng an toàn',
  paused: 'Đã lưu checkpoint',
  complete: 'Hoàn tất',
};

export function KnowledgeBaseDashboard({
  initialSources,
  periods,
  maxPdfSizeMb,
}: {
  initialSources: KnowledgeSource[];
  periods: PeriodOption[];
  maxPdfSizeMb: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [jobProgress, setJobProgress] = useState<Record<string, IndexJobProgress>>({});
  const indexingKey = initialSources
    .filter((source) => source.status === 'indexing')
    .map((source) => source.id)
    .join(',');

  useEffect(() => {
    if (!indexingKey) return;
    let stopped = false;
    const sourceIds = indexingKey.split(',').filter(Boolean);

    async function pollIndexJobs() {
      try {
        const results = await Promise.all(
          sourceIds.map((sourceId) =>
            adminFetch<{ job: IndexJobProgress }>(
              `/api/admin/ai/knowledge/${sourceId}/index`,
              { method: 'GET' },
            ),
          ),
        );
        if (!stopped) {
          setJobProgress((current) => {
            const next = { ...current };
            sourceIds.forEach((sourceId, index) => {
              next[sourceId] = results[index].job;
            });
            return next;
          });
          if (results.some(({ job }) =>
            ['ready', 'failed', 'paused'].includes(job.status)
          )) {
            router.refresh();
          }
        }
      } catch (pollError) {
        if (!stopped) {
          setError(pollError instanceof Error ? pollError.message : 'Không đọc được tiến độ index.');
        }
      }
    }

    const firstPoll = window.setTimeout(pollIndexJobs, 2_000);
    const interval = window.setInterval(pollIndexJobs, 30_000);
    return () => {
      stopped = true;
      window.clearTimeout(firstPoll);
      window.clearInterval(interval);
    };
  }, [indexingKey, router]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function uploadSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      await adminFetch('/api/admin/ai/knowledge', { method: 'POST', body: form });
      formRef.current?.reset();
      setMessage('PDF đã được lưu. Bạn có thể bấm Index để đưa vào kho AI.');
      refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload thất bại.');
    }
  }

  async function runAction(url: string, method: 'POST' | 'DELETE', confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    if (activeAction) return;
    setActiveAction(url);
    setError('');
    setMessage(method === 'POST' ? 'Đang tạo tác vụ OCR và index...' : '');
    try {
      await adminFetch(url, { method });
      setMessage(method === 'POST'
        ? 'Đã bắt đầu index nền. Bạn có thể tiếp tục sử dụng web; trạng thái sẽ tự cập nhật.'
        : 'Tài liệu và file PDF gốc đã được xóa.');
      refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Thao tác thất bại.');
      refresh();
    } finally {
      setActiveAction('');
    }
  }

  async function stopIndex(source: KnowledgeSource) {
    if (activeAction) return;
    if (!window.confirm(
      `Dừng index “${source.title}”? Phần đã hoàn thành sẽ được lưu để tiếp tục sau.`,
    )) return;
    const action = `/api/admin/ai/knowledge/${source.id}/index`;
    setActiveAction(`stop:${action}`);
    setError('');
    setMessage('Đang chờ pipeline dừng tại checkpoint an toàn...');
    try {
      await adminFetch(action, { method: 'DELETE' });
      setMessage('Đã yêu cầu dừng. Khi bấm Tiếp tục index, các chunk hoàn thành sẽ được tái sử dụng.');
      refresh();
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Không dừng được index.');
    } finally {
      setActiveAction('');
    }
  }

  function openEditor(source: KnowledgeSource) {
    setError('');
    setMessage('');
    setEditingSource(source);
  }

  async function updateSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSource || activeAction) return;

    const form = new FormData(event.currentTarget);
    const publicationYearText = String(form.get('publicationYear') ?? '').trim();
    const relatedPeriod = String(form.get('relatedPeriod') ?? '').trim();
    const actionKey = `/api/admin/ai/knowledge/${editingSource.id}`;
    setActiveAction(actionKey);
    setError('');
    setMessage('');

    try {
      await adminFetch(actionKey, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(form.get('title') ?? ''),
          author: String(form.get('author') ?? ''),
          publisher: String(form.get('publisher') ?? ''),
          publicationYear: publicationYearText ? Number(publicationYearText) : null,
          sourceType: String(form.get('sourceType') ?? 'book'),
          trustLevel: String(form.get('trustLevel') ?? 'reference'),
          relatedPeriods: relatedPeriod ? [relatedPeriod] : [],
        }),
      });
      setEditingSource(null);
      setMessage('Đã cập nhật thông tin tài liệu.');
      refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Không cập nhật được tài liệu.');
    } finally {
      setActiveAction('');
    }
  }

  const readyCount = initialSources.filter((source) => source.status === 'ready').length;
  const chunkCount = initialSources.reduce((total, source) => total + source.chunkCount, 0);

  return <div className={pending ? 'opacity-70 transition' : 'transition'}>
    <div className="grid gap-4 md:grid-cols-3">
      <Summary icon={BookOpen} label="Tài liệu" value={initialSources.length} />
      <Summary icon={Database} label="Đã sẵn sàng" value={readyCount} />
      <Summary icon={FileText} label="Tổng chunks" value={chunkCount} />
    </div>

    <Card className="mt-5">
      <div className="flex items-start justify-between gap-4">
        <div><CardTitle>Thêm tài liệu PDF</CardTitle><p className="mt-1 text-sm text-stone-500">Tải lên tài liệu để bổ sung vào kho tri thức của trợ lý AI.</p></div>
        <Upload className="h-6 w-6 text-bronze" />
      </div>
      <form ref={formRef} onSubmit={uploadSource} className="mt-5 grid gap-4 lg:grid-cols-4">
        <label className="grid gap-1 lg:col-span-2"><span className="text-xs font-bold text-stone-600">Tiêu đề *</span><input required name="title" className={inputClass} placeholder="Ví dụ: Lịch sử kháng chiến chống Mỹ" /></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Tác giả</span><input name="author" className={inputClass} /></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Nhà xuất bản</span><input name="publisher" className={inputClass} /></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Năm xuất bản</span><input name="publicationYear" type="number" min="1000" max="2100" className={inputClass} /></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Loại nguồn</span><select name="sourceType" className={inputClass}><option value="book">Sách</option><option value="academic">Tài liệu học thuật</option><option value="official">Tài liệu chính thống</option><option value="article">Bài nghiên cứu</option></select></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Độ tin cậy</span><select name="trustLevel" className={inputClass}><option value="official">Chính thống</option><option value="academic">Học thuật</option><option value="reference">Tham khảo</option></select></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Gắn với thời kỳ</span><select name="relatedPeriods" className={inputClass}><option value="">Toàn bộ lịch sử</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.title}</option>)}</select></label>
        <label className="grid gap-1 lg:col-span-3"><span className="text-xs font-bold text-stone-600">File PDF * (tối đa {maxPdfSizeMb} MB)</span><input required name="file" type="file" accept="application/pdf,.pdf" className="h-11 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-charcoal file:mr-3 file:rounded-md file:border-0 file:bg-bronze file:px-3 file:py-1 file:font-bold file:text-white" /></label>
        <div className="flex items-end"><Button type="submit" className="w-full" disabled={pending}><Upload className="h-4 w-4" /> Upload PDF</Button></div>
      </form>
      {message ? <p className="mt-4 rounded-lg bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-flag/10 px-3 py-2 text-sm font-semibold text-flag">{error}</p> : null}
    </Card>

    <div className="mt-5">
      {initialSources.length === 0 ? <EmptyState title="Chưa có PDF" description="Upload tài liệu đầu tiên để xây dựng kho tri thức cho AI." /> : <DataTable className="min-w-[1450px]">
        <TableHead><TableRow><TableHeaderCell>Tài liệu</TableHeaderCell><TableHeaderCell>Nguồn</TableHeaderCell><TableHeaderCell>Thời kỳ</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Trang</TableHeaderCell><TableHeaderCell>Chunks</TableHeaderCell><TableHeaderCell>Entities</TableHeaderCell><TableHeaderCell>Quan hệ</TableHeaderCell><TableHeaderCell>Token lần index</TableHeaderCell><TableHeaderCell>Cập nhật</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead>
        <tbody>{initialSources.map((source) => <TableRow key={source.id}>
          <TableCell><p className="max-w-sm font-black text-charcoal">{source.title}</p><p className="mt-1 text-xs text-stone-500">{source.fileName} · {formatBytes(source.fileSize)}</p>{source.ocrApplied ? <p className="mt-1 text-xs font-semibold text-bronze">Đã OCR · {source.ocrLanguages}{source.ocrEngine ? ` · ${source.ocrEngine}` : ''}</p> : null}{source.footnotePageCount ? <p className="mt-1 text-xs font-semibold text-bronze">Đã bỏ chú thích cuối trang ở {source.footnotePageCount} trang</p> : null}{source.runningHeaderPageCount ? <p className="mt-1 text-xs font-semibold text-bronze">Đã bỏ tiêu đề lặp đầu trang ở {source.runningHeaderPageCount} trang</p> : null}{source.ocrFailedPages.length ? <p className="mt-1 max-w-md text-xs font-semibold text-flag">Bỏ qua {source.ocrFailedPages.length} trang không đọc được: {source.ocrFailedPages.slice(0, 12).join(', ')}{source.ocrFailedPages.length > 12 ? '…' : ''}</p> : null}{source.errorMessage ? <p className="mt-1 max-w-md text-xs font-semibold text-flag">{source.errorMessage}</p> : null}</TableCell>
          <TableCell><p>{source.author || 'Chưa khai báo'}</p><p className="mt-1 text-xs text-stone-500">{source.sourceType} · {source.trustLevel}</p></TableCell>
          <TableCell>{source.relatedPeriods.length ? source.relatedPeriods.join(', ') : 'Toàn bộ'}</TableCell>
          <TableCell>
            <Badge tone={statusTone(source.status)}>{STATUS_LABELS[source.status]}</Badge>
            {source.status === 'indexing' && jobProgress[source.id] ? <div className="mt-2 min-w-44 text-xs text-stone-500">
              <p className="font-semibold text-bronze">{PHASE_LABELS[jobProgress[source.id].phase] ?? jobProgress[source.id].phase}</p>
              {jobProgress[source.id].total_chunks > 0 ? <p className="mt-1">
                {jobProgress[source.id].completed_chunks.toLocaleString('vi-VN')}/{jobProgress[source.id].total_chunks.toLocaleString('vi-VN')} chunks
                {jobProgress[source.id].current_page > 0 ? ` · trang ${jobProgress[source.id].current_page}` : ''}
              </p> : null}
            </div> : null}
          </TableCell>
          <TableCell>{source.pageCount ? <div><p>{source.textPageCount.toLocaleString('vi-VN')}/{source.pageCount.toLocaleString('vi-VN')}</p>{source.skippedPageCount ? <p className="mt-1 text-xs font-semibold text-bronze">Dùng trang {source.contentStartPage}–{source.contentEndPage} · bỏ {source.skippedPageCount}</p> : null}</div> : '—'}</TableCell><TableCell>{source.chunkCount || '—'}</TableCell>
          <TableCell>{source.entityCount ? source.entityCount.toLocaleString('vi-VN') : '—'}</TableCell>
          <TableCell>{source.relationshipCount ? source.relationshipCount.toLocaleString('vi-VN') : '—'}</TableCell>
          <TableCell><p className="font-bold">{source.lastIndexTotalTokens.toLocaleString('vi-VN')}</p><p className="mt-1 text-xs text-stone-500">Embedding {source.embeddingInputTokens.toLocaleString('vi-VN')} · Entity {(source.entityInputTokens + source.entityOutputTokens).toLocaleString('vi-VN')}</p><p className="mt-1 text-xs text-stone-500">OpenAI {source.openaiChunkCount.toLocaleString('vi-VN')} · Tái dùng {source.reusedChunkCount.toLocaleString('vi-VN')} chunks</p></TableCell>
          <TableCell className="text-xs">{source.indexedAt ? new Date(source.indexedAt).toLocaleString('vi-VN') : new Date(source.createdAt).toLocaleString('vi-VN')}</TableCell>
          <TableCell><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={source.status === 'indexing' || Boolean(activeAction)} onClick={() => openEditor(source)}><Pencil className="h-4 w-4" /> Sửa</Button><Link href={`/ai/knowledge-base/${source.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white/60 px-4 text-sm font-semibold text-charcoal transition hover:bg-white"><Eye className="h-4 w-4" /> Kiểm tra</Link>{source.status === 'indexing' ? <Button variant="danger" disabled={pending || Boolean(activeAction)} onClick={() => stopIndex(source)}><Square className="h-4 w-4" /> {activeAction.startsWith('stop:') ? 'Đang dừng...' : 'Dừng index'}</Button> : <Button variant="outline" disabled={pending || Boolean(activeAction) || source.status === 'disabled'} onClick={() => runAction(`/api/admin/ai/knowledge/${source.id}/index`, 'POST')}><RefreshCw className={`h-4 w-4 ${activeAction.endsWith(`/${source.id}/index`) ? 'animate-spin' : ''}`} /> {activeAction.endsWith(`/${source.id}/index`) ? 'Đang tạo job...' : source.status === 'paused' ? 'Tiếp tục index' : source.status === 'ready' || source.status === 'failed' ? 'Index lại' : 'Index'}</Button>}<Button variant="danger" disabled={pending || Boolean(activeAction) || source.status === 'indexing'} onClick={() => runAction(`/api/admin/ai/knowledge/${source.id}`, 'DELETE', `Xóa vĩnh viễn “${source.title}”, file PDF gốc và dữ liệu index? Thao tác này không thể hoàn tác.`)}><Trash2 className="h-4 w-4" /> Xóa</Button></div></TableCell>
        </TableRow>)}</tbody>
      </DataTable>}
    </div>

    {editingSource ? <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/55 p-4"
      role="presentation"
      onMouseDown={() => setEditingSource(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-knowledge-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-bronze">Kho tri thức PDF</p>
            <h2 id="edit-knowledge-title" className="mt-1 text-2xl font-black text-charcoal">Sửa thông tin tài liệu</h2>
            <p className="mt-2 text-sm text-stone-500">Nội dung đã xử lý của tài liệu sẽ được giữ nguyên.</p>
          </div>
          <button type="button" aria-label="Đóng" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-stone-500 transition hover:bg-black/5 hover:text-charcoal" onClick={() => setEditingSource(null)}><X className="h-5 w-5" /></button>
        </div>

        <form key={editingSource.id} onSubmit={updateSource} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 md:col-span-2"><span className="text-xs font-bold text-stone-600">Tiêu đề *</span><input required name="title" defaultValue={editingSource.title} className={inputClass} /></label>
          <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Tác giả</span><input name="author" defaultValue={editingSource.author} className={inputClass} /></label>
          <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Nhà xuất bản</span><input name="publisher" defaultValue={editingSource.publisher} className={inputClass} /></label>
          <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Năm xuất bản</span><input name="publicationYear" type="number" min="1000" max="2100" defaultValue={editingSource.publicationYear ?? ''} className={inputClass} /></label>
          <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Gắn với thời kỳ</span><select name="relatedPeriod" defaultValue={editingSource.relatedPeriods[0] ?? ''} className={inputClass}><option value="">Toàn bộ lịch sử</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.title}</option>)}</select></label>
          <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Loại nguồn</span><select name="sourceType" defaultValue={editingSource.sourceType} className={inputClass}><option value="book">Sách</option><option value="academic">Tài liệu học thuật</option><option value="official">Tài liệu chính thống</option><option value="article">Bài nghiên cứu</option></select></label>
          <label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Độ tin cậy</span><select name="trustLevel" defaultValue={editingSource.trustLevel} className={inputClass}><option value="official">Chính thống</option><option value="academic">Học thuật</option><option value="reference">Tham khảo</option></select></label>

          {error ? <p className="rounded-lg bg-flag/10 px-3 py-2 text-sm font-semibold text-flag md:col-span-2">{error}</p> : null}
          <div className="mt-2 flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" disabled={Boolean(activeAction)} onClick={() => setEditingSource(null)}>Hủy</Button>
            <Button type="submit" disabled={Boolean(activeAction)}><Save className="h-4 w-4" /> {activeAction ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </div>
        </form>
      </div>
    </div> : null}
  </div>;
}

const inputClass = 'h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-charcoal outline-none focus:border-bronze';

function Summary({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return <Card className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className="mt-1 text-3xl font-black text-charcoal">{value.toLocaleString('vi-VN')}</p></div><Icon className="h-7 w-7 text-bronze" /></Card>;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 KB';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
