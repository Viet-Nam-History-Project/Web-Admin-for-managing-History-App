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
import { formatHistoricalRange } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';

export default async function PersonPeriodDetailPage({ params }: { params: Promise<{ periodSlug: string }> }) {
  const { periodSlug } = await params;
  const period = await personAdminService.getPeriod(periodSlug).catch(() => null);
  if (!period) notFound();
  const persons = (await personAdminService.listPersons(periodSlug).catch(() => ({ items: [] }))).items;
  return <AdminShell><div className="mb-3 text-sm text-stone-500"><Link href="/content/persons" className="font-bold text-bronze">Nhân vật</Link> / {period.title}</div><PageHeader eyebrow="Nhóm nhân vật" title={period.title} description={`${formatHistoricalRange(period.startDate, period.endDate)} · ${persons.length} nhân vật`} actions={<><Link href={`/content/persons/${periodSlug}/edit`}><Button variant="outline"><Edit3 className="h-4 w-4" /> Sửa</Button></Link><EntityActionButton url={`/api/admin/person-periods/${periodSlug}?action=${period.status === 'published' ? 'unpublish' : 'publish'}`} label={period.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton method="DELETE" url={`/api/admin/person-periods/${periodSlug}`} variant="danger" label="Xóa mềm" confirmMessage="Xóa mềm nhóm này? Dữ liệu nhân vật và sự kiện con vẫn được giữ." /></>} />
    <div className="mb-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><Card className="overflow-hidden p-0"><div className="aspect-[16/9] bg-stone-200">{period.coverMediaRef ? <img src={period.coverMediaRef} alt={period.title} className="h-full w-full object-cover" /> : null}</div></Card><Card><CardTitle>Thông tin nhóm</CardTitle><Badge className="mt-3" tone={period.status === 'published' ? 'green' : 'gold'}>{period.status}</Badge><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{period.description || 'Chưa có mô tả.'}</p></Card></div>
    <section><div className="mb-4 flex justify-end"><Link href={`/content/persons/${periodSlug}/persons/new`}><Button><Plus className="h-4 w-4" /> Tạo nhân vật</Button></Link></div>{persons.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Nhân vật</TableHeaderCell><TableHeaderCell>Niên đại</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Sự kiện</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead><tbody>{persons.map((person) => <TableRow key={person.id}><TableCell><Link className="font-black text-charcoal hover:text-bronze" href={`/content/persons/${periodSlug}/persons/${person.id}`}>{person.name}</Link><p className="mt-1 text-xs text-stone-500">{person.title} · {person.id}</p></TableCell><TableCell>{person.birthDate || person.birth_year || '?'} - {person.deathDate || person.death_year || '?'}</TableCell><TableCell><Badge tone={person.status === 'published' ? 'green' : 'gold'}>{person.status}</Badge></TableCell><TableCell>{person.eventCount ?? 0}</TableCell><TableCell><div className="flex gap-2"><Link href={`/content/persons/${periodSlug}/persons/${person.id}`}><Button variant="ghost">Mở</Button></Link><Link href={`/content/persons/${periodSlug}/persons/${person.id}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton method="DELETE" url={`/api/admin/person-periods/${periodSlug}/persons/${person.id}`} variant="danger" label="Xóa" confirmMessage={`Xóa mềm nhân vật “${person.name}”? Các sự kiện tham gia vẫn được giữ.`} /></div></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có nhân vật" description="Tạo hồ sơ nhân vật đầu tiên trong nhóm này." />}</section>
  </AdminShell>;
}
