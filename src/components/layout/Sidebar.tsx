'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BookOpenCheck } from 'lucide-react';
import { navGroups } from '@/components/layout/navItems';
import { cn } from '@/lib/utils/cn';

export function Sidebar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const savedPosition = sessionStorage.getItem('admin-sidebar-scroll');
    if (savedPosition) nav.scrollTop = Number(savedPosition);
    else nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });

    const rememberPosition = () => sessionStorage.setItem('admin-sidebar-scroll', String(nav.scrollTop));
    nav.addEventListener('scroll', rememberPosition, { passive: true });
    return () => nav.removeEventListener('scroll', rememberPosition);
  }, []);

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-r border-white/10 bg-charcoal text-ivory lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/18 text-gold">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-black">Lịch Sử Việt Nam</p>
            <p className="text-xs text-[#E8DCC8]/70">Museum Admin Console</p>
          </div>
        </div>
      </div>

      <nav ref={navRef} className="museum-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#E8DCC8]/50">
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map((item) => {
                const activePrefixes = 'activePrefixes' in item ? item.activePrefixes : [];
                const active = pathname === item.href
                  || pathname.startsWith(`${item.href}/`)
                  || activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#E8DCC8] transition hover:bg-white/8 hover:text-white',
                      active && 'bg-gold/18 text-gold shadow-sm',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
