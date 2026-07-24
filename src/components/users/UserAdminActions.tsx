'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, KeyRound, Loader2, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Form';

export function UserAdminActions({ uid, name, disabled }: { uid: string; name: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [accountReason, setAccountReason] = useState('');
  const [xpDelta, setXpDelta] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [streakReason, setStreakReason] = useState('');

  async function run(key: string, payload: Record<string, unknown>, success: string) {
    setLoading(key); setError(''); setNotice('');
    try {
      await adminFetch(`/api/admin/users/${uid}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setNotice(success);
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Thao tác thất bại.'); }
    finally { setLoading(''); }
  }

  return <div className="grid gap-5">
    {notice ? <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}
    {error ? <p className="rounded-xl border border-flag/20 bg-flag/5 p-3 text-sm font-semibold text-flag">{error}</p> : null}
    <div className="grid gap-5 xl:grid-cols-3">
      <Card><CardTitle>{disabled ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</CardTitle><p className="mt-1 text-sm text-stone-500">{disabled ? 'Cho phép người dùng đăng nhập trở lại.' : 'Ngăn người dùng đăng nhập và kết thúc các phiên đang hoạt động.'}</p><div className="mt-4"><Field label="Lý do"><Input value={accountReason} onChange={(event) => setAccountReason(event.target.value)} placeholder={disabled ? 'Đã xác minh và mở khóa...' : 'Vi phạm quy định...'} /></Field></div><Button className="mt-4 w-full" variant={disabled ? 'primary' : 'danger'} disabled={!accountReason.trim() || Boolean(loading)} onClick={() => run('account', { action: 'set_disabled', disabled: !disabled, reason: accountReason }, disabled ? `Đã mở khóa ${name}.` : `Đã khóa ${name}.`)}>{loading === 'account' ? <Loader2 className="h-4 w-4 animate-spin" /> : disabled ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{disabled ? 'Mở khóa' : 'Khóa tài khoản'}</Button></Card>
      <Card><CardTitle>Điều chỉnh XP</CardTitle><p className="mt-1 text-sm text-stone-500">Nhập số dương để cộng, số âm để trừ. Rank được tính lại tự động.</p><div className="mt-4 grid gap-3"><Field label="Mức điều chỉnh"><Input type="number" value={xpDelta} onChange={(event) => setXpDelta(event.target.value)} placeholder="Ví dụ: 100 hoặc -50" /></Field><Field label="Lý do"><Input value={xpReason} onChange={(event) => setXpReason(event.target.value)} /></Field></div><Button className="mt-4 w-full" disabled={!xpDelta || !xpReason.trim() || Boolean(loading)} onClick={() => run('xp', { action: 'adjust_xp', delta: Number(xpDelta), reason: xpReason }, 'Đã cập nhật XP và rank.')} >{loading === 'xp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Cập nhật XP</Button></Card>
      <Card><CardTitle>Streak và phiên đăng nhập</CardTitle><p className="mt-1 text-sm text-stone-500">Các thao tác bảo trì khi dữ liệu chuỗi học hoặc phiên người dùng có vấn đề.</p><div className="mt-4"><Field label="Lý do reset streak"><Input value={streakReason} onChange={(event) => setStreakReason(event.target.value)} /></Field></div><Button className="mt-4 w-full" variant="outline" disabled={!streakReason.trim() || Boolean(loading)} onClick={() => run('streak', { action: 'reset_streak', reason: streakReason }, 'Đã reset streak về 0.')}>{loading === 'streak' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reset streak</Button><Button className="mt-2 w-full" variant="danger" disabled={Boolean(loading)} onClick={() => window.confirm(`Thu hồi toàn bộ phiên đăng nhập của ${name}?`) && run('sessions', { action: 'revoke_sessions' }, 'Đã thu hồi các phiên đăng nhập.')}>{loading === 'sessions' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Thu hồi phiên</Button></Card>
    </div>
  </div>;
}
