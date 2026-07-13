import { ModulePage } from '@/components/layout/ModulePage';

export default function GraphSyncPage() {
  return (
    <ModulePage
      eyebrow="Graph DB"
      title="Graph Sync"
      description="Sync all Firestore content hoặc sync selected period/event, xem sync status và lỗi sync."
      phase="Phase 4"
    />
  );
}
