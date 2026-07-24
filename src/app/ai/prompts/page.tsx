import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PromptWorkspace } from '@/components/ai/PromptWorkspace';

export default function PromptsPage() {
  return <AdminShell>
    <PageHeader eyebrow="Tri thức & AI" title="Prompt & Kiểm thử" description="Quản lý đầy đủ năm lớp chỉ dẫn đang được RAG sử dụng, lưu phiên bản, kích hoạt và kiểm tra trước khi áp dụng cho app." />
    <PromptWorkspace />
  </AdminShell>;
}
