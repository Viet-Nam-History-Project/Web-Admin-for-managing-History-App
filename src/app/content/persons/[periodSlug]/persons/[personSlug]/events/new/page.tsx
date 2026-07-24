import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PersonContentEditor } from '@/components/admin/PersonContentEditor';
import { personAdminService } from '@/services/personAdminService';

export const dynamic = 'force-dynamic';

export default async function NewPersonEventPage({ params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  const { periodSlug, personSlug } = await params;
  const person = await personAdminService.getPerson(periodSlug, personSlug).catch(() => null);
  if (!person) notFound();
  const historicalEvents = await personAdminService.listHistoricalEventOptions().catch(() => []);
  return <AdminShell><PageHeader eyebrow="Nhân vật / Sự kiện tham gia" title="Thêm sự kiện tham gia" description={`Liên kết ${person.name} với một sự kiện lịch sử gốc.`} /><PersonContentEditor kind="event" endpoint={`/api/admin/person-periods/${periodSlug}/persons/${personSlug}/events`} returnTo={`/content/persons/${periodSlug}/persons/${personSlug}`} historicalEvents={historicalEvents} /></AdminShell>;
}
