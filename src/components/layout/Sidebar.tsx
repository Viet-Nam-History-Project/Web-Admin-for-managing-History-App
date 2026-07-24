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
    <aside className="group/sidebar sticky top-0 z-40 hidden h-screen w-[84px] shrink-0 overflow-visible text-ivory lg:block">
      <div className="flex h-screen w-[84x] flex-col overflow-hidden border-r border-white/10 bg-charcoal shadow-none transition-[width,box-shadow] duration-300 ease-out group-hover/sidebar:w-64 group-hover/sidebar:shadow-2xl group-focus-within/sidebar:w-64 group-focus-within/sidebar:shadow-2xl motion-reduce:transition-none">
        <div className="border-b border-white/10 px-2 py-5 transition-[padding] duration-300 group-hover/sidebar:px-4 group-focus-within/sidebar:px-4 motion-reduce:transition-none">
          <div className="flex items-center justify-center gap-0 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-focus-within/sidebar:justify-start group-focus-within/sidebar:gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/18 text-gold">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <div className="max-w-0 min-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200 group-hover/sidebar:max-w-44 group-hover/sidebar:opacity-100 group-focus-within/sidebar:max-w-44 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
              <p className="text-base font-black">Lịch Sử Việt Nam</p>
              <p className="text-xs text-[#E8DCC8]/70">Museum Admin Console</p>
            </div>
          </div>
        </div>

        <nav
          ref={navRef}
          className="museum-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-4 transition-[padding] duration-300 group-hover/sidebar:px-3 group-focus-within/sidebar:px-3 motion-reduce:transition-none"
        >
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn(
                'mb-5',
                groupIndex > 0 && 'border-t border-white/10 pt-3 group-hover/sidebar:border-transparent group-focus-within/sidebar:border-transparent',
              )}
            >
              <p className="mb-0 max-h-0 overflow-hidden whitespace-nowrap px-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#E8DCC8]/50 opacity-0 transition-[max-height,opacity,margin] duration-200 group-hover/sidebar:mb-2 group-hover/sidebar:max-h-5 group-hover/sidebar:opacity-100 group-focus-within/sidebar:mb-2 group-focus-within/sidebar:max-h-5 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
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
                    aria-label={item.label}
                    title={item.label}
                    className={cn(
                      'flex h-10 items-center justify-center gap-0 rounded-xl px-0 text-sm font-semibold text-[#E8DCC8] transition hover:bg-white/8 hover:text-white group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3 group-focus-within/sidebar:justify-start group-focus-within/sidebar:gap-3 group-focus-within/sidebar:px-3',
                      active && 'bg-gold/18 text-gold shadow-sm',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200 group-hover/sidebar:max-w-44 group-hover/sidebar:opacity-100 group-focus-within/sidebar:max-w-44 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                      {item.label}
                    </span>
                  </Link>
                );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
