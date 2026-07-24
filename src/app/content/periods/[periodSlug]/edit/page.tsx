import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { periodAdminService } from '@/services/periodAdminService';
import { periodEditorValues } from '@/lib/utils/contentEditor';

export const dynamic = 'force-dynamic';

export default async function EditPeriodPage({ params }: { params: Promise<{ periodSlug: string }> }) {
  const { periodSlug } = await params;
  const period = await periodAdminService.get(periodSlug).catch(() => null);
  if (!period) notFound();
  return <AdminShell><PageHeader eyebrow="Nội dung / Thời kỳ" title={`Sửa: ${period.title}`} description="Đường dẫn định danh được giữ nguyên để bảo đảm các liên kết vẫn hoạt động." /><ContentEditor kind="period" editing endpoint={`/api/admin/periods/${periodSlug}`} returnTo={`/content/periods/${periodSlug}`} initial={periodEditorValues(period)} /></AdminShell>;
}
