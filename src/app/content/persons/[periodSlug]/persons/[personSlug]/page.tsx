import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Edit3, Plus } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function PersonDetailPage({ params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  const { periodSlug, personSlug } = await params;
  const person = await personAdminService.getPerson(periodSlug, personSlug).catch(() => null);
  if (!person) notFound();
  const events = (await personAdminService.listPersonEvents(periodSlug, personSlug).catch(() => ({ items: [] }))).items;
  return <AdminShell><div className="mb-3 text-sm text-stone-500"><Link href="/content/persons" className="font-bold text-bronze">Nhân vật</Link> / <Link href={`/content/persons/${periodSlug}`} className="font-bold text-bronze">Nhóm</Link> / {person.name}</div><PageHeader eyebrow="Hồ sơ nhân vật" title={person.name} description={`${person.title} · ${person.birthDate || person.birth_year || '?'} - ${person.deathDate || person.death_year || '?'}`} actions={<><Link href={`/content/persons/${periodSlug}/persons/${personSlug}/edit`}><Button variant="outline"><Edit3 className="h-4 w-4" /> Sửa</Button></Link><EntityActionButton url={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}?action=${person.status === 'published' ? 'unpublish' : 'publish'}`} label={person.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton method="DELETE" url={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}`} variant="danger" label="Xóa mềm" confirmMessage="Xóa mềm nhân vật này? Sự kiện tham gia vẫn được giữ để khôi phục." /></>} />
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]"><Card className="overflow-hidden p-0"><div className="aspect-[4/3] bg-stone-200">{person.horizontalImage || person.coverMediaRef ? <img src={person.horizontalImage || person.coverMediaRef} alt={person.name} className="h-full w-full object-cover" /> : null}</div><div className="p-5"><Badge tone={person.status === 'published' ? 'green' : 'gold'}>{person.status}</Badge><p className="mt-3 text-sm text-stone-600">{person.hometown || 'Chưa có quê quán.'}</p></div></Card><div className="grid gap-5"><Card><CardTitle>Overview</CardTitle><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{person.overview || 'Chưa có overview.'}</p></Card><Card><CardTitle>Thành tựu</CardTitle><List items={person.achievements} empty="Chưa có thành tựu." /></Card><Card><CardTitle>Tóm tắt cuộc đời</CardTitle><List items={person.lifetime} empty="Chưa có tóm tắt." /></Card>{person.video?.link ? <Card><CardTitle>Tư liệu video</CardTitle><a className="mt-3 block break-all text-sm font-bold text-bronze" href={person.video.link} target="_blank" rel="noreferrer">{person.video.link}</a><p className="mt-2 text-sm text-stone-600">{person.video.content}</p></Card> : null}</div></div>
    <section className="mt-6"><div className="mb-4 flex justify-end"><Link href={`/content/persons/${periodSlug}/persons/${personSlug}/events/new`}><Button><Plus className="h-4 w-4" /> Thêm sự kiện tham gia</Button></Link></div>{events.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Sự kiện</TableHeaderCell><TableHeaderCell>Vai trò</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Liên kết gốc</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead><tbody>{events.map((event) => <TableRow key={event.id}><TableCell><Link className="font-black text-charcoal hover:text-bronze" href={`/content/persons/${periodSlug}/persons/${personSlug}/events/${event.id}`}>{event.title}</Link><p className="mt-1 text-xs text-stone-500">{event.id}</p></TableCell><TableCell>{event.role || '—'}</TableCell><TableCell><Badge tone={event.status === 'published' ? 'green' : 'gold'}>{event.status}</Badge></TableCell><TableCell className="max-w-72 truncate text-xs">{event.eventRef}</TableCell><TableCell><div className="flex gap-2"><Link href={`/content/persons/${periodSlug}/persons/${personSlug}/events/${event.id}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton method="DELETE" url={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}/events/${event.id}`} variant="danger" label="Xóa" confirmMessage={`Xóa mềm sự kiện “${event.title}”?`} /></div></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có sự kiện tham gia" description="Liên kết nhân vật với một sự kiện lịch sử gốc để bắt đầu." />}</section>
  </AdminShell>;
}

function List({ items, empty }: { items?: string[]; empty: string }) {
  return items?.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-stone-500">{empty}</p>;
}
