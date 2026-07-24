import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PersonContentEditor } from '@/components/admin/PersonContentEditor';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function NewPersonPage({ params }: { params: Promise<{ periodSlug: string }> }) {
  const { periodSlug } = await params;
  const period = await personAdminService.getPeriod(periodSlug).catch(() => null);
  if (!period) notFound();
  return <AdminShell><PageHeader eyebrow="Nhân vật / Hồ sơ" title="Tạo nhân vật" description={`Thêm nhân vật vào nhóm “${period.title}”.`} /><PersonContentEditor kind="person" endpoint={`/api/admin/person-periods/${periodSlug}/persons`} returnTo={`/content/persons/${periodSlug}`} /></AdminShell>;
}
