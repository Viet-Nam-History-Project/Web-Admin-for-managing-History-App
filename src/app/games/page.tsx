import Link from 'next/link';
import { Award, ClipboardList, Gamepad2, Medal, Puzzle, Trophy } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';

const gameModules = [
  {
    href: '/games/quizzes',
    title: 'Quiz lịch sử',
    description: 'Quản lý bộ câu hỏi, đáp án, độ khó và trạng thái xuất bản.',
    icon: Gamepad2,
  },
  {
    href: '/games/timeline-puzzle',
    title: 'Ghép niên đại',
    description: 'Quản lý các mốc lịch sử và dữ liệu thử thách sắp xếp thời gian.',
    icon: Puzzle,
  },
  {
    href: '/gamification/badges',
    title: 'Huy hiệu',
    description: 'Thiết lập thành tựu, điều kiện mở khóa và phần thưởng cho người học.',
    icon: Award,
  },
  {
    href: '/gamification/ranks',
    title: 'Cấp bậc',
    description: 'Cấu hình hệ thống rank và ngưỡng XP cho từng cấp độ.',
    icon: Medal,
  },
  {
    href: '/gamification/xp-rules',
    title: 'Quy tắc XP',
    description: 'Điều chỉnh số XP nhận được từ từng loại hoạt động trong ứng dụng.',
    icon: ClipboardList,
  },
  {
    href: '/gamification/leaderboard',
    title: 'Bảng xếp hạng',
    description: 'Theo dõi thành tích và thứ hạng người chơi theo tổng XP.',
    icon: Trophy,
  },
] as const;

export default function GamesManagementPage() {
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Trò chơi"
        title="Quản lý trò chơi"
        description="Một trung tâm chung cho nội dung trò chơi và toàn bộ cơ chế game hóa của ứng dụng."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {gameModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.href}
              href={module.href}
              className="group min-h-48 rounded-2xl border border-[var(--border)] bg-white/78 p-5 shadow-museum transition hover:-translate-y-0.5 hover:border-gold/50 hover:bg-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/18 text-bronze transition group-hover:bg-charcoal group-hover:text-gold">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-black text-charcoal">{module.title}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{module.description}</p>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
