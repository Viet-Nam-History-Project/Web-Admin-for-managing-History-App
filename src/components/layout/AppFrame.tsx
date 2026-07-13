'use client';

import { useEffect, useState } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { firebaseAuth } from '@/lib/firebase/client';

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onIdTokenChanged(firebaseAuth, async (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      const token = await nextUser.getIdToken();
      localStorage.setItem('admin_id_token', token);
    } else {
      localStorage.removeItem('admin_id_token');
    }
    setReady(true);
  }), []);

  useEffect(() => {
    if (ready && !user && pathname !== '/login') {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [pathname, ready, router, user]);

  if (pathname === '/login') return <>{children}</>;

  if (!ready || !user) {
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
