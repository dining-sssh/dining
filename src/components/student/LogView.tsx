'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, X, UtensilsCrossed } from 'lucide-react';
import { DiningDailyRecord } from '@/types';
import {
  DayResolver,
  computeMonthStats,
  monthLabel,
  parseDateKey,
  shiftMonth,
  weekdayShort
} from './studentUtils';

interface LogViewProps {
  records: DiningDailyRecord[];
  monthKey: string;
  todayKey: string;
  resolve: DayResolver;
  onMonthChange: (monthKey: string) => void;
}

export const LogView: React.FC<LogViewProps> = ({ records, monthKey, todayKey, resolve, onMonthChange }) => {
  const stats = useMemo(() => computeMonthStats(records, monthKey), [records, monthKey]);

  const rows = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dateKey = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
      return { dateKey, info: resolve(dateKey) };
    })
      .filter(({ dateKey, info }) => dateKey <= todayKey && info.status !== 'none' && info.status !== 'upcoming')
      .reverse();
  }, [monthKey, todayKey, resolve]);

  const statCards = [
    { label: 'Diets logged', value: stats.dietsLogged, unit: '', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    { label: 'Days eaten', value: stats.daysEaten, unit: 'days', tone: 'bg-sky-50 border-sky-200 text-sky-900' },
    { label: 'Days not eaten', value: stats.daysNotEaten, unit: 'days', tone: 'bg-rose-50 border-rose-200 text-rose-900' },
    { label: 'Mess off', value: stats.rebateDays, unit: 'days', tone: 'bg-amber-50 border-amber-200 text-amber-900' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dining Log</h2>
          <p className="text-xs text-slate-500">Day-wise attendance marked by the Munshi</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-1 py-1 shadow-sm ring-1 ring-slate-200">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-xs font-bold text-slate-800">{monthLabel(monthKey)}</span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-3.5 ${c.tone}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{c.label}</p>
            <p className="mt-1 text-2xl font-black">
              {c.value}
              {c.unit && <span className="ml-1 text-xs font-semibold opacity-70">{c.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-lg shadow-emerald-950/5">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">No dining records for this month yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map(({ dateKey, info }) => {
              const day = parseDateKey(dateKey).getDate();
              const guest = info.record?.guest_diets ?? 0;
              const tone =
                info.status === 'done'
                  ? { chip: 'bg-emerald-100 text-emerald-800', label: 'Eaten', icon: <Check className="h-3.5 w-3.5" /> }
                  : info.status === 'rebate'
                  ? { chip: 'bg-amber-100 text-amber-800', label: 'Mess off', icon: <UtensilsCrossed className="h-3.5 w-3.5" /> }
                  : { chip: 'bg-rose-100 text-rose-800', label: 'Not eaten', icon: <X className="h-3.5 w-3.5" /> };

              return (
                <li key={dateKey} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                    <span className="text-sm font-extrabold leading-none text-slate-900">{day}</span>
                    <span className="mt-0.5 text-[10px] font-medium text-slate-500">{weekdayShort(dateKey)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone.chip}`}>
                      {tone.icon}
                      {tone.label}
                    </span>
                    {info.status === 'rebate' && info.rebateReason && (
                      <p className="mt-1 truncate text-[11px] text-slate-500">{info.rebateReason}</p>
                    )}
                  </div>
                  {guest > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                      Guest +{guest}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
