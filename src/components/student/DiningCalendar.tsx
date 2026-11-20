'use client';

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DayResolver,
  DayStatus,
  formatLongDate,
  monthLabel,
  parseDateKey,
  shiftMonth
} from './studentUtils';

const WEEK_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CELL_STYLES: Record<DayStatus, string> = {
  done: 'bg-emerald-200 text-emerald-950 ring-1 ring-emerald-500/70',
  off: 'bg-rose-400 text-white ring-1 ring-rose-500',
  rebate: 'bg-amber-300 text-amber-950 ring-1 ring-amber-500',
  upcoming: 'bg-white text-slate-800 ring-1 ring-slate-300',
  none: 'bg-transparent text-slate-400'
};

const STATUS_LABEL: Record<DayStatus, string> = {
  done: 'Dining done',
  off: 'Dining off',
  rebate: 'Mess off (rebate)',
  upcoming: 'Upcoming',
  none: 'No record'
};

interface DiningCalendarProps {
  monthKey: string;
  todayKey: string;
  resolve: DayResolver;
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
                aria-label={`${formatLongDate(dateKey)}: ${STATUS_LABEL[info.status]}`}
                aria-pressed={isSelected}
                className={`press relative flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold sm:h-10 sm:w-10 ${CELL_STYLES[info.status]} ${
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
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                selectedInfo.status === 'done'
                  ? 'bg-emerald-100 text-emerald-800'
                  : selectedInfo.status === 'off'
                  ? 'bg-rose-100 text-rose-800'
                  : selectedInfo.status === 'rebate'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {STATUS_LABEL[selectedInfo.status]}
            </span>
          </div>
          {selectedInfo.status === 'rebate' && selectedInfo.rebateReason && (
            <p className="mt-1.5 text-slate-600">{selectedInfo.rebateReason}</p>
          )}
          {selectedInfo.record && selectedInfo.record.guest_diets > 0 && (
            <p className="mt-1.5 font-semibold text-amber-800">Guest diets: +{selectedInfo.record.guest_diets}</p>
          )}
          {selectedInfo.status === 'done' && selectedInfo.record?.marked_by && (
            <p className="mt-1.5 text-slate-500">Marked by {selectedInfo.record.marked_by}</p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-full bg-slate-100/80 px-3 py-2 text-[11px] font-medium text-slate-600">
        <LegendDot className="bg-emerald-300 ring-1 ring-emerald-500" label="Dining Done" />
        <LegendDot className="bg-rose-400 ring-1 ring-rose-500" label="Dining Off" />
        <LegendDot className="bg-amber-300 ring-1 ring-amber-500" label="Rebate" />
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
