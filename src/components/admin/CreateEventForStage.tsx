'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CreateEventForStage({ periodSlug, stages }: { periodSlug: string; stages: { id: string; title: string }[] }) {
  const router = useRouter();
  const [stageSlug, setStageSlug] = useState(stages[0]?.id ?? '');

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1">
        <span className="text-xs font-bold text-stone-500">Giai đoạn cha</span>
        <select value={stageSlug} onChange={(event) => setStageSlug(event.target.value)} className="h-10 min-w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)] outline-none focus:border-bronze">
          {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
        </select>
      </label>
      <Button type="button" disabled={!stageSlug} onClick={() => router.push(`/content/periods/${periodSlug}/stages/${stageSlug}/events/new`)}>
        <Plus className="h-4 w-4" /> Tạo sự kiện
      </Button>
    </div>
  );
}
