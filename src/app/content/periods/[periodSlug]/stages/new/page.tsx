import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { periodAdminService } from '@/services/periodAdminService';

export const dynamic = 'force-dynamic';

export default async function NewStagePage({ params }: { params: Promise<{ periodSlug: string }> }) {
  const { periodSlug } = await params;
  const period = await periodAdminService.get(periodSlug).catch(() => null);
  return <AdminShell><PageHeader eyebrow={`Thời kỳ / ${period?.title ?? periodSlug}`} title="Tạo giai đoạn" description="Giai đoạn mới tự động thuộc thời kỳ đang mở." /><ContentEditor kind="stage" endpoint={`/api/admin/periods/${periodSlug}/stages`} returnTo={`/content/periods/${periodSlug}?tab=stages`} /></AdminShell>;
}
