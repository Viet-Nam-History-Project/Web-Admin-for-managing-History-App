import { ModulePage } from '@/components/layout/ModulePage';

export default function PersonsPage() {
  return (
    <ModulePage
      eyebrow="Content"
      title="Quản lý nhân vật"
      description="CRUD nhân vật lịch sử, liên kết với period/stage/event, preview person detail và sync person sang graph."
    />
  );
}
