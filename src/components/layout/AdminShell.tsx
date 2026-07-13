'use client';

import { createContext, useContext } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

const AdminShellContext = createContext(false);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const alreadyInsideShell = useContext(AdminShellContext);

  // Các page cũ vẫn gọi AdminShell; layout dùng chung sẽ giữ shell không bị remount khi đổi route.
  if (alreadyInsideShell) return <>{children}</>;

  return (
    <AdminShellContext.Provider value>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="museum-scrollbar h-screen min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}
