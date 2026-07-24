import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PersonContentEditor } from '@/components/admin/PersonContentEditor';

export default function NewPersonPeriodPage() {
  return <AdminShell><PageHeader eyebrow="Nội dung / Nhân vật" title="Tạo nhóm nhân vật" description="Nhóm nhân vật là cấp điều hướng đầu tiên trong tab Nhân vật của app mobile." /><PersonContentEditor kind="period" endpoint="/api/admin/person-periods" returnTo="/content/persons" /></AdminShell>;
}
