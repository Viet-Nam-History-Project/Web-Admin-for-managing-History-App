import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PersonContentEditor } from '@/components/admin/PersonContentEditor';
import { personEditorValues } from '@/lib/utils/contentEditor';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function EditPersonPage({ params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  const { periodSlug, personSlug } = await params;
  const person = await personAdminService.getPerson(periodSlug, personSlug).catch(() => null);
  if (!person) notFound();
  return <AdminShell><PageHeader eyebrow="Nhân vật / Hồ sơ" title={`Sửa: ${person.name}`} description="Slug được khóa để không làm gãy route mobile." /><PersonContentEditor kind="person" editing endpoint={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}`} returnTo={`/content/persons/${periodSlug}/persons/${personSlug}`} initial={personEditorValues(person)} /></AdminShell>;
}
