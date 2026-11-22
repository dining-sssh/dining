'use client';

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayInfo, DayKind } from '@/lib/diningEngine';
import { formatRupees } from '@/lib/diningEngine';
import { DAY_LABEL, describeDay, formatLongDate, monthLabel, parseDateKey, shiftMonth } from './studentUtils';

const WEEK_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CELL_STYLES: Record<DayKind, string> = {
  eaten: 'bg-emerald-200 text-emerald-950 ring-1 ring-emerald-500/70',
  deficit: 'bg-orange-300 text-orange-950 ring-1 ring-orange-500',
  off: 'bg-amber-200 text-amber-950 ring-1 ring-amber-400',
  stopped: 'bg-rose-400 text-white ring-1 ring-rose-500',
  upcoming: 'bg-white text-slate-800 ring-1 ring-slate-300',
  break: 'bg-slate-100 text-slate-400',
  before: 'bg-transparent text-slate-300'
};

const BADGE_STYLES: Record<DayKind, string> = {
  eaten: 'bg-emerald-100 text-emerald-800',
  deficit: 'bg-orange-100 text-orange-800',
  off: 'bg-amber-100 text-amber-800',
  stopped: 'bg-rose-100 text-rose-800',
  upcoming: 'bg-slate-200 text-slate-700',
  break: 'bg-slate-200 text-slate-700',
  before: 'bg-slate-200 text-slate-700'
};

interface DiningCalendarProps {
  monthKey: string;
  todayKey: string;
  resolve: (dateKey: string) => DayInfo;
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  onMonthChange: (monthKey: string) => void;
}

export const DiningCalendar: React.FC<DiningCalendarProps> = React.memo(({
  monthKey,
  todayKey,
  resolve,
  selectedDate,
  onSelectDate,
  onMonthChange
}) => {
  const [year, month] = monthKey.split('-').map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`)
  ];

  const selectedInfo = selectedDate ? resolve(selectedDate) : null;

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-4 shadow-lg shadow-emerald-950/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-emerald-900" />
          <h3 className="text-base font-bold text-slate-900">{monthLabel(monthKey)}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {WEEK_HEADERS.map((d) => (
          <div key={d} className="pb-1 text-[11px] font-semibold text-slate-500">
            {d}
          </div>
        ))}

        {cells.map((dateKey, idx) => {
          if (!dateKey) return <div key={`blank-${idx}`} />;

          const info = resolve(dateKey);
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;
          const dayNum = parseDateKey(dateKey).getDate();

          return (
            <div key={dateKey} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelectDate(isSelected ? null : dateKey)}
                title={`${formatLongDate(dateKey)}: ${describeDay(info)}`}
                aria-label={`${formatLongDate(dateKey)}: ${describeDay(info)}`}
                aria-pressed={isSelected}
                className={`press relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold sm:h-10 sm:w-10 ${CELL_STYLES[info.kind]} ${
                  isToday ? 'outline outline-2 outline-offset-2 outline-emerald-900' : ''
                } ${isSelected ? 'shadow-md ring-2 ring-emerald-900' : ''}`}
              >
                {dayNum}
              </button>
            </div>
          );
        })}
      </div>

      {selectedDate && selectedInfo && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900">{formatLongDate(selectedDate)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${BADGE_STYLES[selectedInfo.kind]}`}>
              {DAY_LABEL[selectedInfo.kind]}
            </span>
          </div>
          <p className="mt-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
            <span className="font-semibold text-slate-600">Deficit on this day</span>
            <span className={`font-extrabold ${selectedInfo.deficit > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
              {selectedInfo.deficit > 0 ? formatRupees(selectedInfo.deficit) : '₹0'}
            </span>
          </p>
          {selectedInfo.deficit > 0 && (
            <p className="mt-1.5 text-slate-600">{selectedInfo.settled ? 'Paid with a later deposit.' : 'Not paid yet. It is cleared with your next deposit.'}</p>
          )}
          {(selectedInfo.kind === 'eaten' || selectedInfo.kind === 'deficit' || selectedInfo.kind === 'stopped') && (
            <p className="mt-1.5 text-slate-500">
              Balance after this day:{' '}
              <b className="text-slate-800">
                {selectedInfo.balanceAfter < 0
                  ? `${selectedInfo.balanceAfter} day${selectedInfo.balanceAfter === -1 ? '' : 's'}`
                  : `${Math.floor(selectedInfo.balanceAfter + 1e-9)} days left`}
              </b>
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-full bg-slate-100/80 px-3 py-2 text-[11px] font-medium text-slate-600">
        <LegendDot className="bg-emerald-300 ring-1 ring-emerald-500" label="Dining Done" />
        <LegendDot className="bg-orange-300 ring-1 ring-orange-500" label="Deficit" />
        <LegendDot className="bg-amber-200 ring-1 ring-amber-400" label="Off" />
        <LegendDot className="bg-rose-400 ring-1 ring-rose-500" label="Stopped" />
        <LegendDot className="bg-white ring-1 ring-slate-400" label="Upcoming" />
      </div>
    </section>
  );
});
DiningCalendar.displayName = 'DiningCalendar';

const LegendDot: React.FC<{ className: string; label: string }> = ({ className, label }) => (
  <span className="flex items-center gap-1.5">
    <span className={`h-3 w-3 rounded-full ${className}`} />
    {label}
  </span>
);
