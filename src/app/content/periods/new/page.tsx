import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentEditor } from '@/components/admin/ContentEditor';

export default function NewPeriodPage() {
  return <AdminShell><PageHeader eyebrow="Nội dung / Thời kỳ" title="Tạo thời kỳ mới" description="Có thể lưu bản nháp khi chưa đủ dữ liệu; xuất bản sẽ áp dụng kiểm tra chặt hơn." /><ContentEditor kind="period" endpoint="/api/admin/periods" returnTo="/content/periods" /></AdminShell>;
}
