import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Edit3 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function PersonEventDetailPage({ params }: { params: Promise<{ periodSlug: string; personSlug: string; eventSlug: string }> }) {
  const { periodSlug, personSlug, eventSlug } = await params;
  const event = await personAdminService.getPersonEvent(periodSlug, personSlug, eventSlug).catch(() => null);
  if (!event) notFound();
  return <AdminShell><div className="mb-3 text-sm text-stone-500"><Link href={`/content/persons/${periodSlug}/persons/${personSlug}`} className="font-bold text-bronze">Nhân vật</Link> / {event.title}</div><PageHeader eyebrow="Sự kiện tham gia" title={event.title} description={event.role || 'Vai trò của nhân vật trong sự kiện'} actions={<><Link href={`/content/persons/${periodSlug}/persons/${personSlug}/events/${eventSlug}/edit`}><Button variant="outline"><Edit3 className="h-4 w-4" /> Sửa</Button></Link><EntityActionButton url={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}/events/${eventSlug}?action=${event.status === 'published' ? 'unpublish' : 'publish'}`} label={event.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton method="DELETE" url={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}/events/${eventSlug}`} variant="danger" label="Xóa mềm" confirmMessage="Chuyển sự kiện này vào thùng rác?" /></>} />
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><Card className="overflow-hidden p-0"><div className="aspect-[16/10] bg-stone-200">{event.coverMediaRef ? <img src={event.coverMediaRef} alt={event.title} className="h-full w-full object-cover" /> : null}</div><div className="p-5"><Badge tone={event.status === 'published' ? 'green' : 'gold'}>{event.status}</Badge><p className="mt-3 text-sm text-stone-600">Sự kiện gốc: <span className="break-all font-mono text-xs">{event.eventRef}</span></p></div></Card><div className="grid gap-4"><Info title="Overview" value={event.overview} /><Info title="Vai trò" value={event.role} /><Info title="Mô tả chi tiết" value={event.description} /></div></div>
  </AdminShell>;
}

function Info({ title, value }: { title: string; value?: string }) { return <Card><CardTitle>{title}</CardTitle><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{value || 'Chưa có thông tin.'}</p></Card>; }
