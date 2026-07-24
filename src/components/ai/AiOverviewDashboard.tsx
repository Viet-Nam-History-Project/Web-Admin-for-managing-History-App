import Link from 'next/link';
import { AlertCircle, BookOpen, CheckCircle2, Database, FileStack, Server } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import type { AiBackendHealth } from '@/lib/ai/backend';
import type { KnowledgeSource } from '@/services/knowledgeAdminService';

export function AiOverviewDashboard({
  health,
  healthError,
  sources,
}: {
  health: AiBackendHealth | null;
  healthError: string;
  sources: KnowledgeSource[];
}) {
  const ready = sources.filter((source) => source.status === 'ready').length;
  const failed = sources.filter((source) => source.status === 'failed').length;
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={health ? CheckCircle2 : AlertCircle} label="Trợ lý AI" value={health ? 'Sẵn sàng' : 'Chưa kết nối'} tone={health ? 'green' : 'red'} />
      <Metric icon={Database} label="Neo4j" value={health?.neo4j ?? '—'} />
      <Metric icon={BookOpen} label="Nguồn sẵn sàng" value={`${ready}/${sources.length}`} />
      <Metric icon={FileStack} label="Trang đã index" value={(health?.indexed_pages ?? 0).toLocaleString('vi-VN')} />
      <Metric icon={FileStack} label="Chunks đã index" value={(health?.indexed_chunks ?? 0).toLocaleString('vi-VN')} />
    </div>
    {healthError ? <div className="mt-5 rounded-xl border border-flag/20 bg-flag/5 px-4 py-3 text-sm font-semibold text-flag">Không thể kết nối với trợ lý AI. Vui lòng thử lại sau.</div> : null}
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card><div className="flex items-center justify-between"><CardTitle>Luồng tri thức</CardTitle><Server className="h-6 w-6 text-bronze" /></div><ol className="mt-5 grid gap-4">{[
        ['1', 'Upload PDF', 'Admin khai báo nguồn và lưu file gốc trên Firebase Storage.'],
        ['2', 'Trích xuất theo trang', 'Backend tạo KnowledgePage, bỏ header/footer lặp và chia chunk có dấu vết trang.'],
        ['3', 'Hybrid retrieval', 'Neo4j kết hợp vector và full-text, sau đó rerank để loại những tên chỉ xuất hiện tình cờ.'],
        ['4', 'Trả lời có kiểm chứng', 'App chỉ hiển thị câu trả lời; nguồn và số trang được giữ riêng trong Web Admin để đánh giá.'],
      ].map(([number, title, description]) => <li key={number} className="grid grid-cols-[36px_1fr] gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-bronze font-black text-white">{number}</span><div><p className="font-black text-charcoal">{title}</p><p className="mt-1 text-sm leading-6 text-stone-600">{description}</p></div></li>)}</ol></Card>
      <Card><CardTitle>Trạng thái kho dữ liệu</CardTitle><div className="mt-5 grid gap-3"><Status label="Sẵn sàng" value={ready} color="bg-emerald-600" /><Status label="Chờ index" value={sources.filter((source) => source.status === 'uploaded').length} color="bg-bronze" /><Status label="Đang index" value={sources.filter((source) => source.status === 'indexing').length} color="bg-gold" /><Status label="Đã tạm dừng" value={sources.filter((source) => source.status === 'paused').length} color="bg-amber-500" /><Status label="Lỗi" value={failed} color="bg-flag" /><Status label="Đã gỡ" value={sources.filter((source) => source.status === 'disabled').length} color="bg-stone-500" /></div><p className="mt-5 text-xs leading-5 text-stone-500">Mô hình: {health?.model ?? 'Chưa xác định'} · RAG: {health?.rag_revision ?? 'backend cũ/chưa xác định'}.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/ai/prompts#evaluation" className="rounded-lg bg-charcoal px-3 py-2 text-xs font-bold text-ivory">Chạy kiểm thử</Link><Link href="#suggestions" className="rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-xs font-bold text-charcoal">Xem gợi ý</Link></div></Card>
    </div>
  </>;
}

function Metric({ icon: Icon, label, value, tone = 'gold' }: { icon: typeof Server; label: string; value: string; tone?: 'gold' | 'green' | 'red' }) {
  const colors = tone === 'green' ? 'text-emerald-700 bg-emerald-600/10' : tone === 'red' ? 'text-flag bg-flag/10' : 'text-bronze bg-gold/15';
  return <Card className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className="mt-2 text-xl font-black text-charcoal">{value}</p></div><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors}`}><Icon className="h-6 w-6" /></div></Card>;
}

function Status({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/55 px-3 py-3"><span className="flex items-center gap-2 text-sm font-bold text-charcoal"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span><strong>{value}</strong></div>;
}
