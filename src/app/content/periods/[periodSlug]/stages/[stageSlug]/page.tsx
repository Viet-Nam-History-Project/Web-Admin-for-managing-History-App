import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { periodAdminService } from '@/services/periodAdminService';
import { stageAdminService } from '@/services/stageAdminService';
import { eventAdminService } from '@/services/eventAdminService';
import { formatHistoricalRange } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';

export default async function StageDetailPage({ params, searchParams }: { params: Promise<{ periodSlug: string; stageSlug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { periodSlug, stageSlug } = await params;
  const active = (await searchParams).tab ?? 'overview';
  const [period, stage, eventResult] = await Promise.all([periodAdminService.get(periodSlug), stageAdminService.get(periodSlug, stageSlug), eventAdminService.list(periodSlug, stageSlug)]).catch(() => [null, null, { items: [] }] as const);
  if (!stage) notFound();
  const events = eventResult.items;
  const tabs = [['overview', 'Tổng quan'], ['events', `Sự kiện (${events.length})`], ['learning', 'Nội dung học'], ['persons', 'Nhân vật'], ['quiz', 'Quiz'], ['quality', 'Chất lượng'], ['graph', 'Graph'], ['audit', 'Audit logs']];
  return <AdminShell>
    <div className="mb-3 text-sm text-stone-500"><Link href="/content/periods" className="text-bronze">Thời kỳ</Link> / <Link href={`/content/periods/${periodSlug}?tab=stages`} className="text-bronze">{period?.title ?? periodSlug}</Link> / {stage.title}</div>
    <PageHeader eyebrow="Giai đoạn" title={stage.title} description={formatHistoricalRange(stage.startDate, stage.endDate)} actions={<><Link href={`/content/periods/${periodSlug}/stages/${stageSlug}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton url={`/api/admin/periods/${periodSlug}/stages/${stageSlug}?action=${stage.status === 'published' ? 'unpublish' : 'publish'}`} label={stage.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton url={`/api/admin/periods/${periodSlug}/stages/${stageSlug}?action=sync`} label="Sync graph" /><EntityActionButton method="DELETE" url={`/api/admin/periods/${periodSlug}/stages/${stageSlug}`} variant="danger" label="Xóa mềm" confirmMessage="Xóa mềm giai đoạn này? Các sự kiện con vẫn được giữ nguyên." /></>} />
    <div className="museum-scrollbar mb-5 flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-3">{tabs.map(([id, label]) => <Link key={id} href={`?tab=${id}`} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === id ? 'bg-charcoal text-gold' : 'bg-white/55 text-stone-600'}`}>{label}</Link>)}</div>
    {active === 'overview' ? <div className="grid gap-5 lg:grid-cols-2"><Card className="overflow-hidden p-0"><div className="aspect-[16/10] bg-stone-200">{stage.coverMediaRef ? <img src={stage.coverMediaRef} alt={stage.title} className="h-full w-full object-cover" /> : null}</div></Card><Card><CardTitle>Nội dung giai đoạn</CardTitle><Badge className="mt-3" tone={stage.status === 'published' ? 'green' : 'gold'}>{stage.status}</Badge><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{stage.overview || stage.description || 'Chưa có overview.'}</p><p className="mt-4 text-sm text-stone-500">Tác động: {stage.impactOnPresent || 'Chưa cập nhật'}</p></Card></div> : null}
    {active === 'events' ? <section><div className="mb-4 flex justify-end"><Link href={`/content/periods/${periodSlug}/stages/${stageSlug}/events/new`}><Button><Plus className="h-4 w-4" /> Tạo sự kiện</Button></Link></div>{events.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Sự kiện</TableHeaderCell><TableHeaderCell>Niên đại</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell><TableHeaderCell>Ảnh</TableHeaderCell><TableHeaderCell>Video</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{events.map((event) => <TableRow key={event.id}><TableCell><Link className="font-black text-charcoal" href={`/content/periods/${periodSlug}/stages/${stageSlug}/events/${event.id}`}>{event.title}</Link><p className="text-xs text-stone-500">{event.id}</p></TableCell><TableCell>{formatHistoricalRange(event.startDate, event.endDate)}</TableCell><TableCell><Badge tone={event.status === 'published' ? 'green' : 'gold'}>{event.status}</Badge></TableCell><TableCell>{event.coverMediaRef ? 'Có' : 'Thiếu'}</TableCell><TableCell>{event.videos?.length || event.youtubeId ? 'Có' : 'Thiếu'}</TableCell><TableCell><div className="flex gap-2"><Link href={`/content/periods/${periodSlug}/stages/${stageSlug}/events/${event.id}`}><Button variant="ghost">Mở</Button></Link><Link href={`/content/periods/${periodSlug}/stages/${stageSlug}/events/${event.id}/edit`}><Button variant="outline">Sửa</Button></Link></div></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có sự kiện" description="Tạo sự kiện đầu tiên trong giai đoạn này." />}</section> : null}
    {active === 'learning' ? <Card><CardTitle>Nội dung học</CardTitle><Section title="Chi tiết" items={stage.details} /><Section title="Kết quả" items={stage.result} /><p className="mt-4 text-sm leading-6">{stage.impactOnPresent}</p></Card> : null}
    {active === 'quality' ? <Card><CardTitle>Kiểm tra chất lượng</CardTitle><div className="mt-4 grid gap-3 sm:grid-cols-4"><Quality label="Ảnh" ok={Boolean(stage.coverMediaRef)} /><Quality label="Overview" ok={Boolean(stage.overview)} /><Quality label="Nội dung" ok={Boolean(stage.details?.length || stage.result?.length)} /><Quality label="Sự kiện" ok={events.length > 0} /></div></Card> : null}
    {['persons', 'quiz', 'graph', 'audit'].includes(active) ? <EmptyState title="Dữ liệu liên kết" description="Module này đọc quan hệ theo document hiện tại; dữ liệu sẽ xuất hiện sau khi được liên kết hoặc sync." /> : null}
  </AdminShell>;
}

function Section({ title, items }: { title: string; items?: string[] }) { return <div className="mt-5"><h3 className="font-black text-charcoal">{title}</h3>{items?.length ? <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-stone-700">{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-stone-500">Chưa có dữ liệu.</p>}</div>; }
function Quality({ label, ok }: { label: string; ok: boolean }) { return <div className={`rounded-xl p-3 text-sm font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-flag/5 text-flag'}`}>{ok ? 'Đạt' : 'Thiếu'} · {label}</div>; }
