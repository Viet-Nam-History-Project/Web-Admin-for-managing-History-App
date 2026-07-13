'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ShieldCheck } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { firebaseAuth } from '@/lib/firebase/client';

type AdminProfileResponse = {
  profile: {
    displayName?: string;
  };
};

export function Topbar() {
  const [displayName, setDisplayName] = useState('Admin');

  useEffect(() => {
    const syncName = async () => {
      const user = firebaseAuth.currentUser;
      setDisplayName(user?.displayName?.trim() || 'Admin');

      if (!user) return;
      try {
        const data = await adminFetch<AdminProfileResponse>('/api/admin/settings/profile');
        setDisplayName(data.profile.displayName?.trim() || user.displayName?.trim() || 'Admin');
      } catch {
        // Firebase Auth remains a safe fallback while the profile API is unavailable.
      }
    };
    const handleProfileUpdate = (event: Event) => {
      const nextName = (event as CustomEvent<{ displayName?: string }>).detail?.displayName;
      setDisplayName(nextName?.trim() || firebaseAuth.currentUser?.displayName?.trim() || 'Admin');
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
      void syncName();
    });
    window.addEventListener('admin-profile-updated', handleProfileUpdate);
    void syncName();
    return () => {
      unsubscribe();
      window.removeEventListener('admin-profile-updated', handleProfileUpdate);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-ivory/88 px-5 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-bronze">
            Admin workspace
          </p>
          <h1 className="text-xl font-black text-charcoal">Quản trị hệ thống học lịch sử</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center gap-2 rounded-xl bg-charcoal px-3 text-sm font-bold text-ivory">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span className="max-w-40 truncate" title={displayName}>{displayName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
