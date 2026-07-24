'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DatabaseZap, Download, Loader2, Network, RefreshCw, Search, Trash2 } from 'lucide-react';
import { adminDownload, adminFetch } from '@/lib/api/adminClient';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';

interface GraphSummary {
  labels: Array<{ label: string; count: number }>;
  relationships: Array<{ type: string; count: number }>;
  usage?: {
    indexRuns: number;
    embeddingInputTokens: number;
    entityInputTokens: number;
    entityOutputTokens: number;
    totalTokens: number;
  };
}
interface GraphNode { id: string; labels: string[]; title: string; properties: Record<string, unknown>; relationships: Array<{ type: string; direction: string; relatedId: string; relatedTitle: string }> }
interface LegacyPreview {
  nodeCount: number;
  chunkCount: number;
  entityCount: number;
  relationshipCount: number;
  canCleanup: boolean;
}

type GraphMode = 'all' | 'explorer' | 'relationships';

export function GraphWorkspace({ mode = 'all' }: { mode?: GraphMode }) {
  const [summary, setSummary] = useState<GraphSummary>({ labels: [], relationships: [] });
  const [legacy, setLegacy] = useState<LegacyPreview>({
    nodeCount: 0,
    chunkCount: 0,
    entityCount: 0,
    relationshipCount: 0,
    canCleanup: false,
  });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  const [relationshipQuery, setRelationshipQuery] = useState('');
  const [structureMode, setStructureMode] = useState<'nodes' | 'relationships'>(
    mode === 'relationships' ? 'relationships' : 'nodes',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [includeEmbeddings, setIncludeEmbeddings] = useState(false);
  const [exportingComponent, setExportingComponent] = useState('');

  async function loadSummary() {
    setLoading(true); setError('');
    try {
      const [nextSummary, nextLegacy] = await Promise.all([
        adminFetch<GraphSummary>('/api/admin/ai/graph'),
        adminFetch<LegacyPreview>('/api/admin/ai/graph/legacy'),
      ]);
      setSummary(nextSummary);
      setLegacy(nextLegacy);
    }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể đọc graph.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadSummary(); }, []);

  async function search(event?: FormEvent) {
    event?.preventDefault(); setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ mode: 'search', query, label, limit: '60' });
      setNodes((await adminFetch<{ items: GraphNode[] }>(`/api/admin/ai/graph?${params}`)).items);
    } catch (searchError) { setError(searchError instanceof Error ? searchError.message : 'Tìm graph thất bại.'); }
    finally { setLoading(false); }
  }

  async function cleanupLegacy() {
    const confirmation = window.prompt(
      'Thao tác này xóa vĩnh viễn toàn bộ node và quan hệ của pipeline cũ. Nhập DELETE_LEGACY_GRAPH để xác nhận.',
    );
    if (confirmation !== 'DELETE_LEGACY_GRAPH') return;
    setLoading(true); setError(''); setMessage('');
    try {
      await adminFetch('/api/admin/ai/graph/legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      setMessage('Đã xóa dữ liệu graph legacy. Pipeline PDF mới được giữ nguyên.');
      await loadSummary();
    } catch (cleanupError) {
      setError(cleanupError instanceof Error ? cleanupError.message : 'Dọn graph legacy thất bại.');
    } finally {
      setLoading(false);
    }
  }

  async function exportComponent(componentType: 'node' | 'relationship', name: string) {
    const exportKey = `${componentType}:${name}`;
    setExportingComponent(exportKey); setError(''); setMessage('');
    try {
      const params = new URLSearchParams({
        componentType,
        name,
        includeEmbeddings: String(includeEmbeddings),
      });
      const { blob, filename } = await adminDownload(`/api/admin/ai/graph/export?${params}`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename ?? `neo4j-${componentType}-${name}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`Đã xuất JSON cho ${componentType === 'node' ? 'loại node' : 'quan hệ'} ${name}.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Xuất graph thất bại.');
    } finally {
      setExportingComponent('');
    }
  }

  const nodeCount = summary.labels.reduce((total, item) => total + item.count, 0);
  const relationCount = summary.relationships.reduce((total, item) => total + item.count, 0);
  const structureItems = (structureMode === 'relationships'
    ? summary.relationships.map((item) => ({ name: item.type, count: item.count }))
    : summary.labels.map((item) => ({ name: item.label, count: item.count })))
    .filter((item) => item.name.toLocaleLowerCase('vi').includes(relationshipQuery.trim().toLocaleLowerCase('vi')));
  return <div>
    <div className="grid gap-4 md:grid-cols-4"><Metric icon={DatabaseZap} label="Tổng nodes PDF" value={nodeCount} /><Metric icon={Network} label="Quan hệ" value={relationCount} /><Metric icon={RefreshCw} label="Loại node" value={summary.labels.length} /><Metric icon={DatabaseZap} label="Token index" value={summary.usage?.totalTokens ?? 0} /></div>
    {error ? <p className="mt-4 rounded-lg bg-flag/10 p-3 text-sm font-semibold text-flag">{error}</p> : null}{message ? <p className="mt-4 rounded-lg bg-emerald-600/10 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
    {(legacy.nodeCount || legacy.relationshipCount) ? <Card className="mt-5 border-amber-300 bg-amber-50/70"><CardTitle>Dữ liệu pipeline cũ đang được ẩn</CardTitle><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">Neo4j còn {legacy.nodeCount.toLocaleString('vi-VN')} node legacy, gồm {legacy.chunkCount.toLocaleString('vi-VN')} Chunk và {legacy.entityCount.toLocaleString('vi-VN')} Entity; ngoài ra có {legacy.relationshipCount.toLocaleString('vi-VN')} quan hệ legacy. Chúng không còn xuất hiện trong thống kê/tìm kiếm PDF mới.</p>{legacy.canCleanup ? <Button className="mt-5" variant="danger" onClick={() => void cleanupLegacy()} disabled={loading}><Trash2 className="h-4 w-4" /> Xóa pipeline cũ</Button> : <p className="mt-4 text-xs font-semibold text-amber-800">Chỉ super_admin có quyền xóa dữ liệu legacy.</p>}</Card> : null}
    <div className="mt-5 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Cấu trúc graph</CardTitle>{mode === 'all' ? <div className="flex rounded-lg border border-[var(--border)] bg-white/55 p-1"><button type="button" onClick={() => setStructureMode('nodes')} className={`rounded-md px-3 py-1.5 text-xs font-bold ${structureMode === 'nodes' ? 'bg-charcoal text-ivory' : 'text-stone-600'}`}>Loại node</button><button type="button" onClick={() => setStructureMode('relationships')} className={`rounded-md px-3 py-1.5 text-xs font-bold ${structureMode === 'relationships' ? 'bg-charcoal text-ivory' : 'text-stone-600'}`}>Quan hệ</button></div> : null}</div>{structureMode === 'relationships' ? <input value={relationshipQuery} onChange={(event) => setRelationshipQuery(event.target.value)} className={`${inputClass} mt-4 w-full`} placeholder="Lọc tên quan hệ..." /> : null}<label className="mt-4 flex items-start gap-2 rounded-lg bg-black/[0.035] px-3 py-2.5 text-xs text-stone-600"><input type="checkbox" checked={includeEmbeddings} onChange={(event) => setIncludeEmbeddings(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#B8860B]" /><span><strong className="text-charcoal">Kèm vector embedding</strong><br />Chỉ bật khi cần sao lưu vector; file AIChunk có thể rất lớn.</span></label><div className="mt-4 grid max-h-[720px] gap-2 overflow-auto pr-1">{structureItems.map((item) => { const componentType = structureMode === 'nodes' ? 'node' : 'relationship'; const exportKey = `${componentType}:${item.name}`; return <div key={item.name} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/55 p-1.5 hover:bg-white"><button type="button" onClick={() => { if (structureMode === 'nodes') setLabel(item.name); }} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-1.5 text-left"><span className="break-words font-bold text-charcoal">{item.name}</span><Badge tone="gold">{item.count.toLocaleString('vi-VN')}</Badge></button><button type="button" onClick={() => void exportComponent(componentType, item.name)} disabled={Boolean(exportingComponent)} title={`Xuất ${item.name} thành JSON`} aria-label={`Xuất ${item.name} thành JSON`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-bronze transition hover:bg-gold/15 disabled:opacity-50">{exportingComponent === exportKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button></div>; })}{!structureItems.length ? <p className="py-8 text-center text-sm text-stone-500">Không có dữ liệu cấu trúc phù hợp.</p> : null}</div></Card>
      <Card><CardTitle>Tìm node trong pipeline PDF</CardTitle><form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]"><select value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass}><option value="">Mọi loại node</option>{summary.labels.map((item) => <option key={item.label}>{item.label}</option>)}</select><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} placeholder="Tên nguồn, chunk hoặc thực thể..." /><Button disabled={loading}><Search className="h-4 w-4" /> Tìm</Button></form><div className="mt-4 grid max-h-[720px] gap-3 overflow-auto">{nodes.map((node) => <details key={node.id} className="rounded-lg border border-[var(--border)] bg-white/55 p-4"><summary className="cursor-pointer list-none"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-charcoal">{node.title || node.id}</p><p className="mt-1 text-xs text-stone-500">{node.id}</p></div><Badge tone="neutral">{node.labels.join(', ')}</Badge></div></summary><div className="mt-4 border-t border-[var(--border)] pt-3"><pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-5 text-stone-600">{JSON.stringify(node.properties, null, 2)}</pre><div className="mt-3 grid gap-2">{node.relationships.filter((relation) => relation.type).map((relation, index) => <p key={`${relation.type}-${index}`} className="rounded-md bg-black/[0.035] px-3 py-2 text-xs"><strong>{relation.direction === 'out' ? '→' : '←'} {relation.type}</strong> · {relation.relatedTitle || relation.relatedId}</p>)}</div></div></details>)}{!nodes.length ? <p className="py-10 text-center text-sm text-stone-500">Nhập từ khóa hoặc chọn loại node rồi bấm Tìm.</p> : null}</div></Card>
    </div>
  </div>;
}

const inputClass = 'h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-charcoal outline-none focus:border-bronze';
function Metric({ icon: Icon, label, value }: { icon: typeof Network; label: string; value: number }) { return <Card className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className="mt-1 text-3xl font-black text-charcoal">{value.toLocaleString('vi-VN')}</p></div><Icon className="h-7 w-7 text-bronze" /></Card>; }
