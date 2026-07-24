import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { stageAdminService } from '@/services/stageAdminService';
import { stageEditorValues } from '@/lib/utils/contentEditor';

export const dynamic = 'force-dynamic';

export default async function EditStagePage({ params }: { params: Promise<{ periodSlug: string; stageSlug: string }> }) {
  const { periodSlug, stageSlug } = await params;
  const stage = await stageAdminService.get(periodSlug, stageSlug).catch(() => null);
  if (!stage) notFound();
  return <AdminShell><PageHeader eyebrow="Thời kỳ / Giai đoạn" title={`Sửa: ${stage.title}`} description="Cập nhật thông tin và nội dung của giai đoạn." /><ContentEditor kind="stage" editing endpoint={`/api/admin/periods/${periodSlug}/stages/${stageSlug}`} returnTo={`/content/periods/${periodSlug}/stages/${stageSlug}`} initial={stageEditorValues(stage)} /></AdminShell>;
}
