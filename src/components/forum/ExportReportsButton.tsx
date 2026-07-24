'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ExportReportsButton({ rows }: { rows: Array<Array<string | number>> }) {
  function download() {
    const headings = ['Thời gian', 'Trạng thái', 'Lý do', 'Bài viết', 'Người báo cáo', 'Người bị báo cáo', 'Mô tả'];
    const csv = [headings, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bao-cao-vi-pham-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <Button type="button" variant="outline" onClick={download}><Download className="h-4 w-4" /> Xuất CSV</Button>;
}
