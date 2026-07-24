'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { adminFetch } from '@/lib/api/adminClient';

export function ExportPeriodsButton() {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const data = await adminFetch<unknown[]>('/api/admin/periods/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `periods-full-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không xuất được dữ liệu periods.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={download} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? 'Đang xuất...' : 'Export JSON'}
    </Button>
  );
}
