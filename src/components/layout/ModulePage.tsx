import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function ModulePage({
  eyebrow,
  title,
  description,
  phase = 'TODO',
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase?: string;
  children?: React.ReactNode;
}) {
  return (
    <AdminShell>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<Button variant="outline">Export CSV</Button>}
      />
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge tone={phase === 'Phase 1' ? 'green' : 'gold'}>{phase}</Badge>
            <h3 className="mt-3 text-xl font-black text-charcoal">Khung quản trị đã sẵn sàng</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Route, layout, permission, service layer và vị trí mở rộng đã được chuẩn bị.
              Phần bảng dữ liệu/form chi tiết sẽ được nối dần theo service tương ứng.
            </p>
          </div>
          <Button>Thêm mới</Button>
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
      </Card>
    </AdminShell>
  );
}
