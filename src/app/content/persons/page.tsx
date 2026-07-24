import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { EntityActionButton } from '@/components/admin/EntityActionButton';
import { personAdminService, AdminPersonPeriod } from '@/services/personAdminService';
import { formatHistoricalRange } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';

export default async function PersonsPage() {
  let periods: AdminPersonPeriod[] = [];
  let error = '';
  try { periods = (await personAdminService.listPeriods()).items; }
  catch (err) { error = err instanceof Error ? err.message : 'Không tải được nhóm nhân vật.'; }
  return <AdminShell><PageHeader eyebrow="Nội dung" title="Quản lý nhân vật lịch sử" description="Quản lý nhóm nhân vật, hồ sơ nhân vật và các sự kiện tham gia theo cấu trúc Firestore của app mobile." actions={<><Link href="/content/trash"><Button variant="outline"><Trash2 className="h-4 w-4" /> Thùng rác</Button></Link><Link href="/content/persons/new"><Button><Plus className="h-4 w-4" /> Tạo nhóm nhân vật</Button></Link></>} />
   {error ? <EmptyState title="Không tải được Firestore" description={error} /> : periods.length ? <DataTable className="min-w-[1100px]"><TableHead><TableRow><TableHeaderCell>Ảnh</TableHeaderCell><TableHeaderCell>Nhóm nhân vật</TableHeaderCell><TableHeaderCell>Niên đại</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Nhân vật</TableHeaderCell><TableHeaderCell>Sự kiện</TableHeaderCell><TableHeaderCell>Thao tác</TableHeaderCell></TableRow></TableHead><tbody>{periods.map((period) => <TableRow key={period.id}><TableCell><div className="h-12 w-20 overflow-hidden rounded-md bg-stone-200">{period.coverMediaRef ? <img className="h-full w-full object-cover" src={period.coverMediaRef} alt="" /> : null}</div></TableCell><TableCell><Link className="font-black text-charcoal hover:text-bronze" href={`/content/persons/${period.id}`}>{period.title}</Link><p className="mt-1 text-xs text-stone-500">{period.id}</p></TableCell><TableCell>{formatHistoricalRange(period.startDate, period.endDate)}</TableCell><TableCell><Badge tone={period.status === 'published' ? 'green' : 'gold'}>{period.status ?? 'draft'}</Badge></TableCell><TableCell>{period.personCount ?? 0}</TableCell><TableCell>{period.eventCount ?? 0}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Link href={`/content/persons/${period.id}`}><Button variant="ghost">Mở</Button></Link><Link href={`/content/persons/${period.id}/edit`}><Button variant="outline">Sửa</Button></Link><EntityActionButton url={`/api/admin/person-periods/${period.id}?action=${period.status === 'published' ? 'unpublish' : 'publish'}`} label={period.status === 'published' ? 'Gỡ xuất bản' : 'Xuất bản'} /><EntityActionButton method="DELETE" url={`/api/admin/person-periods/${period.id}`} variant="danger" label="Xóa" confirmMessage={`Xóa mềm nhóm “${period.title}”? Nhân vật và sự kiện con vẫn được giữ để khôi phục.`} /></div></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Chưa có nhóm nhân vật" description="Tạo nhóm đầu tiên để bắt đầu nhập hồ sơ nhân vật lịch sử." />}
  </AdminShell>;
}
