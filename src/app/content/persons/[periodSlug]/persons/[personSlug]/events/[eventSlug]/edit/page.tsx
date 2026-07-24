import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PersonContentEditor } from '@/components/admin/PersonContentEditor';
import { personEventEditorValues } from '@/lib/utils/contentEditor';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function EditPersonEventPage({ params }: { params: Promise<{ periodSlug: string; personSlug: string; eventSlug: string }> }) {
  const { periodSlug, personSlug, eventSlug } = await params;
  const event = await personAdminService.getPersonEvent(periodSlug, personSlug, eventSlug).catch(() => null);
  if (!event) notFound();
  const historicalEvents = await personAdminService.listHistoricalEventOptions().catch(() => []);
  return <AdminShell><PageHeader eyebrow="Nhân vật / Sự kiện tham gia" title={`Sửa: ${event.title}`} description="Slug được khóa để giữ ổn định đường dẫn app mobile." /><PersonContentEditor kind="event" editing endpoint={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}/events/${eventSlug}`} returnTo={`/content/persons/${periodSlug}/persons/${personSlug}/events/${eventSlug}`} initial={personEventEditorValues(event)} historicalEvents={historicalEvents} /></AdminShell>;
}
