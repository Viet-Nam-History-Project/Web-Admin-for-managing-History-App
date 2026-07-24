'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, Clock3, Download, Flame, Percent, Sparkles, Trophy, Users,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import type { LearningAnalytics } from '@/services/analyticsService';

const CHART_COLORS = ['#B8860B', '#C8102E', '#6E3C24', '#D6A84F', '#4F6D5D'];

export function AnalyticsDashboard({ data }: { data: LearningAnalytics }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState(data.fromDate);
  const [toDate, setToDate] = useState(data.toDate);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  function applyRange() {
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) {
      window.alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    startTransition(() => router.replace(`${pathname}?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`));
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['BÁO CÁO ANALYTICS', `${data.rangeDays} ngày`, data.generatedAt],
      [],
      ['Ngày', 'Phiên học', 'Người hoạt động', 'XP nhận', 'User mới'],
      ...data.activity.map((item) => [item.date, item.sessions, item.activeUsers, item.xp, item.newUsers]),
      [],
      ['TOP NGƯỜI HỌC'],
      ['Tên', 'Email', 'XP', 'Streak', 'Rank', 'Sessions'],
      ...data.topLearners.map((user) => [user.name, user.email, user.xp, user.streak, user.rank, user.sessions]),
      [],
      ['TOP TRÒ CHƠI'],
      ['Tên', 'Lượt chơi', 'Điểm trung bình', 'Độ chính xác'],
      ...data.topGames.map((game) => [game.name, game.sessions, game.averageScore, game.averageAccuracy]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analytics-${data.fromDate}-${data.toDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className={pending ? 'opacity-70 transition' : 'transition'}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/60 px-4 py-3">
      <div><p className="text-sm font-black text-charcoal">Khoảng thời gian phân tích</p><p className="text-xs text-stone-500">{data.rangeDays} ngày · cập nhật lúc {new Date(data.generatedAt).toLocaleString('vi-VN')}</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-500">Từ ngày</span><input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-bold text-charcoal outline-none focus:border-bronze" /></label>
        <label className="grid gap-1"><span className="text-xs font-bold text-stone-500">Đến ngày</span><input type="date" value={toDate} min={fromDate} max={today} onChange={(event) => setToDate(event.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-bold text-charcoal outline-none focus:border-bronze" /></label>
        <Button type="button" onClick={applyRange} disabled={pending}>Áp dụng</Button>
        <Button type="button" variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Xuất CSV</Button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard title="Người dùng" value={data.summary.totalUsers} icon={Users} hint={`+${data.summary.newUsers} mới`} />
      <StatCard title="Hoạt động" value={data.summary.activeUsers} icon={Activity} hint={`${data.summary.sessions} phiên`} />
      <StatCard title="Độ chính xác" value={`${data.summary.averageAccuracy}%`} icon={Percent} hint={`Điểm TB ${data.summary.averageScore}`} />
      <StatCard title="XP đã nhận" value={data.summary.totalXpEarned.toLocaleString('vi-VN')} icon={Sparkles} hint={`${data.summary.averageTimeMinutes} phút/phiên`} />
      <StatCard title="Retention" value={`${data.summary.retentionRate}%`} icon={Flame} hint="So với kỳ liền trước" />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
      <ChartCard title="Hoạt động học tập theo ngày" description="Số phiên và người dùng hoạt động duy nhất.">
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.activity} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#B8860B" stopOpacity={0.34}/><stop offset="95%" stopColor="#B8860B" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(110,60,36,.12)" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Area type="monotone" dataKey="sessions" name="Phiên học" stroke="#B8860B" strokeWidth={3} fill="url(#sessionsFill)" /><Area type="monotone" dataKey="activeUsers" name="Người hoạt động" stroke="#C8102E" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Loại hoạt động" description="Tỷ trọng trò chơi trong khoảng đã chọn."><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.gameDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{data.gameDistribution.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend /></PieChart></ResponsiveContainer></ChartCard>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-3">
      <ChartCard title="Phân bố điểm" description="Số phiên theo khoảng điểm."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.scoreDistribution}><CartesianGrid strokeDasharray="3 3" stroke="rgba(110,60,36,.12)" /><XAxis dataKey="range" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="sessions" name="Phiên" fill="#C8102E" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Streak hiện tại" description="Phân nhóm người dùng theo chuỗi học."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.streakDistribution}><CartesianGrid strokeDasharray="3 3" stroke="rgba(110,60,36,.12)" /><XAxis dataKey="range" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="users" name="Người dùng" fill="#6E3C24" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Trạng thái nội dung" description="Phân bố nội dung theo trạng thái hiện tại."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.contentStatus}><CartesianGrid strokeDasharray="3 3" stroke="rgba(110,60,36,.12)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="published" name="Đã xuất bản" stackId="status" fill="#4F6D5D" /><Bar dataKey="draft" name="Bản nháp" stackId="status" fill="#D6A84F" /><Bar dataKey="deleted" name="Đã xóa" stackId="status" fill="#C8102E" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Card><div className="flex items-center justify-between"><div><CardTitle>Người học nổi bật</CardTitle><p className="mt-1 text-sm text-stone-500">Xếp theo tổng XP tích lũy.</p></div><Trophy className="h-6 w-6 text-bronze" /></div><div className="mt-4"><DataTable className="min-w-[620px]"><TableHead><TableRow><TableHeaderCell>Người học</TableHeaderCell><TableHeaderCell>Rank</TableHeaderCell><TableHeaderCell>XP</TableHeaderCell><TableHeaderCell>Streak</TableHeaderCell><TableHeaderCell>Phiên</TableHeaderCell></TableRow></TableHead><tbody>{data.topLearners.map((user) => <TableRow key={user.uid}><TableCell><p className="font-bold text-charcoal">{user.name}</p><p className="text-xs text-stone-500">{user.email}</p></TableCell><TableCell>{user.rank}</TableCell><TableCell className="font-black text-bronze">{user.xp.toLocaleString('vi-VN')}</TableCell><TableCell>{user.streak}</TableCell><TableCell>{user.sessions}</TableCell></TableRow>)}</tbody></DataTable></div></Card>
      <Card><div className="flex items-center justify-between"><div><CardTitle>Nội dung được chơi nhiều</CardTitle><p className="mt-1 text-sm text-stone-500">Tổng hợp từ lịch sử phiên học.</p></div><Clock3 className="h-6 w-6 text-bronze" /></div><div className="mt-4"><DataTable className="min-w-[620px]"><TableHead><TableRow><TableHeaderCell>Trò chơi / Quiz</TableHeaderCell><TableHeaderCell>Lượt chơi</TableHeaderCell><TableHeaderCell>Điểm TB</TableHeaderCell><TableHeaderCell>Chính xác</TableHeaderCell></TableRow></TableHead><tbody>{data.topGames.map((game) => <TableRow key={game.name}><TableCell className="font-bold text-charcoal">{game.name}</TableCell><TableCell>{game.sessions}</TableCell><TableCell>{game.averageScore}</TableCell><TableCell>{game.averageAccuracy}%</TableCell></TableRow>)}</tbody></DataTable></div></Card>
    </div>

    <Card className="mt-5"><CardTitle>Kho dữ liệu đang theo dõi</CardTitle><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8"><Inventory label="Thời kỳ" value={data.inventory.periods} /><Inventory label="Giai đoạn" value={data.inventory.stages} /><Inventory label="Sự kiện" value={data.inventory.events} /><Inventory label="Nhân vật" value={data.inventory.persons} /><Inventory label="Quiz" value={data.inventory.quizzes} /><Inventory label="Câu hỏi" value={data.inventory.questions} /><Inventory label="Bài forum" value={data.inventory.forumPosts} /><Inventory label="Phản hồi" value={data.inventory.forumReplies} /></div><p className="mt-4 text-xs text-stone-500">Tương tác cộng đồng trong kỳ: {data.summary.forumEngagements.toLocaleString('vi-VN')} lượt thích và phản hồi.</p></Card>
  </div>;
}

const tooltipStyle = { borderRadius: 10, border: '1px solid rgba(110,60,36,.18)', background: '#FFF9EC', boxShadow: '0 8px 24px rgba(47,42,36,.12)' };

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardTitle>{title}</CardTitle><p className="mt-1 text-sm text-stone-500">{description}</p><div className="mt-4 h-72 min-w-0">{children}</div></Card>;
}

function Inventory({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-[var(--border)] bg-white/55 p-3 text-center"><p className="text-2xl font-black text-charcoal">{value}</p><p className="mt-1 text-xs font-bold text-stone-500">{label}</p></div>;
}
