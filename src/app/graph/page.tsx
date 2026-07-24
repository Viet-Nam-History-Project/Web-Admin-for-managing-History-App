import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { GraphWorkspace } from '@/components/ai/GraphWorkspace';

export default function GraphManagementPage() {
  return <AdminShell>
    <PageHeader
      eyebrow="Tri thức & AI"
      title="Graph từ pipeline PDF"
      description="Theo dõi KnowledgeSource, AIChunk, entity, relationship và token được tạo trực tiếp khi Index PDF."
    />
    <GraphWorkspace />
  </AdminShell>;
}
