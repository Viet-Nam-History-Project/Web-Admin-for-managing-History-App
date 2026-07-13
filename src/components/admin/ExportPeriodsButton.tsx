'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ExportPeriodsButton({ data }: { data: unknown }) {
  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `periods-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <Button type="button" variant="outline" onClick={download}><Download className="h-4 w-4" /> Export JSON</Button>;
}
