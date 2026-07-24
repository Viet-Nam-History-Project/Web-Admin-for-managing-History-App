import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { AiOverviewDashboard } from '@/components/ai/AiOverviewDashboard';
import { AiSuggestionsDashboard } from '@/components/ai/AiSuggestionsDashboard';
import { getAiBackendHealth } from '@/lib/ai/backend';
import { knowledgeAdminService } from '@/services/knowledgeAdminService';

export const dynamic = 'force-dynamic';

export default async function AiOverviewPage() {
  const sources = await knowledgeAdminService.list().catch(() => []);
  let health = null;
  let healthError = '';
  try { health = await getAiBackendHealth(); }
  catch (error) { healthError = error instanceof Error ? error.message : 'Trợ lý AI chưa sẵn sàng.'; }
  return (
    <AdminShell>
      <PageHeader eyebrow="Tri thức & AI" title="Vận hành AI" description="Theo dõi kết nối, kho dữ liệu, chất lượng truy xuất và các việc cải tiến được rút ra từ câu hỏi thực tế." />
      <AiOverviewDashboard health={health} healthError={healthError} sources={sources} />
      <section id="suggestions" className="mt-8 scroll-mt-24">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-bronze">Chẩn đoán chất lượng</p>
          <h2 className="mt-1 text-2xl font-black text-charcoal">Gợi ý cải tiến</h2>
          <p className="mt-1 text-sm text-stone-600">Biến query log và kết quả retrieval thành việc cần làm cho kho tri thức, prompt và bộ kiểm thử.</p>
        </div>
        <AiSuggestionsDashboard />
      </section>
    </AdminShell>
  );
}
