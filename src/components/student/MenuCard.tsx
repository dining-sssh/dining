'use client';

import React, { useState } from 'react';
import { CalendarDays, Clock, Info, Table as TableIcon, UtensilsCrossed } from 'lucide-react';
import { DiningTiming, MealType, MenuItem } from '@/types';
import { parseDateKey } from './studentUtils';

export const MEALS: Array<{ id: MealType; label: string; sublabel: string; defaultTiming: string }> = [
  { id: 'breakfast', label: 'BREAKFAST', sublabel: 'Breakfast', defaultTiming: '7:30 AM – 9:00 AM' },
  { id: 'lunch', label: 'LUNCH', sublabel: 'Lunch', defaultTiming: '12:30 PM – 2:30 PM' },
  { id: 'dinner', label: 'DINNER', sublabel: 'Dinner', defaultTiming: '7:30 PM – 9:30 PM' }
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ORDERED_WEEKDAYS: Array<{ day: number; name: string; shortName: string }> = [
  { day: 1, name: 'Monday', shortName: 'Mon' },
  { day: 2, name: 'Tuesday', shortName: 'Tue' },
  { day: 3, name: 'Wednesday', shortName: 'Wed' },
  { day: 4, name: 'Thursday', shortName: 'Thu' },
  { day: 5, name: 'Friday', shortName: 'Fri' },
  { day: 6, name: 'Saturday', shortName: 'Sat' },
  { day: 0, name: 'Sunday', shortName: 'Sun' }
];

/** "13:05" -> "1:05 PM" */
export const formatClock = (hhmm: string): string => {
  if (!hhmm) return '';
  if (/[a-zA-Z]/.test(hhmm)) return hhmm;
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

/**
 * Official Sir Shah Sulaiman Hall Dining Hall Menu & Table.
 * Fits the page cleanly without overflow and reflects live database updates.
 */
export const MenuCard: React.FC<MenuCardProps> = React.memo(({ menu, timings, todayKey }) => {
  const [viewMode, setViewMode] = useState<'table' | 'today'>('table');
  const todayWeekday = parseDateKey(todayKey).getDay();

  const itemsFor = (day: number, meal: MealType) =>
    menu.find((m) => m.weekday === day && m.meal === meal)?.items?.trim() ?? '';

  const timingFor = (meal: MealType) => {
    const found = timings.find((t) => t.meal === meal);
    if (!found) return null;
    return `${formatClock(found.start_time)} – ${formatClock(found.end_time)}`;
  };

  const hasAnyItems = menu.some((m) => m.items && m.items.trim());

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Official Letterhead Header */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3.5 sm:p-5">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-white shadow-sm ring-2 ring-emerald-900/10 sm:h-11 sm:w-11">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div>
              <p className="font-serif text-[10px] font-black uppercase tracking-widest text-emerald-900 sm:text-[11px]">
                Aligarh Muslim University
              </p>
              <h3 className="font-serif text-base font-black tracking-tight text-slate-900 sm:text-lg">
                Sir Shah Sulaiman Hall · Dining Hall Menu
              </h3>
              <p className="text-[11px] text-slate-500">
                Live Weekly Schedule · Sir Shah Sulaiman Hall
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex self-end rounded-full bg-slate-100 p-1 text-xs font-bold text-slate-600 sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                viewMode === 'table' ? 'bg-emerald-900 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Full Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
                viewMode === 'today' ? 'bg-emerald-900 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Today ({WEEKDAYS[todayWeekday].slice(0, 3)})
            </button>
          </div>
        </div>
      </div>

      {!hasAnyItems ? (
        <div className="py-12 text-center text-xs text-slate-400">
          The Munshi has not published the dining hall menu yet.
        </div>
      ) : viewMode === 'table' ? (
        /* The Official Table View - Fitted to Page */
        <div className="w-full overflow-hidden">
          <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-900">
                <th className="w-[16%] border-r border-slate-300 px-2 py-2.5 font-serif font-black uppercase sm:w-[15%] sm:px-3 sm:py-3">
                  DAYS
                </th>
                {MEALS.map((meal) => (
                  <th
                    key={meal.id}
                    className="w-[28%] border-r border-slate-300 px-2 py-2.5 last:border-r-0 sm:w-[28.33%] sm:px-3 sm:py-3"
                  >
                    <div className="font-serif text-[11px] font-black uppercase tracking-wider text-slate-900 sm:text-xs">
                      {meal.label}
                    </div>
                    <div className="truncate text-[9px] font-semibold text-emerald-800 sm:text-[10px]">
                      {timingFor(meal.id) || meal.defaultTiming}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {ORDERED_WEEKDAYS.map(({ day, name, shortName }) => {
                const isToday = day === todayWeekday;
                return (
                  <tr
                    key={day}
                    className={`transition-colors ${
                      isToday ? 'bg-emerald-50/90 font-medium ring-1 ring-inset ring-emerald-300' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="border-r border-slate-200 bg-slate-50/70 px-2 py-2 font-serif text-[11px] font-bold text-slate-900 sm:px-3 sm:py-2.5 sm:text-xs">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="uppercase sm:hidden">{shortName}</span>
                        <span className="hidden uppercase sm:inline">{name}</span>
                        {isToday && (
                          <span className="rounded bg-emerald-800 px-1 py-0.5 text-[8px] font-black uppercase tracking-wide text-white sm:text-[9px]">
                            Today
                          </span>
                        )}
                      </div>
                    </td>
                    {MEALS.map((meal) => {
                      const items = itemsFor(day, meal.id);
                      return (
                        <td
                          key={meal.id}
                          className="border-r border-slate-200 px-2 py-2 leading-snug text-slate-700 break-words last:border-r-0 sm:px-3 sm:py-2.5"
                        >
                          {items ? (
                            <span className={isToday ? 'font-semibold text-slate-950' : ''}>{items}</span>
                          ) : (
                            <span className="italic text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Today's Focused View */
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Menu for {WEEKDAYS[todayWeekday]}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
              Today
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {MEALS.map((meal) => {
              const items = itemsFor(todayWeekday, meal.id);
              const timing = timingFor(meal.id) || meal.defaultTiming;
              return (
                <div key={meal.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-serif text-xs font-black uppercase text-slate-900">{meal.label}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                        <Clock className="h-3 w-3" />
                        {timing}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                      {items || <span className="italic text-slate-400">Not served today</span>}
                    </p>
                  </div>
                  <span className="mt-3 text-[10px] font-medium text-slate-400">{meal.sublabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clean Dining Timings Footer */}
      <div className="border-t border-slate-200 bg-slate-50 p-3.5 sm:p-4">
        <div className="mb-3">
          <p className="mb-2 font-serif text-[11px] font-black uppercase tracking-wider text-slate-700 sm:text-xs">
            Dining Timings:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <span className="block font-serif text-[11px] font-black uppercase text-slate-900">BREAKFAST</span>
              <span className="mt-0.5 block text-xs font-bold text-emerald-800">
                {timingFor('breakfast') || '7:30 AM – 9:00 AM'}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <span className="block font-serif text-[11px] font-black uppercase text-slate-900">LUNCH</span>
              <span className="mt-0.5 block text-xs font-bold text-emerald-800">
                {timingFor('lunch') || '12:30 PM – 2:30 PM'}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
              <span className="block font-serif text-[11px] font-black uppercase text-slate-900">DINNER</span>
              <span className="mt-0.5 block text-xs font-bold text-emerald-800">
                {timingFor('dinner') || '7:30 PM – 9:30 PM'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-xs text-emerald-950">
          <Info className="h-4 w-4 shrink-0 text-emerald-700" />
          <p className="text-[11px] font-medium text-emerald-900 sm:text-xs">
            Sir Shah Sulaiman Hall Dining Hall — breakfast, lunch and dinner served daily according to schedule.
          </p>
        </div>
      </div>
    </section>
  );
});

MenuCard.displayName = 'MenuCard';
