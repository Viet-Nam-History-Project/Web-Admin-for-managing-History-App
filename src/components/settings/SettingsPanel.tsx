'use client';

import { useEffect, useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Database, Eye, EyeOff, KeyRound, Loader2, LogOut, Moon, ShieldCheck, Sun, UserRound, Workflow, Zap } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { firebaseAuth } from '@/lib/firebase/client';
import { useAdminPreferences } from '@/contexts/AdminPreferencesContext';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Form';

type Notice = { tone: 'success' | 'error'; message: string } | null;

export function SettingsPanel({ connections }: { connections: { firebase: boolean; graph: boolean; ai: boolean } }) {
  const router = useRouter();
  const { theme, setTheme, reducedMotion, setReducedMotion } = useAdminPreferences();
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('admin');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const user = firebaseAuth.currentUser;

  useEffect(() => {
    setDisplayName(firebaseAuth.currentUser?.displayName ?? 'Quản trị viên');
    firebaseAuth.currentUser?.getIdTokenResult().then((result) => {
      const roles = Array.isArray(result.claims.roles) ? result.claims.roles : [];
      setRole(String(roles[0] ?? (result.claims.admin ? 'admin' : 'viewer')));
    });
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileLoading(true);
    setNotice(null);
    try {
      await adminFetch('/api/admin/settings/profile', { method: 'PATCH', body: JSON.stringify({ displayName }) });
      await firebaseAuth.currentUser?.reload();
      window.dispatchEvent(new CustomEvent('admin-profile-updated', { detail: { displayName } }));
      setNotice({ tone: 'success', message: 'Đã cập nhật thông tin quản trị viên.' });
      router.refresh();
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Không cập nhật được hồ sơ.' });
    } finally { setProfileLoading(false); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!user?.email) return setNotice({ tone: 'error', message: 'Không xác định được tài khoản hiện tại.' });
    if (newPassword.length < 8) return setNotice({ tone: 'error', message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
    if (newPassword !== confirmPassword) return setNotice({ tone: 'error', message: 'Xác nhận mật khẩu mới chưa khớp.' });
    if (currentPassword === newPassword) return setNotice({ tone: 'error', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
    setPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await user.getIdToken(true);
      await adminFetch('/api/admin/settings/profile', { method: 'POST', body: JSON.stringify({ action: 'password_changed' }) });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setNotice({ tone: 'success', message: 'Đã đổi mật khẩu. Phiên hiện tại vẫn được giữ an toàn.' });
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'Mật khẩu hiện tại không đúng.'
        : error instanceof Error ? error.message : 'Không đổi được mật khẩu.';
      setNotice({ tone: 'error', message });
    } finally { setPasswordLoading(false); }
  }

  async function logout() {
    setLogoutLoading(true);
    await adminFetch('/api/admin/settings/profile', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }).catch(() => undefined);
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);
    await signOut(firebaseAuth);
    localStorage.removeItem('admin_id_token');
    router.replace('/login');
  }

  return <div className="grid gap-5">
    {notice ? <div className={`rounded-xl border p-3 text-sm font-semibold ${notice.tone === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-flag/20 bg-flag/5 text-flag'}`}>{notice.message}</div> : null}

    <div className="grid gap-5 xl:grid-cols-2">
      <Card><div className="flex items-center gap-3"><div className="rounded-xl bg-gold/18 p-3 text-bronze"><Sun className="h-5 w-5" /></div><div><CardTitle>Giao diện</CardTitle><p className="text-sm text-stone-500">Tùy chỉnh cách Web Admin hiển thị trên thiết bị này.</p></div></div>
        <div className="mt-5"><p className="text-sm font-bold text-charcoal">Chế độ màu</p><div className="mt-2 grid grid-cols-2 gap-3"><button type="button" onClick={() => setTheme('light')} className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${theme === 'light' ? 'border-bronze bg-gold/18 text-bronze' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'}`}><Sun className="h-5 w-5" /> Sáng</button><button type="button" onClick={() => setTheme('dark')} className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${theme === 'dark' ? 'border-gold bg-charcoal text-gold' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]'}`}><Moon className="h-5 w-5" /> Tối</button></div></div>
        <label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><span><span className="block text-sm font-bold text-[var(--foreground)]">Giảm chuyển động</span><span className="mt-1 block text-xs text-stone-500">Tắt phần lớn animation và transition.</span></span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} className="h-5 w-5 accent-[#B8860B]" /></label>
      </Card>

      <Card><div className="flex items-center gap-3"><div className="rounded-xl bg-gold/18 p-3 text-bronze"><UserRound className="h-5 w-5" /></div><div><CardTitle>Hồ sơ quản trị</CardTitle><p className="text-sm text-stone-500">Cập nhật thông tin hiển thị của tài khoản.</p></div></div>
        <form onSubmit={saveProfile} className="mt-5 grid gap-4"><Field label="Tên hiển thị"><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} /></Field><Field label="Email"><Input value={user?.email ?? ''} disabled /></Field><div className="grid grid-cols-2 gap-3"><Meta label="UID" value={user?.uid ?? 'N/A'} /><Meta label="Vai trò" value={role} /></div><div className="flex justify-end"><Button disabled={profileLoading}>{profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Lưu hồ sơ</Button></div></form>
      </Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card><div className="flex items-center gap-3"><div className="rounded-xl bg-flag/10 p-3 text-flag"><KeyRound className="h-5 w-5" /></div><div><CardTitle>Đổi mật khẩu</CardTitle><p className="text-sm text-stone-500">Yêu cầu xác thực lại mật khẩu hiện tại.</p></div></div>
        <form onSubmit={changePassword} className="mt-5 grid gap-4"><Field label="Mật khẩu hiện tại"><Input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></Field><Field label="Mật khẩu mới" hint="Ít nhất 8 ký tự"><Input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} /></Field><Field label="Xác nhận mật khẩu mới"><Input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /></Field><button type="button" onClick={() => setShowPasswords((value) => !value)} className="flex w-fit items-center gap-2 text-sm font-bold text-bronze">{showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button><div className="flex justify-end"><Button disabled={passwordLoading}>{passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Cập nhật mật khẩu</Button></div></form>
      </Card>

      <Card><div className="flex items-center gap-3"><div className="rounded-xl bg-gold/18 p-3 text-bronze"><Database className="h-5 w-5" /></div><div><CardTitle>Trạng thái hệ thống</CardTitle><p className="text-sm text-stone-500">Theo dõi khả năng hoạt động của các dịch vụ.</p></div></div><div className="mt-5 grid gap-3"><Connection icon={Database} label="Cơ sở dữ liệu" connected={connections.firebase} /><Connection icon={Workflow} label="Kho tri thức" connected={connections.graph} /><Connection icon={Zap} label="Trợ lý AI" connected={connections.ai} /></div></Card>
    </div>

    <Card className="border-flag/20"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Phiên đăng nhập</CardTitle><p className="mt-1 text-sm text-stone-500">Đăng xuất khỏi tài khoản quản trị trên trình duyệt này.</p></div><Button type="button" variant="danger" onClick={logout} disabled={logoutLoading}>{logoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Đăng xuất</Button></div></Card>
  </div>;
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-[var(--foreground)]" title={value}>{value}</p></div>; }
function Connection({ icon: Icon, label, connected }: { icon: typeof Database; label: string; connected: boolean }) { return <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-bronze" /><span className="text-sm font-bold text-[var(--foreground)]">{label}</span></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>{connected ? 'Đã cấu hình' : 'Chưa cấu hình'}</span></div>; }
