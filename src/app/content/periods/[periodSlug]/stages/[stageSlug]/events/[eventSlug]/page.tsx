import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { BackButton } from '@/components/ui/BackButton';
import { CoverImage } from '@/components/ui/CoverImage';
import { periodAdminService } from '@/services/periodAdminService';
import { stageAdminService } from '@/services/stageAdminService';
import { eventAdminService } from '@/services/eventAdminService';
import { formatHistoricalRange } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';
export default async function EventDetailPage({ params }: { params: Promise<{ periodSlug: string; stageSlug: string; eventSlug: string }> }) {
  const { periodSlug, stageSlug, eventSlug } = await params;
  const [period, stage, event] = await Promise.all([periodAdminService.get(periodSlug), stageAdminService.get(periodSlug, stageSlug), eventAdminService.get(periodSlug, stageSlug, eventSlug)]);
  if (!event) notFound();
  return <AdminShell>
    <div className="mb-3"><BackButton fallbackHref={`/content/periods/${periodSlug}/stages/${stageSlug}?tab=events`} label="Quay lại giai đoạn" /></div>
    <div className="mb-3 text-sm text-stone-500"><Link className="text-bronze" href={`/content/periods/${periodSlug}`}>{period?.title ?? periodSlug}</Link> / <Link className="text-bronze" href={`/content/periods/${periodSlug}/stages/${stageSlug}?tab=events`}>{stage?.title ?? stageSlug}</Link> / {event.title}</div>
    <PageHeader eyebrow="Chi tiết sự kiện" title={event.title} description={formatHistoricalRange(event.startDate, event.endDate)} actions={<><Link href={`/content/periods/${periodSlug}/stages/${stageSlug}/events/${eventSlug}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton url={`/api/admin/periods/${periodSlug}/stages/${stageSlug}/events/${eventSlug}?action=${event.status === 'published' ? 'unpublish' : 'publish'}`} label={event.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton method="DELETE" url={`/api/admin/periods/${periodSlug}/stages/${stageSlug}/events/${eventSlug}`} variant="danger" label="Xóa mềm" confirmMessage="Chuyển sự kiện này vào thùng rác?" /></>} />
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Card className="overflow-hidden p-0"><div className="aspect-[4/3] bg-stone-200"><CoverImage source={event.coverMediaRef} alt={event.title} /></div><div className="p-5"><Badge tone={event.status === 'published' ? 'green' : 'gold'}>{event.status}</Badge><p className="mt-3 text-sm leading-6 text-stone-700">{event.summary || event.description || 'Chưa có tóm tắt.'}</p></div></Card><div className="grid gap-4"><ContentSection title="Lí do" items={event.warCause} /><ContentSection title="Mục tiêu" items={event.details} /><ContentSection title="Lực lượng Việt Nam" items={event.content?.forces?.vn} /><ContentSection title="Lực lượng đối phương" items={event.content?.forces?.usAllies} /><ContentSection title="Diễn biến" items={event.content?.warSummary?.map((item) => item.detail ?? '').filter(Boolean)} /><ContentSection title="Kết quả" items={[...(event.content?.result?.vn ?? []), ...(event.content?.result?.usAllies ?? [])]} /><ContentSection title="Ý nghĩa" items={event.meaning} />{event.videos?.length || event.youtubeId ? <Card><CardTitle>Tư liệu video</CardTitle><p className="mt-2 break-all text-sm text-bronze">{event.youtubeId || (typeof event.videos?.[0] === 'string' ? event.videos[0] : event.videos?.[0]?.link)}</p></Card> : null}</div></div>
  </AdminShell>;
}
function ContentSection({ title, items }: { title: string; items?: string[] }) { return <Card><CardTitle>{title}</CardTitle>{items?.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-stone-500">Chưa có dữ liệu.</p>}</Card>; }
