import {
  Archive,
  Bot,
  FileWarning,
  Gamepad2,
  GitBranch,
  Landmark,
  MessageSquare,
  ScrollText,
  Users,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { getDashboardStats } from '@/services/analyticsService';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let stats = null;
  let envError = '';
  try {
    stats = await getDashboardStats();
  } catch (error) {
    envError = error instanceof Error ? error.message : 'Không thể tải dashboard.';
  }

  const fallback = {
    users: 0,
    usersNew7d: 0,
    activeUsers7d: 0,
    periods: 0,
    stages: 0,
    events: 0,
    persons: 0,
    quizzes: 0,
    quizSessions: 0,
    forumPosts: 0,
    forumComments: 0,
    draftContent: 0,
    missingImage: 0,
    missingVideo: 0,
    unsyncedGraph: 0,
    aiUnansweredQuestions: 0,
    questions: 0,
    deletedContent: 0,
  };
  const data = stats ?? fallback;

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Dashboard"
        title="Trung tâm điều hành"
        description="Theo dõi dữ liệu học tập, nội dung, diễn đàn, graph sync và AI readiness cho app Lịch Sử Việt Nam."
      />

      {envError ? (
        <Card className="mb-5 border-flag/20 bg-flag/5">
          <Badge tone="red">Cần cấu hình env</Badge>
          <p className="mt-2 text-sm font-semibold text-flag">{envError}</p>
          <p className="mt-1 text-sm text-stone-600">
            Dashboard đang hiển thị số 0 để bạn vẫn xem được giao diện.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng users" value={data.users} icon={Users} hint={`${data.usersNew7d} users mới 7 ngày`} />
        <StatCard title="Thời kỳ" value={data.periods} icon={Archive} />
        <StatCard title="Giai đoạn" value={data.stages} icon={ScrollText} />
        <StatCard title="Sự kiện" value={data.events} icon={Landmark} />
        <StatCard title="Nhân vật" value={data.persons} icon={Users} />
        <StatCard title="Quiz" value={data.quizzes} icon={Gamepad2} hint={`${data.quizSessions} lượt chơi`} />
        <StatCard title="Câu hỏi" value={data.questions} icon={Gamepad2} />
        <StatCard title="Forum posts" value={data.forumPosts} icon={MessageSquare} hint={`${data.forumComments} comments`} />
        <StatCard title="Chưa sync graph" value={data.unsyncedGraph} icon={GitBranch} />
        <StatCard title="Draft content" value={data.draftContent} icon={FileWarning} />
        <StatCard title="Trong thùng rác" value={data.deletedContent} icon={FileWarning} />
        <StatCard title="Thiếu ảnh" value={data.missingImage} icon={FileWarning} />
        <StatCard title="Thiếu video" value={data.missingVideo} icon={FileWarning} />
        <StatCard title="AI unanswered" value={data.aiUnansweredQuestions} icon={Bot} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle>User growth 7 ngày</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Health label="Người dùng" value={data.users} /><Health label="Phiên học/chơi" value={data.quizSessions} /><Health label="Forum posts" value={data.forumPosts} /><Health label="Nội dung lịch sử" value={data.periods + data.stages + data.events} /></div>
        </Card>
        <Card>
          <CardTitle>Content completeness</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Health label="Thiếu ảnh" value={data.missingImage} warning /><Health label="Thiếu video" value={data.missingVideo} warning /><Health label="Bản nháp" value={data.draftContent} /><Health label="Chưa sync graph" value={data.unsyncedGraph} warning /></div>
        </Card>
      </div>
    </AdminShell>
  );
}

function Health({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-xl border p-4 ${warning && value > 0 ? 'border-flag/20 bg-flag/5' : 'border-[var(--border)] bg-white/55'}`}><p className="text-xs font-black uppercase text-stone-500">{label}</p><p className={`mt-2 text-2xl font-black ${warning && value > 0 ? 'text-flag' : 'text-charcoal'}`}>{value}</p></div>;
}
