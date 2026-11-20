'use client';

import React from 'react';
import { Bell, CalendarDays, Home, Receipt, UserRound, GraduationCap, Utensils } from 'lucide-react';
import { HALL_NAME } from './studentUtils';

/* ------------------------------------------------------------------ */
/* Top header                                                          */
/* ------------------------------------------------------------------ */

interface StudentHeaderProps {
  hasAlerts: boolean;
  onBellClick: () => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = React.memo(({ hasAlerts, onBellClick }) => (
  <header className="no-print relative pb-1 pt-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 text-white shadow-md ring-2 ring-white">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="text-sm font-semibold leading-tight text-emerald-950">
          Aligarh Muslim
          <br />
          University
        </div>
      </div>

      <button
        type="button"
        onClick={onBellClick}
        aria-label={hasAlerts ? 'Notifications (pending items)' : 'Notifications'}
        className="press relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-900/10"
      >
        <Bell className="h-5 w-5" />
        {hasAlerts && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
      </button>
    </div>

    <div className="mt-3 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-emerald-950">{HALL_NAME}</h1>
      <div className="mt-1 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-900/70">
        <span className="h-px w-10 bg-emerald-900/25" />
        Dining System
        <span className="h-px w-10 bg-emerald-900/25" />
      </div>
    </div>
  </header>
));
StudentHeader.displayName = 'StudentHeader';

/* ------------------------------------------------------------------ */
/* Bottom navigation                                                   */
/* ------------------------------------------------------------------ */

export type StudentTab = 'home' | 'log' | 'reviews' | 'bills' | 'profile';

const TABS: Array<{ id: StudentTab; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'log', label: 'Log', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: Utensils },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'profile', label: 'Profile', icon: UserRound }
];

interface BottomNavProps {
  active: StudentTab;
  onChange: (tab: StudentTab) => void;
}

// No backdrop-filter here: blurring what scrolls behind a fixed bar is the most common cause of jank on phones.
export const BottomNav: React.FC<BottomNavProps> = React.memo(({ active, onChange }) => (
  <nav
    aria-label="Student sections"
    className="no-print fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full border border-white bg-white p-1.5 shadow-xl shadow-emerald-950/15"
  >
    <ul className="flex items-center justify-between gap-1">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <li key={id} className={isActive ? 'flex-[1.7]' : 'flex-1'}>
            <button
              type="button"
              onClick={() => onChange(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`press flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                isActive ? 'bg-emerald-950 text-white shadow-md' : 'text-emerald-950/70 active:bg-emerald-50'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {isActive && <span className="truncate pr-1">{label}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
));
BottomNav.displayName = 'BottomNav';
