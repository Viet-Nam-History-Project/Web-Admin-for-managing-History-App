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
import { BackButton } from '@/components/ui/BackButton';
import { CoverImage } from '@/components/ui/CoverImage';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { CreateEventForStage } from '@/components/admin/CreateEventForStage';
import { periodAdminService } from '@/services/periodAdminService';
import { stageAdminService } from '@/services/stageAdminService';
import { eventAdminService } from '@/services/eventAdminService';
import { auditAdminService } from '@/services/auditAdminService';
import { formatAdminDateTime, formatHistoricalRange } from '@/lib/utils/historicalDate';
import { paths } from '@/lib/firebase/firestorePaths';

export const dynamic = 'force-dynamic';

const tabs = [
  ['overview', 'Tổng quan'], ['stages', 'Giai đoạn'], ['events', 'Sự kiện'],
  ['persons', 'Nhân vật liên quan'], ['quizzes', 'Quiz liên quan'], ['quality', 'Chất lượng'],
  ['graph', 'Graph relations'], ['audit', 'Audit logs'],
] as const;

export default async function PeriodDetailAdminPage({ params, searchParams }: { params: Promise<{ periodSlug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { periodSlug } = await params;
  const activeTab = (await searchParams).tab ?? 'overview';
  const period = await periodAdminService.get(periodSlug).catch(() => null);
  if (!period) notFound();
  const stages = (await stageAdminService.list(periodSlug).catch(() => ({ items: [] }))).items;
  const events = await eventAdminService.listAllInPeriod(periodSlug).catch(() => []);
  const auditLogs = activeTab === 'audit' ? (await auditAdminService.list({ entityPathPrefix: paths.period(periodSlug) }).catch(() => ({ items: [] }))).items : [];

  return <AdminShell>
    <div className="mb-3"><BackButton fallbackHref="/content/periods" label="Danh sách thời kỳ" /></div>
    <div className="mb-3 text-sm text-stone-500"><Link href="/content/periods" className="font-bold text-bronze">Quản lý nội dung</Link> / {period.title}</div>
    <PageHeader eyebrow="Trung tâm quản lý thời kỳ" title={period.title} description={`${formatHistoricalRange(period.startDate, period.endDate)} · ${stages.length} giai đoạn · ${events.length} sự kiện`}
      actions={<EntityActionButton url={`/api/admin/periods/${periodSlug}?action=sync`} label="Sync graph" />} />
    <div className="museum-scrollbar mb-5 flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-3">{tabs.map(([id, label]) => <Link key={id} href={`?tab=${id}`} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${activeTab === id ? 'bg-charcoal text-gold' : 'bg-white/55 text-stone-600 hover:bg-white'}`}>{label}{id === 'stages' ? ` (${stages.length})` : id === 'events' ? ` (${events.length})` : ''}</Link>)}</div>

    {activeTab === 'overview' ? <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Card className="overflow-hidden p-0"><div className="aspect-[16/10] bg-stone-200"><CoverImage source={period.coverMediaRef} alt={period.title} /></div><div className="p-5"><Badge tone={period.status === 'published' ? 'green' : 'gold'}>{period.status}</Badge><p className="mt-3 text-sm leading-6 text-stone-600">{period.summary || 'Chưa có tóm tắt.'}</p></div></Card><Card><CardTitle>Thông tin nội dung</CardTitle><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Slug" value={periodSlug} /><Info label="Niên đại" value={formatHistoricalRange(period.startDate, period.endDate)} /><Info label="Thứ tự" value={String(period.sortOrder ?? 0)} /><Info label="Graph" value={period.graphSyncStatus ?? 'pending'} /></dl><div className="mt-5 border-t border-[var(--border)] pt-5"><p className="whitespace-pre-wrap text-sm leading-7 text-stone-700">{period.description || 'Chưa có mô tả chi tiết.'}</p></div></Card></div> : null}

    {activeTab === 'stages' ? <section><div className="mb-4 flex justify-end"><Link href={`/content/periods/${periodSlug}/stages/new`}><Button><Plus className="h-4 w-4" /> Tạo giai đoạn</Button></Link></div>{stages.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Giai đoạn</TableHeaderCell><TableHeaderCell>Niên đại</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell><TableHeaderCell>Events</TableHeaderCell><TableHeaderCell>Graph</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{stages.map((stage) => <TableRow key={stage.id}><TableCell><Link className="font-black text-charcoal hover:text-bronze" href={`/content/periods/${periodSlug}/stages/${stage.id}`}>{stage.title}</Link><p className="text-xs text-stone-500">{stage.id}</p></TableCell><TableCell>{formatHistoricalRange(stage.startDate, stage.endDate)}</TableCell><TableCell><Badge tone={stage.status === 'published' ? 'green' : 'gold'}>{stage.status}</Badge></TableCell><TableCell>{stage.eventCount ?? 0}</TableCell><TableCell><Badge tone={stage.graphSyncStatus === 'synced' ? 'green' : 'neutral'}>{stage.graphSyncStatus ?? 'pending'}</Badge></TableCell><TableCell><div className="flex gap-2"><Link href={`/content/periods/${periodSlug}/stages/${stage.id}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton method="DELETE" url={`/api/admin/periods/${periodSlug}/stages/${stage.id}`} variant="danger" label="Xóa" confirmMessage={`Xóa mềm giai đoạn “${stage.title}”? Các sự kiện con vẫn được giữ để phục hồi.`} /></div></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có giai đoạn" description="Tạo giai đoạn đầu tiên trong thời kỳ này." />}</section> : null}

    {activeTab === 'events' ? <section><div className="mb-4 flex justify-end"><CreateEventForStage periodSlug={periodSlug} stages={stages.map((stage) => ({ id: stage.id, title: stage.title }))} /></div>{events.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Sự kiện</TableHeaderCell><TableHeaderCell>Stage cha</TableHeaderCell><TableHeaderCell>Niên đại</TableHeaderCell><TableHeaderCell>Ảnh</TableHeaderCell><TableHeaderCell>Video</TableHeaderCell><TableHeaderCell>Graph</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{events.map((event) => <TableRow key={`${event.stageSlug}/${event.id}`}><TableCell><Link className="font-bold text-charcoal hover:text-bronze" href={`/content/periods/${periodSlug}/stages/${event.stageSlug}/events/${event.id}`}>{event.title}</Link></TableCell><TableCell>{event.stageTitle}</TableCell><TableCell>{formatHistoricalRange(event.startDate, event.endDate)}</TableCell><TableCell>{event.coverMediaRef ? 'Có' : 'Thiếu'}</TableCell><TableCell>{event.videos?.length || event.youtubeId ? 'Có' : 'Thiếu'}</TableCell><TableCell><Badge tone={event.graphSyncStatus === 'synced' ? 'green' : 'neutral'}>{event.graphSyncStatus ?? 'pending'}</Badge></TableCell><TableCell><div className="flex gap-2"><Link href={`/content/periods/${periodSlug}/stages/${event.stageSlug}/events/${event.id}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton method="DELETE" url={`/api/admin/periods/${periodSlug}/stages/${event.stageSlug}/events/${event.id}`} variant="danger" label="Xóa" confirmMessage={`Chuyển sự kiện “${event.title}” vào thùng rác?`} /></div></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có sự kiện" description={stages.length ? 'Tạo sự kiện đầu tiên trong một giai đoạn.' : 'Hãy tạo giai đoạn trước khi tạo sự kiện.'} />}</section> : null}

    {activeTab === 'quality' ? <Card><CardTitle>Kiểm tra nhanh thời kỳ</CardTitle><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Check label="Tiêu đề" ok={Boolean(period.title)} /><Check label="Ảnh bìa" ok={Boolean(period.coverMediaRef)} /><Check label="Tóm tắt" ok={Boolean(period.summary || period.description)} /><Check label="Có giai đoạn" ok={stages.length > 0} /></div><Link href="/content/quality" className="mt-5 inline-block font-bold text-bronze">Mở trung tâm chất lượng →</Link></Card> : null}
    {activeTab === 'graph' ? <Card><CardTitle>Graph sync</CardTitle><p className="mt-2 text-sm text-stone-600">Trạng thái hiện tại: <b>{period.graphSyncStatus ?? 'pending'}</b>. Firestore luôn là nguồn chính; Neo4j chỉ nhận node và quan hệ sau khi dữ liệu Firestore đã lưu.</p><div className="mt-4"><EntityActionButton url={`/api/admin/periods/${periodSlug}?action=sync`} label="Sync lại thời kỳ" /></div></Card> : null}
    {activeTab === 'audit' ? <AuditTable items={auditLogs} /> : null}
    {['persons', 'quizzes'].includes(activeTab) ? <EmptyState title={activeTab === 'persons' ? 'Quan hệ nhân vật' : 'Quiz liên quan'} description="Dữ liệu liên kết sẽ xuất hiện khi các document có relatedPersons hoặc quiz target trỏ tới thời kỳ này." /> : null}
  </AdminShell>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-black uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 font-bold text-charcoal">{value}</dd></div>; }
function Check({ label, ok }: { label: string; ok: boolean }) { return <div className={`rounded-xl border p-3 text-sm font-bold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-flag/20 bg-flag/5 text-flag'}`}>{ok ? 'Đạt' : 'Thiếu'} · {label}</div>; }
function AuditTable({ items }: { items: Awaited<ReturnType<typeof auditAdminService.list>>['items'] }) { return items.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Người thao tác</TableHeaderCell><TableHeaderCell>Hành động</TableHeaderCell><TableHeaderCell>Đối tượng</TableHeaderCell></TableRow></TableHead><tbody>{items.map((item) => <TableRow key={item.id}><TableCell>{formatAdminDateTime(item.createdAt)}</TableCell><TableCell>{item.actorEmail ?? 'system'}</TableCell><TableCell><Badge tone="gold">{item.action ?? 'unknown'}</Badge></TableCell><TableCell>{item.entityTitle ?? item.entityPath}</TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có audit log" description="Các thao tác mới sẽ được ghi tại đây." />; }
