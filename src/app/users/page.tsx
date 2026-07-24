import Link from 'next/link';
import { Activity, Ban, ChevronLeft, ChevronRight, Search, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { ExportUsersButton } from '@/components/users/ExportUsersButton';
import { userAdminService } from '@/services/userAdminService';
import { formatAdminDateTime } from '@/lib/utils/historicalDate';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';
const ranks = ['Newcomer', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Legend'];
type Params = { search?: string; status?: string; rank?: string; cursor?: string; trail?: string };

function decodeTrail(value?: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value ?? '', 'base64url').toString('utf8'));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(-50) : [];
  } catch { return []; }
}

function pageHref(filters: Params, cursor: string | null, trail: string[]) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.rank && filters.rank !== 'all') params.set('rank', filters.rank);
  if (cursor) params.set('cursor', cursor);
  if (trail.length) params.set('trail', Buffer.from(JSON.stringify(trail)).toString('base64url'));
  return `/users?${params.toString()}`;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin(['super_admin', 'analyst', 'viewer']);
  const filters = await searchParams;
  const result = await userAdminService.list(filters).catch(() => ({
    items: [], pageSize: 25, hasNextPage: false, nextCursor: null,
    stats: { total: 0, active: 0, banned: 0, activeStreaks: 0, totalXp: 0 },
  }));
  const trail = decodeTrail(filters.trail);
  const previousCursor = trail.at(-1) || null;
  const previousTrail = trail.slice(0, -1);
  const nextTrail = [...trail, filters.cursor ?? ''];

  return <AdminShell>
    <PageHeader eyebrow="Người dùng & Game hóa" title="Quản lý người dùng" description="Theo dõi hồ sơ, trạng thái tài khoản và tiến độ học tập." actions={<ExportUsersButton rows={result.items.map((user) => [user.displayName, user.email, user.username, user.accountStatus, user.currentRank, user.totalXP, user.currentStreak, user.totalSessions, user.lastPlayedDate])} />} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard title="Tổng người dùng" value={result.stats.total} icon={Users} /><StatCard title="Đang hoạt động" value={result.stats.active} icon={ShieldCheck} /><StatCard title="Đã khóa" value={result.stats.banned} icon={Ban} /><StatCard title="Có streak" value={result.stats.activeStreaks} icon={Activity} /><StatCard title="Tổng XP" value={result.stats.totalXp.toLocaleString('vi-VN')} icon={Sparkles} /></div>
    <form className="my-5 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <label className="grid min-w-72 flex-1 gap-1"><span className="text-xs font-bold text-stone-500">Tìm kiếm</span><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-stone-500" /><Input name="search" defaultValue={filters.search} className="w-full pl-9" placeholder="Tên, email, tên đăng nhập hoặc mã người dùng" /></div></label>
      <label className="grid gap-1"><span className="text-xs font-bold text-stone-500">Trạng thái</span><select name="status" defaultValue={filters.status ?? 'all'} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm"><option value="all">Tất cả</option><option value="active">Hoạt động</option><option value="banned">Đã khóa</option></select></label>
      <label className="grid gap-1"><span className="text-xs font-bold text-stone-500">Rank</span><select name="rank" defaultValue={filters.rank ?? 'all'} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm"><option value="all">Tất cả</option>{ranks.map((rank) => <option key={rank}>{rank}</option>)}</select></label>
      <Button type="submit">Lọc dữ liệu</Button><Link href="/users"><Button type="button" variant="outline">Đặt lại</Button></Link>
    </form>
    {result.items.length ? <DataTable className="min-w-[1180px]"><TableHead><TableRow><TableHeaderCell>Người dùng</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell><TableHeaderCell>Rank</TableHeaderCell><TableHeaderCell>XP</TableHeaderCell><TableHeaderCell>Streak</TableHeaderCell><TableHeaderCell>Phiên</TableHeaderCell><TableHeaderCell>Chơi gần nhất</TableHeaderCell><TableHeaderCell>Ngày tạo</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{result.items.map((user) => <TableRow key={user.uid}><TableCell><div className="flex items-center gap-3"><div className="h-10 w-10 overflow-hidden rounded-full bg-gold/20">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center font-black text-bronze">{user.displayName.charAt(0).toUpperCase()}</span>}</div><div><Link href={`/users/${user.uid}`} className="font-black text-charcoal hover:text-bronze">{user.displayName}</Link><p className="text-xs text-stone-500">{user.email || user.username || user.uid}</p></div></div></TableCell><TableCell><Badge tone={user.disabled ? 'red' : 'green'}>{user.disabled ? 'Đã khóa' : 'Hoạt động'}</Badge></TableCell><TableCell><Badge tone="gold">{user.currentRank}</Badge></TableCell><TableCell className="font-black text-bronze">{user.totalXP.toLocaleString('vi-VN')}</TableCell><TableCell>{user.currentStreak} ngày</TableCell><TableCell>{user.totalSessions}</TableCell><TableCell>{user.lastPlayedDate || 'Chưa chơi'}</TableCell><TableCell>{formatAdminDateTime(user.createdAt)}</TableCell><TableCell><Link href={`/users/${user.uid}`}><Button variant="outline">Chi tiết</Button></Link></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Không tìm thấy người dùng" description="Thử thay đổi từ khóa hoặc bộ lọc." />}
    {filters.cursor || result.nextCursor ? <div className="mt-5 flex justify-end">
      <div className="flex gap-2">
        {filters.cursor ? <Link href={pageHref(filters, previousCursor, previousTrail)}><Button variant="outline"><ChevronLeft className="h-4 w-4" /> Trang trước</Button></Link> : null}
        {result.nextCursor ? <Link href={pageHref(filters, result.nextCursor, nextTrail)}><Button variant="outline">Trang tiếp <ChevronRight className="h-4 w-4" /></Button></Link> : null}
      </div>
    </div> : null}
  </AdminShell>;
}
