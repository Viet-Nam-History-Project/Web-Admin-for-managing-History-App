'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ExportUsersButton({ rows }: { rows: (string | number)[][] }) {
  function download() {
    const csvRows = [['Tên', 'Email', 'Username', 'Trạng thái', 'Rank', 'XP', 'Streak', 'Sessions', 'Chơi gần nhất'], ...rows];
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <Button type="button" variant="outline" onClick={download}><Download className="h-4 w-4" /> Xuất CSV</Button>;
}
