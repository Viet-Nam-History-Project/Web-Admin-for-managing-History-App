import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { KnowledgeSourceInspector } from '@/components/ai/KnowledgeSourceInspector';

export default async function KnowledgeSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  return <AdminShell>
    <Link href="/ai/knowledge-base" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-charcoal hover:text-bronze"><ArrowLeft className="h-4 w-4" /> Danh sách PDF</Link>
    <PageHeader eyebrow="Tri thức & AI" title="Kiểm tra nguồn tri thức" description="Theo dõi từng trang, chunk và nội dung thực sự đã được index vào Neo4j." />
    <KnowledgeSourceInspector sourceId={sourceId} />
  </AdminShell>;
}
