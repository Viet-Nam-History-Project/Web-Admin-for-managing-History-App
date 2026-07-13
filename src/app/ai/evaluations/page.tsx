import { ModulePage } from '@/components/layout/ModulePage';

export default function EvaluationsPage() {
  return (
    <ModulePage
      eyebrow="AI Center"
      title="AI Evaluations"
      description="Admin nhập câu hỏi test, AI trả lời theo Firestore + graph context và lưu đánh giá good/bad/needs review."
      phase="Phase 5"
    />
  );
}
