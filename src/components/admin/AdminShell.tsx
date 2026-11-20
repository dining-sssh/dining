'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AuthSession } from '@/types';
import { PAGE_BACKGROUND } from './ui';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Small count shown on the item (e.g. pending approvals). */
  badge?: number;
  /** Highlight only on the exact path (for index routes like /provost). */
  exact?: boolean;
}

interface AdminShellProps {
  panelName: string; // "Provost" | "Munshi"
  panelNote: string;
  nav: AdminNavItem[];
  session: AuthSession;
  onLogout: () => void;
  children: React.ReactNode;
}

const HALL = 'Sir Shah Sulaiman Hall';

export const AdminShell: React.FC<AdminShellProps> = ({ panelName, panelNote, nav, session, onLogout, children }) => {
  const pathname = usePathname();

  const isActive = (item: AdminNavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="min-h-[100dvh]" style={{ backgroundImage: PAGE_BACKGROUND }}>
      {/* Sidebar (laptop) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-emerald-900/10 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold leading-tight text-emerald-950">{HALL}</p>
            <p className="text-[11px] font-semibold text-emerald-800/70">{panelName} Panel</p>
          </div>
        </div>

        <nav aria-label={`${panelName} sections`} className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                  active ? 'bg-emerald-950 text-white shadow-md' : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-emerald-950">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <p className="truncate text-xs font-semibold text-slate-700" title={session.email}>
            {session.email}
          </p>
          <p className="mb-3 text-[11px] text-slate-400">{panelNote}</p>
          <button
            type="button"
            onClick={onLogout}
            className="press flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white py-2.5 text-xs font-bold text-rose-700"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Top bar + tab strip (phone / tablet) */}
      <header className="no-print sticky top-0 z-30 border-b border-emerald-900/10 bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight text-emerald-950">{HALL}</p>
              <p className="text-[11px] font-semibold text-emerald-800/70">{panelName} Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label={`${panelName} sections`} className="flex gap-2 overflow-x-auto px-4 pb-3">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`press flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                  active ? 'bg-emerald-950 text-white shadow' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {!!item.badge && (
                  <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-extrabold text-emerald-950">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 pb-24 pt-5 lg:ml-64 lg:px-8 lg:py-8">
        {/* key = path, so every page change fades/slides in (transform + opacity only) */}
        <div key={pathname} className="tab-enter mx-auto w-full max-w-6xl space-y-5">
          {children}
        </div>
      </main>
    </div>
  );
};
