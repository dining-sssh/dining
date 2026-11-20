'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, UserCheck } from 'lucide-react';
import { DiningDailyRecord } from '@/types';
import {
  DayResolver,
  DayStatus,
  MonthAttendance,
  SESSIONS,
  groupAttendanceByMonth,
  monthLabel,
  sessionMonths
} from './studentUtils';

interface LogViewProps {
  records: DiningDailyRecord[];
  todayKey: string;
  resolve: DayResolver;
  defaultSession: string;
}

const DOT: Record<DayStatus, string> = {
  done: 'bg-emerald-200 text-emerald-950 ring-1 ring-emerald-500/70',
  off: 'bg-rose-400 text-white ring-1 ring-rose-500',
  rebate: 'bg-amber-300 text-amber-950 ring-1 ring-amber-500',
  upcoming: 'bg-white text-slate-500 ring-1 ring-slate-300',
  none: 'bg-transparent text-slate-300'
};

const EMPTY: MonthAttendance = { present: 0, absent: 0, rebate: 0, guests: 0, recorded: 0 };

export const LogView: React.FC<LogViewProps> = ({ records, todayKey, resolve, defaultSession }) => {
  const [session, setSession] = useState(defaultSession);
  const [openMonth, setOpenMonth] = useState<string | null>(todayKey.slice(0, 7));

  const byMonth = useMemo(() => groupAttendanceByMonth(records), [records]);
  const months = useMemo(() => sessionMonths(session), [session]);

  const total = useMemo(() => {
    const t = { ...EMPTY };
    months.forEach((k) => {
      const m = byMonth.get(k);
      if (!m) return;
      t.present += m.present;
      t.absent += m.absent;
      t.rebate += m.rebate;
      t.guests += m.guests;
      t.recorded += m.recorded;
    });
    return t;
  }, [months, byMonth]);

  const countable = total.present + total.absent;
  const percent = countable ? Math.round((total.present / countable) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dining Log</h2>
          <p className="text-xs text-slate-500">Month-wise attendance marked by the Munshi</p>
        </div>
        <div className="relative shrink-0">
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            aria-label="Session"
            className="cursor-pointer appearance-none rounded-full border border-slate-300 bg-white py-2 pl-3.5 pr-8 text-xs font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {SESSIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-700" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[19rem_1fr] lg:items-start">
        {/* Session total */}
        <section className="rounded-3xl bg-gradient-to-br from-[#0c5a41] via-[#0a4733] to-[#052e20] p-5 text-white shadow-lg shadow-emerald-900/25">
          <div className="flex items-center gap-2 text-emerald-200">
            <UserCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Present this session</span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-5xl font-black leading-none">{total.present}</span>
            <span className="pb-1 text-sm font-semibold text-emerald-200">days · {percent}%</span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-emerald-300" style={{ width: `${percent}%` }} />
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Mini label="Absent" value={total.absent} />
            <Mini label="Mess off" value={total.rebate} />
            <Mini label="Guest diets" value={total.guests} />
          </dl>
        </section>

        {/* Month-wise */}
        <section className="overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-emerald-950/5">
          <ul className="divide-y divide-slate-100">
            {months.map((key) => {
              const m = byMonth.get(key);
              const open = openMonth === key;
              const hasData = Boolean(m && m.recorded > 0);
              const stats = m ?? EMPTY;
              const base = Math.max(stats.recorded, 1);

              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={!hasData}
                    onClick={() => setOpenMonth(open ? null : key)}
                    aria-expanded={open}
                    className="press flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{monthLabel(key)}</span>
                        {hasData ? (
                          <span className="text-sm font-extrabold text-emerald-800">
                            {stats.present}
                            <span className="ml-1 text-[11px] font-semibold text-slate-500">present</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">No records</span>
                        )}
                      </div>
                      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span className="bg-emerald-500" style={{ width: `${(stats.present / base) * 100}%` }} />
                        <span className="bg-rose-400" style={{ width: `${(stats.absent / base) * 100}%` }} />
                        <span className="bg-amber-400" style={{ width: `${(stats.rebate / base) * 100}%` }} />
                      </div>
                      {hasData && (
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          {stats.absent} absent · {stats.rebate} mess off
                          {stats.guests > 0 && ` · ${stats.guests} guest diets`}
                        </p>
                      )}
                    </div>
                    {hasData &&
                      (open ? (
                        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                      ))}
                  </button>

                  {open && hasData && <MonthDays monthKey={key} todayKey={todayKey} resolve={resolve} />}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
};

const Mini: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl bg-white/10 px-2 py-2">
    <dd className="text-lg font-extrabold leading-none">{value}</dd>
    <dt className="mt-1 text-[10px] font-medium text-emerald-100">{label}</dt>
  </div>
);

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MonthDays: React.FC<{ monthKey: string; todayKey: string; resolve: DayResolver }> = ({
  monthKey,
  todayKey,
  resolve
}) => {
  const [y, m] = monthKey.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();

  return (
    <div className="fade-enter bg-slate-50/70 px-4 pb-4 pt-1">
      <div className="mx-auto grid max-w-xs grid-cols-7 gap-y-1.5 text-center">
        {WEEK.map((w, i) => (
          <div key={i} className="text-[10px] font-semibold text-slate-400">
            {w}
          </div>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const dateKey = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
          const status = resolve(dateKey).status;
          return (
            <div key={dateKey} className="flex justify-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold ${DOT[status]} ${
                  dateKey === todayKey ? 'outline outline-2 outline-offset-1 outline-emerald-900' : ''
                }`}
              >
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-500">
        Green = present · Red = absent · Amber = mess off
      </p>
    </div>
  );
};
