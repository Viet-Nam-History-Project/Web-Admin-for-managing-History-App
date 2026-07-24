import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PersonContentEditor } from '@/components/admin/PersonContentEditor';
import { personPeriodEditorValues } from '@/lib/utils/contentEditor';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function EditPersonPeriodPage({ params }: { params: Promise<{ periodSlug: string }> }) {
  const { periodSlug } = await params;
  const period = await personAdminService.getPeriod(periodSlug).catch(() => null);
  if (!period) notFound();
  return <AdminShell><PageHeader eyebrow="Nội dung / Nhân vật" title={`Sửa: ${period.title}`} description="Slug được khóa để giữ ổn định route app mobile." /><PersonContentEditor kind="period" editing endpoint={`/api/admin/person-periods/${periodSlug}`} returnTo={`/content/persons/${periodSlug}`} initial={personPeriodEditorValues(period)} /></AdminShell>;
}
