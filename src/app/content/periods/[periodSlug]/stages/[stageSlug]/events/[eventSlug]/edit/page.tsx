import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { eventAdminService } from '@/services/eventAdminService';
import { eventEditorValues } from '@/lib/utils/contentEditor';

export const dynamic = 'force-dynamic';
export default async function EditEventPage({ params }: { params: Promise<{ periodSlug: string; stageSlug: string; eventSlug: string }> }) {
  const { periodSlug, stageSlug, eventSlug } = await params;
  const event = await eventAdminService.get(periodSlug, stageSlug, eventSlug).catch(() => null);
  if (!event) notFound();
  return <AdminShell><PageHeader eyebrow="Giai đoạn / Sự kiện" title={`Sửa: ${event.title}`} description="Cập nhật nguyên nhân, diễn biến, kết quả và ý nghĩa của sự kiện." /><ContentEditor kind="event" editing endpoint={`/api/admin/periods/${periodSlug}/stages/${stageSlug}/events/${eventSlug}`} returnTo={`/content/periods/${periodSlug}/stages/${stageSlug}/events/${eventSlug}`} initial={eventEditorValues(event)} /></AdminShell>;
}
