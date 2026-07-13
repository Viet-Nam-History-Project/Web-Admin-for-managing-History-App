import {
  BadgeCheck,
  BarChart3,
  Bot,
  BrainCircuit,
  ClipboardList,
  DatabaseZap,
  Gamepad2,
  Image,
  Trash2,
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
      { href: '/content/periods', label: 'Quản lý nội dung', icon: Library },
      { href: '/content/persons', label: 'Nhân vật lịch sử', icon: Users },
      { href: '/media', label: 'Media Library', icon: Image },
      { href: '/content/quality', label: 'Chất lượng nội dung', icon: BadgeCheck },
      { href: '/content/trash', label: 'Thùng rác', icon: Trash2 },
    ],
  },
  {
    label: 'Trò chơi',
    items: [
      {
        href: '/games',
        label: 'Quản lý trò chơi',
        icon: Gamepad2,
        activePrefixes: ['/games', '/gamification'],
      },
    ],
  },
  {
    label: 'Cộng đồng',
    items: [
      { href: '/forum/reports', label: 'Báo cáo vi phạm', icon: MessageSquareWarning },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { href: '/users', label: 'Người dùng', icon: ShieldCheck },
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
