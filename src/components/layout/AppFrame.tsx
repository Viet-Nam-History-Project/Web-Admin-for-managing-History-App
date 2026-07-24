'use client';

import { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { firebaseAuth } from '@/lib/firebase/client';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => onIdTokenChanged(firebaseAuth, async (nextUser) => {
    try {
      if (nextUser) {
        const token = await nextUser.getIdToken();
        localStorage.setItem('admin_id_token', token);
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuthenticated(response.ok);
        if (!response.ok) {
          await fetch('/api/auth/session', { method: 'DELETE' });
        }
      } else {
        localStorage.removeItem('admin_id_token');
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
        });
        setAuthenticated(response.ok);
      }
    } finally {
      setReady(true);
    }
  }), []);

  useEffect(() => {
    if (ready && !authenticated && pathname !== '/login') {
      const next = encodeURIComponent(pathname === '/' ? '/dashboard' : pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [authenticated, pathname, ready, router]);

  if (pathname === '/login') return <>{children}</>;

  if (!ready || !authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-ivory">
        <div className="flex items-center gap-3 text-sm font-semibold text-stone-600">
          <Loader2 className="h-5 w-5 animate-spin text-bronze" />
          Đang kiểm tra phiên đăng nhập...
        </div>
      </main>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
