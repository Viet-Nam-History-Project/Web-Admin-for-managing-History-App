'use client';

import { useEffect, useState } from 'react';
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { BookOpenCheck, Loader2 } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  function redirectAfterLogin() {
    const next = new URLSearchParams(window.location.search).get('next');
    window.location.replace(next?.startsWith('/') && next !== '/' ? next : '/dashboard');
  }

  async function establishServerSession(user: User) {
    const token = await user.getIdToken();
    localStorage.setItem('admin_id_token', token);
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  }

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const currentSession = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
        });
        if (currentSession.ok) {
          redirectAfterLogin();
          return;
        }

        await setPersistence(firebaseAuth, browserLocalPersistence);
        await firebaseAuth.authStateReady();
        const user = firebaseAuth.currentUser;
        if (user && await establishServerSession(user)) {
          redirectAfterLogin();
          return;
        }
      } catch {
        // Hiện form đăng nhập nếu không thể tự khôi phục.
      }
      if (active) setRestoring(false);
    }
    void restoreSession();
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (!await establishServerSession(credential.user)) {
        await signOut(firebaseAuth);
        throw new Error('Tài khoản không có quyền quản trị.');
      }
      redirectAfterLogin();
    } catch {
      setError('Đăng nhập thất bại. Kiểm tra email, mật khẩu hoặc quyền admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white/82 p-8 shadow-museum backdrop-blur"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/18 text-bronze">
            <BookOpenCheck className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-black text-charcoal">Lịch Sử Việt Nam</h1>
        </div>

        <div className="grid gap-4">
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </Field>
          <Field label="Mật khẩu">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </Field>
          {error ? <p className="rounded-lg bg-flag/10 p-3 text-sm font-semibold text-flag">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || restoring}>
            {loading || restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {restoring ? 'Đang khôi phục...' : 'Đăng nhập'}
          </Button>
          {restoring ? <p className="text-center text-xs font-semibold text-stone-500">Đang khôi phục phiên đăng nhập đã lưu...</p> : null}
        </div>
      </form>
    </main>
  );
}
