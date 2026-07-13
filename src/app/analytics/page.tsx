import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/State';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { getLearningAnalytics } from '@/services/analyticsService';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  try {
    const data = await getLearningAnalytics({ from, to });
    return <AdminShell>
      <PageHeader eyebrow="Analytics" title="Phân tích học tập" description="Theo dõi người học, phiên chơi, điểm số, XP, retention, streak, nội dung và tương tác cộng đồng từ Firestore." />
      <AnalyticsDashboard data={data} />
    </AdminShell>;
  } catch (error) {
    return <AdminShell><PageHeader eyebrow="Analytics" title="Phân tích học tập" description="Dữ liệu thống kê từ Firestore." /><ErrorState message={error instanceof Error ? error.message : 'Không tải được Analytics.'} /></AdminShell>;
  }
}
