'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Loader2, SearchCheck, XCircle } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import type { ForumModerationAction, ForumReportStatus } from '@/services/forumAdminService';

export function ReportModerationActions({
  reportPath,
  status,
  postHidden,
  initialNote,
}: {
  reportPath: string;
  status: ForumReportStatus;
  postHidden?: boolean;
  initialNote?: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? '');
  const [loading, setLoading] = useState<ForumModerationAction | ''>('');
  const [error, setError] = useState('');

  async function run(action: ForumModerationAction) {
    if (action === 'hide_post' && !window.confirm('Ẩn bài viết này khỏi ứng dụng người dùng?')) return;
    setLoading(action);
    setError('');
    try {
      await adminFetch('/api/admin/forum/reports', {
        method: 'PATCH',
        body: JSON.stringify({ reportPath, action, note }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Thao tác thất bại.');
    } finally {
      setLoading('');
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1">
        <span className="text-xs font-bold text-stone-500">Ghi chú xử lý</span>
        <textarea
          value={note}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ghi lại căn cứ và kết quả kiểm tra..."
          className="min-h-20 resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-flag">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={Boolean(loading) || status === 'reviewing' || postHidden}
          onClick={() => run('review')}
        >
          {loading === 'review' ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
          Tiếp nhận
        </Button>
        <Button type="button" variant="outline" disabled={Boolean(loading) || status === 'dismissed' || postHidden} onClick={() => run('dismiss')}>
          {loading === 'dismiss' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          Bỏ qua
        </Button>
        <Button type="button" variant="danger" disabled={Boolean(loading) || postHidden} onClick={() => run('hide_post')}>
          {loading === 'hide_post' ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
          {postHidden ? 'Bài viết đã ẩn' : 'Ẩn bài viết'}
        </Button>
      </div>
    </div>
  );
}
