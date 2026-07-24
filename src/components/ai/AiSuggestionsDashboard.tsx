'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Gauge, Lightbulb, Timer } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import type { QueryInsights } from '@/lib/ai/backend';
import { Badge } from '@/components/ui/Badge';
import { Card, CardTitle } from '@/components/ui/Card';

export function AiSuggestionsDashboard() {
  const [data, setData] = useState<QueryInsights | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { adminFetch<QueryInsights>('/api/admin/ai/insights').then(setData).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Không thể tải gợi ý.')); }, []);
  if (error) return <Card><p className="font-semibold text-flag">{error}</p><p className="mt-2 text-sm text-stone-600">Chưa thể tải các gợi ý cải thiện lúc này.</p></Card>;
  if (!data) return <Card><p className="text-sm text-stone-600">Đang phân tích query log...</p></Card>;
  const weak = data.items.filter((item) => !item.answerable || item.retrievalScore < 0.55);
  const slow = data.items.filter((item) => item.latencyMs > 8000);
  const suggestions = [
    { active: data.summary.unanswered > 0, title: 'Bổ sung kho tri thức', detail: `${data.summary.unanswered} câu chưa có bằng chứng đủ mạnh. Gom theo chủ đề rồi upload nguồn chính thống.`, href: '/ai/knowledge-base' },
    { active: weak.length > 0, title: 'Tạo regression test', detail: `${weak.length} query có điểm retrieval thấp; đưa chúng vào Kiểm thử AI trước khi đổi prompt.`, href: '/ai/prompts#evaluation' },
    { active: slow.length > 0, title: 'Tối ưu độ trễ', detail: `${slow.length} query mất trên 8 giây. Kiểm tra candidate count, model rerank và kích thước context.`, href: '/ai/overview' },
    { active: data.summary.total > 0, title: 'Rà soát system prompt', detail: 'So sánh các ca đạt/không đạt, tạo phiên bản mới và chỉ kích hoạt sau khi regression test.', href: '/ai/prompts' },
  ].filter((item) => item.active);
  return <div>
    <div className="grid gap-4 md:grid-cols-4"><Metric icon={Lightbulb} label="Query đã ghi" value={data.summary.total} /><Metric icon={AlertTriangle} label="Chưa trả lời" value={data.summary.unanswered} /><Metric icon={Gauge} label="Retrieval TB" value={`${Math.round(data.summary.averageScore * 100)}%`} /><Metric icon={Timer} label="Độ trễ TB" value={`${Math.round(data.summary.averageLatencyMs)} ms`} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><Card><CardTitle>Việc nên làm</CardTitle><div className="mt-4 grid gap-3">{suggestions.length ? suggestions.map((item) => <Link key={item.title} href={item.href} className="rounded-lg border border-[var(--border)] bg-white/55 p-4 transition hover:border-bronze hover:bg-white"><div className="flex items-center justify-between"><p className="font-black text-charcoal">{item.title}</p><ArrowRight className="h-4 w-4 text-bronze" /></div><p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p></Link>) : <p className="text-sm text-stone-500">Chưa có cảnh báo. Tiếp tục chạy các câu hỏi đại diện.</p>}</div></Card><Card><CardTitle>Query cần xem lại</CardTitle><div className="mt-4 grid max-h-[620px] gap-3 overflow-auto">{weak.map((item, index) => <div key={`${item.question}-${index}`} className="rounded-lg border border-[var(--border)] bg-white/55 p-4"><div className="flex items-start justify-between gap-3"><p className="font-bold text-charcoal">{item.question}</p><Badge tone={item.answerable ? 'gold' : 'red'}>{item.answerable ? `${Math.round(item.retrievalScore * 100)}%` : 'Thiếu nguồn'}</Badge></div><p className="mt-2 text-xs text-stone-500">{item.intent || 'general'} · {item.candidateCount} ứng viên → {item.selectedCount} được chọn · {item.latencyMs} ms</p>{item.comparisonIntent ? <p className="mt-2 text-xs text-stone-600">Planner: {item.comparisonIntent} · {item.comparisonDomain || 'chưa phân loại'} · {item.answerStructure || 'bố cục mặc định'}</p> : null}{item.missingComparisonCells?.length ? <p className="mt-1 text-xs font-semibold text-flag">Thiếu {item.missingComparisonCells.length} ô bằng chứng đối tượng × tiêu chí.</p> : null}</div>)}{!weak.length ? <p className="py-8 text-center text-sm text-stone-500">Không có query yếu trong log hiện tại.</p> : null}</div></Card></div>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: number | string }) { return <Card className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className="mt-1 text-2xl font-black text-charcoal">{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</p></div><Icon className="h-7 w-7 text-bronze" /></Card>; }
