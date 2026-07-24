import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/State';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { getAggregatedLearningAnalytics } from '@/services/analyticsAggregateService';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin(['super_admin', 'analyst', 'viewer']);
  const { from, to } = await searchParams;
  try {
    const data = await getAggregatedLearningAnalytics({ from, to });
    return <AdminShell>
      <PageHeader eyebrow="Phân tích" title="Phân tích học tập" description="Theo dõi mức độ hoạt động, kết quả học tập và tương tác cộng đồng." />
      <AnalyticsDashboard data={data} />
    </AdminShell>;
  } catch (error) {
    return <AdminShell><PageHeader eyebrow="Phân tích" title="Phân tích học tập" description="Tổng hợp hoạt động học tập trong hệ thống." /><ErrorState message={error instanceof Error ? error.message : 'Không tải được dữ liệu phân tích.'} /></AdminShell>;
  }
}
