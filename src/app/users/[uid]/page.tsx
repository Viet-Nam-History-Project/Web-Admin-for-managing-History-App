import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, CalendarDays, Flame, Gamepad2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { UserAdminActions } from '@/components/users/UserAdminActions';
import { userAdminService } from '@/services/userAdminService';
import { formatAdminDateTime } from '@/lib/utils/historicalDate';

export const dynamic = 'force-dynamic';
export default async function UserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const user = await userAdminService.get(uid).catch(() => null);
  if (!user) notFound();
  return <AdminShell><div className="mb-3"><Link href="/users"><Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Người dùng</Button></Link></div><PageHeader eyebrow="Hồ sơ người dùng" title={user.displayName} description={user.email || user.username || uid} actions={<Badge tone={user.disabled ? 'red' : 'green'}>{user.disabled ? 'Tài khoản đã khóa' : 'Tài khoản hoạt động'}</Badge>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard title="Tổng XP" value={user.totalXP.toLocaleString('vi-VN')} icon={Sparkles} /><StatCard title="Rank" value={user.currentRank} icon={Trophy} /><StatCard title="Streak" value={`${user.currentStreak} ngày`} icon={Flame} hint={`Dài nhất ${user.longestStreak}`} /><StatCard title="Phiên chơi" value={user.totalSessions} icon={Gamepad2} /><StatCard title="Điểm cao nhất" value={user.highestScore} icon={Award} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><Card><div className="flex items-center gap-4"><div className="h-20 w-20 overflow-hidden rounded-full bg-gold/20">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl font-black text-bronze">{user.displayName.charAt(0).toUpperCase()}</span>}</div><div><CardTitle>{user.displayName}</CardTitle><p className="text-sm text-stone-500">@{user.username || 'chưa có username'}</p></div></div><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="UID" value={uid} /><Info label="Email xác minh" value={user.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'} /><Info label="Ngày tạo" value={formatAdminDateTime(user.createdAt)} /><Info label="Đăng nhập cuối" value={user.lastSignInAt ? formatAdminDateTime(user.lastSignInAt) : 'N/A'} /><Info label="Chơi gần nhất" value={user.lastPlayedDate || 'Chưa chơi'} /><Info label="Trạng thái" value={user.accountStatus} /></dl>{user.bio ? <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm leading-6 text-stone-600">{user.bio}</p> : null}{user.banReason ? <p className="mt-4 rounded-lg bg-flag/10 p-3 text-sm font-semibold text-flag">Lý do khóa: {user.banReason}</p> : null}</Card><Card><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-bronze" /><CardTitle>Huy hiệu ({user.badges.length})</CardTitle></div>{user.badges.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{user.badges.map((badge) => <div key={badge.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="font-bold text-[var(--foreground)]">{badge.name}</p><p className="mt-1 text-xs text-stone-500">{badge.description}</p><p className="mt-2 text-xs font-semibold text-bronze">{formatAdminDateTime(badge.earnedAt)}</p></div>)}</div> : <EmptyState className="mt-4 min-h-40" title="Chưa có huy hiệu" description="Huy hiệu sẽ xuất hiện khi người dùng đạt thành tích." />}</Card></div>
    <div className="mt-5"><UserAdminActions uid={uid} name={user.displayName} disabled={user.disabled} /></div>
    <Card className="mt-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-bronze" /><CardTitle>Lịch sử chơi gần đây</CardTitle></div>{user.sessions.length ? <div className="mt-4"><DataTable><TableHead><TableRow><TableHeaderCell>Thời gian</TableHeaderCell><TableHeaderCell>Nội dung</TableHeaderCell><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Điểm</TableHeaderCell><TableHeaderCell>Chính xác</TableHeaderCell><TableHeaderCell>XP</TableHeaderCell><TableHeaderCell>Thời gian</TableHeaderCell></TableRow></TableHead><tbody>{user.sessions.map((session) => <TableRow key={session.id}><TableCell>{formatAdminDateTime(session.playedAt)}</TableCell><TableCell className="font-bold">{session.title}</TableCell><TableCell>{session.type}</TableCell><TableCell>{session.score}</TableCell><TableCell>{session.accuracy}%</TableCell><TableCell className="text-bronze">+{session.xp}</TableCell><TableCell>{session.timeTaken}s</TableCell></TableRow>)}</tbody></DataTable></div> : <EmptyState className="mt-4" title="Chưa có lịch sử chơi" description="Người dùng chưa hoàn thành phiên quiz/game nào." />}</Card>
  </AdminShell>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-xs font-black uppercase text-stone-500">{label}</dt><dd className="mt-1 truncate text-sm font-bold text-charcoal" title={value}>{value}</dd></div>; }
