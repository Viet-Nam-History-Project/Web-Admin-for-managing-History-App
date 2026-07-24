import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { KnowledgeBaseDashboard } from '@/components/ai/KnowledgeBaseDashboard';
import { getMaxPdfSizeMb } from '@/lib/ai/backend';
import { knowledgeAdminService } from '@/services/knowledgeAdminService';
import { periodAdminService } from '@/services/periodAdminService';

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasePage() {
  const [sources, periodResult] = await Promise.all([
    knowledgeAdminService.list().catch(() => []),
    periodAdminService.list().catch(() => ({ items: [] })),
  ]);
  return (
    <AdminShell>
      <PageHeader eyebrow="Tri thức & AI" title="Kho tri thức PDF" description="Quản lý tài liệu nguồn, trạng thái xử lý và dữ liệu phục vụ trợ lý lịch sử." />
      <KnowledgeBaseDashboard
        initialSources={sources}
        periods={periodResult.items.map((period) => ({ id: period.id, title: period.title }))}
        maxPdfSizeMb={getMaxPdfSizeMb()}
      />
    </AdminShell>
  );
}
