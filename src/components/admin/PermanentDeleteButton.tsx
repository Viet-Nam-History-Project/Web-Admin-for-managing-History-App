'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, X } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';

export function PermanentDeleteButton({ trashId, title }: { trashId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setLoading(true); setError('');
    try {
      await adminFetch('/api/admin/trash', { method: 'DELETE', body: JSON.stringify({ trashId, confirmation }) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được dữ liệu.');
    } finally { setLoading(false); }
  }

  return <>
    <Button type="button" variant="danger" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /> Xóa vĩnh viễn</Button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-museum">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[var(--foreground)]">Xóa vĩnh viễn?</h2><p className="mt-2 text-sm leading-6 text-stone-500">“{title}” và toàn bộ dữ liệu con sẽ không thể phục hồi.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-stone-500 hover:bg-black/5" title="Đóng"><X className="h-5 w-5" /></button></div>
        <label className="mt-4 grid gap-2"><span className="text-sm font-bold text-[var(--foreground)]">Nhập DELETE để xác nhận</span><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoFocus /></label>
        {error ? <p className="mt-3 rounded-lg bg-flag/10 p-3 text-sm font-semibold text-flag">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button><Button type="button" variant="danger" disabled={confirmation !== 'DELETE' || loading} onClick={remove}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Xóa vĩnh viễn</Button></div>
      </div>
    </div> : null}
  </>;
}
