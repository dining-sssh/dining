'use client';

import React, { useState } from 'react';
import { ChevronDown, Clock, UtensilsCrossed } from 'lucide-react';
import { DiningTiming, MealType, MenuItem } from '@/types';
import { parseDateKey } from './studentUtils';

export const MEALS: Array<{ id: MealType; label: string }> = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' }
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "13:05" -> "1:05 PM" */
export const formatClock = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
};

interface MenuCardProps {
  menu: MenuItem[];
  timings: DiningTiming[];
  todayKey: string;
}

/** Today's menu and meal timings, as published by the Munshi. */
export const MenuCard: React.FC<MenuCardProps> = React.memo(({ menu, timings, todayKey }) => {
  const [showWeek, setShowWeek] = useState(false);
  const weekday = parseDateKey(todayKey).getDay();

  const itemsFor = (day: number, meal: MealType) =>
    menu.find((m) => m.weekday === day && m.meal === meal)?.items?.trim() ?? '';
  const timingFor = (meal: MealType) => timings.find((t) => t.meal === meal);

  const hasAnything = menu.some((m) => m.items.trim()) || timings.length > 0;

  return (
    <section className="rounded-3xl border border-white bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Today&apos;s menu</h3>
            <p className="text-[11px] text-slate-500">{WEEKDAYS[weekday]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowWeek((v) => !v)}
          aria-expanded={showWeek}
          className="press flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700"
        >
          Full week
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showWeek ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {!hasAnything ? (
        <p className="py-4 text-center text-xs text-slate-400">The Munshi has not published the menu yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {MEALS.map(({ id, label }) => {
            const items = itemsFor(weekday, id);
            const timing = timingFor(id);
            if (!items && !timing) return null;
            return (
              <li key={id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{label}</span>
                  {timing && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                      <Clock className="h-3 w-3" />
                      {formatClock(timing.start_time)} – {formatClock(timing.end_time)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">{items || 'Not published'}</p>
              </li>
            );
          })}
        </ul>
      )}

      {showWeek && (
        <div className="fade-enter mt-3 space-y-2 border-t border-slate-100 pt-3">
          {WEEKDAYS.map((name, day) => (
            <div key={name} className={`rounded-2xl p-3 ${day === weekday ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'}`}>
              <p className="text-xs font-bold text-slate-900">{name}</p>
              <ul className="mt-1 space-y-0.5">
                {MEALS.map(({ id, label }) => {
                  const items = itemsFor(day, id);
                  return items ? (
                    <li key={id} className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800">{label}:</span> {items}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});
MenuCard.displayName = 'MenuCard';
