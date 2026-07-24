'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BookOpen, FileSearch, Gauge, Layers3, Network, Users } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import type { KnowledgeSourceDetail } from '@/lib/ai/backend';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';

export function KnowledgeSourceInspector({ sourceId }: { sourceId: string }) {
  const [detail, setDetail] = useState<KnowledgeSourceDetail | null>(null);
  const [page, setPage] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (selectedPage = page, search = query) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '160' });
      if (selectedPage) params.set('page_number', selectedPage);
      if (search.trim()) params.set('query', search.trim());
      setDetail(await adminFetch(`/api/admin/ai/knowledge/${sourceId}/detail?${params}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể đọc dữ liệu index.');
    } finally {
      setLoading(false);
    }
  }, [page, query, sourceId]);

  useEffect(() => {
    let active = true;

    async function loadInitialDetail() {
      setLoading(true);
      setError('');
      try {
        const initialDetail = await adminFetch<KnowledgeSourceDetail>(
          `/api/admin/ai/knowledge/${sourceId}/detail?limit=160`,
        );
        if (active) setDetail(initialDetail);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Không thể đọc dữ liệu index.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialDetail();
    return () => {
      active = false;
    };
  }, [sourceId]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  if (error && !detail) return <Card><p className="font-semibold text-flag">{error}</p><p className="mt-2 text-sm text-stone-600">Backend sẽ tự kiểm tra và nối lại cấu trúc trang/chunk khi mở tài liệu. Chỉ cần Index lại khi thông báo lỗi nêu rõ dữ liệu nguồn chưa đầy đủ.</p></Card>;
  if (!detail) return <Card><p className="text-sm text-stone-600">{loading ? 'Đang đọc Neo4j...' : 'Không có dữ liệu.'}</p></Card>;
  const totalPages = Number(detail.source.totalPageCount ?? detail.pageCount);
  const indexedPages = Number(
    detail.source.indexedPageCount
    ?? detail.pages.filter((item) => item.chunkCount > 0).length,
  );
  const contentStartPage = Number(detail.source.contentStartPage ?? 1);
  const contentEndPage = Number(detail.source.contentEndPage ?? totalPages);
  const skippedPageCount = Number(detail.source.skippedPageCount ?? 0);
  const footnotePageCount = Number(detail.source.footnotePageCount ?? 0);
  const removedFootnoteChars = Number(detail.source.removedFootnoteChars ?? 0);
  const runningHeaderPageCount = Number(detail.source.runningHeaderPageCount ?? 0);
  const removedRunningHeaderChars = Number(detail.source.removedRunningHeaderChars ?? 0);

  return <div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <Metric icon={BookOpen} label="Nguồn" value={String(detail.source.title ?? sourceId)} />
      <Metric icon={FileSearch} label="Trang sử dụng" value={`${indexedPages.toLocaleString('vi-VN')}/${totalPages.toLocaleString('vi-VN')}`} />
      <Metric icon={Layers3} label="Chunks" value={detail.chunkCount.toLocaleString('vi-VN')} />
      <Metric icon={Users} label="Entities" value={Number(detail.source.entityCount ?? 0).toLocaleString('vi-VN')} />
      <Metric icon={Network} label="Quan hệ" value={Number(detail.source.semanticRelationshipCount ?? 0).toLocaleString('vi-VN')} />
      <Metric icon={Gauge} label="Token index" value={Number(detail.source.lastIndexTotalTokens ?? 0).toLocaleString('vi-VN')} />
    </div>
    {skippedPageCount > 0 ? <Card className="mt-5 border-amber-300 bg-amber-50/70"><p className="font-black text-charcoal">Đã tự động giới hạn nội dung lịch sử ở trang {contentStartPage}–{contentEndPage}</p><p className="mt-2 text-sm leading-6 text-stone-600">Bỏ qua {skippedPageCount} trang mở đầu/tài liệu tham khảo. Các trang này vẫn hiện trong bản đồ để kiểm tra nhưng có 0 chunk và không được gửi sang OpenAI.</p></Card> : null}
    {footnotePageCount > 0 ? <Card className="mt-4 border-amber-300 bg-amber-50/70"><p className="font-black text-charcoal">Đã bỏ chú thích cuối trang ở {footnotePageCount} trang</p><p className="mt-2 text-sm leading-6 text-stone-600">Đã loại {removedFootnoteChars.toLocaleString('vi-VN')} ký tự nguồn trích dẫn trước khi tạo chunk. Nội dung phía trên đường phân cách vẫn được giữ và số trang trích dẫn không thay đổi.</p></Card> : null}
    {runningHeaderPageCount > 0 ? <Card className="mt-4 border-amber-300 bg-amber-50/70"><p className="font-black text-charcoal">Đã bỏ tiêu đề lặp đầu trang ở {runningHeaderPageCount} trang</p><p className="mt-2 text-sm leading-6 text-stone-600">Đã loại {removedRunningHeaderChars.toLocaleString('vi-VN')} ký tự nằm phía trên đường phân cách. Tiêu đề mở đầu chương thật vẫn được giữ.</p></Card> : null}

    <Card className="mt-5">
      <CardTitle>Kiểm tra trích xuất</CardTitle>
      <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <select value={page} onChange={(event) => setPage(event.target.value)} className={inputClass}>
          <option value="">Tất cả trang</option>
          {detail.pages.map((item) => <option key={item.id} value={item.pageNumber}>Trang {item.pageNumber} · {item.chunkCount} chunks</option>)}
        </select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Tìm nội dung trong các chunk..." />
        <Button type="submit" disabled={loading}><FileSearch className="h-4 w-4" /> {loading ? 'Đang lọc' : 'Lọc'}</Button>
      </form>
      {error ? <p className="mt-3 text-sm font-semibold text-flag">{error}</p> : null}
    </Card>

    <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card className="max-h-[760px] overflow-auto">
        <CardTitle>Bản đồ trang</CardTitle>
        <div className="mt-4 grid gap-2">{detail.pages.map((item) => <button key={item.id} onClick={() => { setPage(String(item.pageNumber)); void load(String(item.pageNumber), query); }} className={`rounded-lg border p-3 text-left transition ${page === String(item.pageNumber) ? 'border-bronze bg-bronze/10' : 'border-[var(--border)] bg-white/50 hover:bg-white'}`}>
          <div className="flex items-center justify-between gap-2"><strong>Trang {item.pageNumber}</strong><div className="flex flex-wrap justify-end gap-2">{item.runningHeaderRemoved ? <Badge tone="neutral">Đã bỏ header</Badge> : null}{item.footnoteRemoved ? <Badge tone="neutral">Đã bỏ chú thích</Badge> : null}<Badge tone={item.extractionStatus === 'ready' ? 'green' : item.extractionStatus.startsWith('excluded_') ? 'neutral' : 'gold'}>{item.extractionStatus.startsWith('excluded_') ? 'Bỏ qua' : `${item.chunkCount} chunks`}</Badge></div></div>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">{item.preview || 'Trang không có text trích xuất.'}</p>
        </button>)}</div>
      </Card>
      <div className="grid content-start gap-4">{detail.chunks.length ? detail.chunks.map((chunk) => <Card key={chunk.id}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-charcoal">Chunk #{chunk.sequence} · trang {chunk.pageStart}{chunk.pageEnd !== chunk.pageStart ? `-${chunk.pageEnd}` : ''}</p><div className="flex flex-wrap gap-2"><Badge tone={chunk.active === false ? 'red' : 'green'}>{chunk.active === false ? 'Tắt' : 'Hoạt động'}</Badge><Badge tone="neutral">{chunk.charCount} ký tự</Badge>{chunk.extractionStatus ? <Badge tone={chunk.extractionStatus === 'ready' ? 'green' : 'gold'}>{chunk.extractionStatus}</Badge> : null}{chunk.yearStart ? <Badge tone="neutral">{chunk.yearStart}{chunk.yearEnd && chunk.yearEnd !== chunk.yearStart ? `–${chunk.yearEnd}` : ''}</Badge> : null}</div></div>
        {chunk.heading ? <p className="mt-2 text-sm font-bold text-bronze">{chunk.heading}</p> : null}
        {chunk.facets?.length ? <div className="mt-3 flex flex-wrap gap-2">{chunk.facets.map((facet) => <Badge key={facet} tone="neutral">{facet}</Badge>)}</div> : null}
        {chunk.entityDetails?.length ? <div className="mt-3 flex flex-wrap gap-2">{chunk.entityDetails.map((entity) => <span key={entity.canonicalId} title={entity.aliases?.length ? `Alias: ${entity.aliases.join(', ')}` : undefined}><Badge tone="gold">{entity.name} · {entity.entityType}</Badge></span>)}</div> : chunk.entities?.length ? <div className="mt-3 flex flex-wrap gap-2">{chunk.entities.map((entity) => <Badge key={entity} tone="gold">{entity}</Badge>)}</div> : null}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{chunk.text}</p>
      </Card>) : <Card><p className="text-center text-sm text-stone-600">Không có chunk phù hợp bộ lọc.</p></Card>}</div>
    </div>
  </div>;
}

const inputClass = 'h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-charcoal outline-none focus:border-bronze';

function Metric({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return <Card className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className="mt-1 truncate text-xl font-black text-charcoal">{value}</p></div><Icon className="h-7 w-7 shrink-0 text-bronze" /></Card>;
}
