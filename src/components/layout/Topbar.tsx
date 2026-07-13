'use client';

import { ShieldCheck } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase/client';

export function Topbar() {
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
            <span className="max-w-40 truncate">{firebaseAuth.currentUser?.email ?? 'Admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
