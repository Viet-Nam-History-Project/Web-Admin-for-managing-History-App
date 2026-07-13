import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { stageAdminService } from '@/services/stageAdminService';

export const dynamic = 'force-dynamic';
export default async function NewEventPage({ params }: { params: Promise<{ periodSlug: string; stageSlug: string }> }) {
  const { periodSlug, stageSlug } = await params;
  const stage = await stageAdminService.get(periodSlug, stageSlug).catch(() => null);
  return <AdminShell><PageHeader eyebrow={`Giai đoạn / ${stage?.title ?? stageSlug}`} title="Tạo sự kiện" description="Nội dung lưu đúng schema event mà app mobile đang đọc." /><ContentEditor kind="event" endpoint={`/api/admin/periods/${periodSlug}/stages/${stageSlug}/events`} returnTo={`/content/periods/${periodSlug}/stages/${stageSlug}?tab=events`} /></AdminShell>;
}
