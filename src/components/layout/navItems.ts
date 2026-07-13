import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bot,
  BrainCircuit,
  ClipboardList,
  DatabaseZap,
  Gamepad2,
  Image,
  Trash2,
  Trophy,
  LayoutDashboard,
  Library,
  MessageSquareWarning,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const navGroups = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { href: '/content/periods', label: 'Thời kỳ lịch sử', icon: Library },
      { href: '/content/persons', label: 'Nhân vật lịch sử', icon: Users },
      { href: '/media', label: 'Media Library', icon: Image },
      { href: '/content/quality', label: 'Chất lượng nội dung', icon: BadgeCheck },
      { href: '/content/trash', label: 'Thùng rác', icon: Trash2 },
    ],
  },
  {
    label: 'Trò chơi',
    items: [
      { href: '/games/quizzes', label: 'Quiz', icon: Gamepad2 },
      { href: '/games/timeline-puzzle', label: 'Ghép niên đại', icon: Activity },
    ],
  },
  {
    label: 'Cộng đồng',
    items: [
      { href: '/forum/posts', label: 'Forum posts', icon: MessageSquareWarning },
      { href: '/forum/reports', label: 'Reports', icon: MessageSquareWarning },
    ],
  },
  {
    label: 'Người dùng & Game hóa',
    items: [
      { href: '/users', label: 'Người dùng', icon: ShieldCheck },
      { href: '/gamification/badges', label: 'Badges', icon: BadgeCheck },
      { href: '/gamification/ranks', label: 'Ranks', icon: Activity },
      { href: '/gamification/xp-rules', label: 'XP Rules', icon: ClipboardList },
      { href: '/gamification/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'Tri thức & AI',
    items: [
      { href: '/graph/explorer', label: 'Graph Explorer', icon: DatabaseZap },
      { href: '/graph/sync', label: 'Graph Sync', icon: DatabaseZap },
      { href: '/graph/relationships', label: 'Relationships', icon: BrainCircuit },
      { href: '/ai/overview', label: 'AI Overview', icon: Bot },
      { href: '/ai/knowledge-base', label: 'Knowledge Base', icon: BrainCircuit },
      { href: '/ai/prompts', label: 'Prompts', icon: Bot },
      { href: '/ai/evaluations', label: 'Evaluations', icon: BadgeCheck },
      { href: '/ai/suggestions', label: 'Suggestions', icon: BrainCircuit },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/audit-logs', label: 'Audit logs', icon: ClipboardList },
    ],
  },
] as const;
