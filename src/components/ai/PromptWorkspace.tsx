'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FlaskConical, GitBranch } from 'lucide-react';
import { EvaluationWorkbench } from '@/components/ai/EvaluationWorkbench';
import { PromptManager } from '@/components/ai/PromptManager';

type PromptView = 'versions' | 'evaluation';

export function PromptWorkspace() {
  const [view, setView] = useState<PromptView>('versions');

  useEffect(() => {
    const syncHash = () => setView(window.location.hash === '#evaluation' ? 'evaluation' : 'versions');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  function select(next: PromptView) {
    setView(next);
    window.history.replaceState(null, '', next === 'evaluation' ? '#evaluation' : '#versions');
  }

  return <div>
    <div className="mb-5 inline-flex rounded-xl border border-[var(--border)] bg-white/55 p-1.5 shadow-sm" role="tablist" aria-label="Prompt và kiểm thử">
      <Tab active={view === 'versions'} onClick={() => select('versions')}><GitBranch className="h-4 w-4" /> Phiên bản prompt</Tab>
      <Tab active={view === 'evaluation'} onClick={() => select('evaluation')}><FlaskConical className="h-4 w-4" /> Kiểm thử AI</Tab>
    </div>
    {view === 'versions' ? <PromptManager /> : <EvaluationWorkbench />}
  </div>;
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition ${active ? 'bg-charcoal text-ivory shadow-sm' : 'text-stone-600 hover:bg-white'}`}
  >{children}</button>;
}
