'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, UserCheck } from 'lucide-react';
import { AccountState, DayInfo, DayKind, formatRupees } from '@/lib/diningEngine';
import { DeficitEntry } from '@/types';
import { SESSIONS, formatLongDate, monthLabel, sessionMonths, weekdayShort } from './studentUtils';

interface LogViewProps {
  state: AccountState;
  entries: DeficitEntry[];
  todayKey: string;
  resolve: (dateKey: string) => DayInfo;
  defaultSession: string;
}

const DOT: Record<DayKind, string> = {
  eaten: 'bg-emerald-200 text-emerald-950 ring-1 ring-emerald-500/70',
  deficit: 'bg-orange-300 text-orange-950 ring-1 ring-orange-500',
  off: 'bg-amber-200 text-amber-950 ring-1 ring-amber-400',
  stopped: 'bg-rose-400 text-white ring-1 ring-rose-500',
  upcoming: 'bg-white text-slate-500 ring-1 ring-slate-300',
  break: 'bg-slate-100 text-slate-400',
  before: 'bg-transparent text-slate-300'
};

export const LogView: React.FC<LogViewProps> = ({ state, entries, todayKey, resolve, defaultSession }) => {
  const [session, setSession] = useState(defaultSession);
  const [tab, setTab] = useState<'attendance' | 'deficit'>('attendance');
  const [openMonth, setOpenMonth] = useState<string | null>(todayKey.slice(0, 7));

  const months = useMemo(() => sessionMonths(session), [session]);

  const total = useMemo(() => {
    const t = { eaten: 0, deficit: 0, off: 0, stopped: 0 };
    months.forEach((k) => {
      const m = state.months.get(k);
      if (!m) return;
      t.eaten += m.eatenDays;
      t.deficit += m.deficitDays;
      t.off += m.offDays;
      t.stopped += m.stoppedDays;
    });
    return t;
  }, [months, state]);

  const percent = total.eaten + total.off + total.stopped > 0 ? Math.round((total.eaten / (total.eaten + total.off + total.stopped)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dining Log</h2>
          <p className="text-xs text-slate-500">Days you dined and the deficit on each day</p>
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

      <div className="grid grid-cols-2 rounded-full bg-slate-200/70 p-1 text-xs font-bold">
        {(
          [
            ['attendance', 'Month-wise'],
            ['deficit', 'Deficit list']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`press rounded-full py-2 transition-colors ${tab === id ? 'bg-white text-emerald-950 shadow' : 'text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'attendance' ? (
        <div className="grid gap-4 lg:grid-cols-[19rem_1fr] lg:items-start">
          <section className="rounded-3xl bg-gradient-to-br from-[#0c5a41] via-[#0a4733] to-[#052e20] p-5 text-white shadow-lg shadow-emerald-900/25">
            <div className="flex items-center gap-2 text-emerald-200">
              <UserCheck className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Dined this session</span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-black leading-none">{total.eaten}</span>
              <span className="pb-1 text-sm font-semibold text-emerald-200">days · {percent}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-emerald-300" style={{ width: `${percent}%` }} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Mini label="On deficit" value={total.deficit} />
              <Mini label="Off" value={total.off} />
              <Mini label="Stopped" value={total.stopped} />
            </dl>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-emerald-950/5">
            <ul className="divide-y divide-slate-100">
              {months.map((key) => {
                const m = state.months.get(key);
                const open = openMonth === key;
                const hasData = Boolean(m && (m.eatenDays + m.offDays + m.stoppedDays > 0));
                const base = Math.max((m?.eatenDays ?? 0) + (m?.offDays ?? 0) + (m?.stoppedDays ?? 0), 1);

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
                          {hasData && m ? (
                            <span className="text-sm font-extrabold text-emerald-800">
                              {m.eatenDays}
                              <span className="ml-1 text-[11px] font-semibold text-slate-500">days</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">No days yet</span>
                          )}
                        </div>
                        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <span className="bg-emerald-500" style={{ width: `${((m?.coveredDays ?? 0) / base) * 100}%` }} />
                          <span className="bg-orange-400" style={{ width: `${((m?.deficitDays ?? 0) / base) * 100}%` }} />
                          <span className="bg-amber-300" style={{ width: `${((m?.offDays ?? 0) / base) * 100}%` }} />
                          <span className="bg-rose-400" style={{ width: `${((m?.stoppedDays ?? 0) / base) * 100}%` }} />
                        </div>
                        {hasData && m && (
                          <p className="mt-1.5 text-[11px] text-slate-500">
                            {m.deficitDays} on deficit · {m.offDays} off
                            {m.stoppedDays > 0 && ` · ${m.stoppedDays} stopped`}
                            {m.totalDeficit > 0 && ` · deficit ${formatRupees(m.totalDeficit)}`}
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
      ) : (
        <DeficitList state={state} entries={entries} months={months} resolve={resolve} />
      )}
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

const MonthDays: React.FC<{ monthKey: string; todayKey: string; resolve: (d: string) => DayInfo }> = ({
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
          const info = resolve(dateKey);
          return (
            <div key={dateKey} className="flex justify-center">
              <span
                title={info.deficit > 0 ? `${formatLongDate(dateKey)}: deficit ${formatRupees(info.deficit)}` : formatLongDate(dateKey)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold ${DOT[info.kind]} ${
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
        Green = dined · Orange = deficit day · Amber = off · Red = stopped
      </p>
    </div>
  );
};

/** Every day that cost a deficit, newest first, with the month's total. */
const DeficitList: React.FC<{
  state: AccountState;
  entries: DeficitEntry[];
  months: string[];
  resolve: (d: string) => DayInfo;
}> = ({ state, entries, months, resolve }) => {
  const groups = useMemo(() => {
    const monthSet = new Set(months);
    return [...months]
      .reverse()
      .map((key) => {
        const days: DayInfo[] = [];
        state.days.forEach((info, date) => {
          if (info.deficit > 0 && date.startsWith(key)) days.push(resolve(date));
        });
        days.sort((a, b) => b.date.localeCompare(a.date));
        const carried = entries.filter((e) => e.month_key === key && monthSet.has(e.month_key));
        const summary = state.months.get(key);
        return { key, days, carried, summary };
      })
      .filter((g) => g.days.length > 0 || g.carried.length > 0);
  }, [months, state, entries, resolve]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-800">Pending deficit</p>
          <p className="mt-1 text-2xl font-black text-orange-950">{formatRupees(state.pendingAmount)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Negative days</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {state.negativeDays}
            <span className="text-sm font-semibold text-slate-500"> of {state.graceLimit}</span>
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl bg-white py-10 text-center text-xs text-slate-400 shadow-sm">
          No deficit in this session. Your paid days covered every day.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-emerald-950/5">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-bold text-slate-900">{monthLabel(g.key)}</h3>
              <span className="text-xs font-extrabold text-orange-800">
                {formatRupees(g.summary?.totalDeficit ?? 0)}
                {g.summary && g.summary.pendingDeficit < g.summary.totalDeficit - 0.005 && (
                  <span className="ml-1 font-semibold text-slate-500">· {formatRupees(g.summary.pendingDeficit)} unpaid</span>
                )}
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.days.map((d) => (
                <li key={d.date} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-200">
                    <span className="text-sm font-extrabold leading-none text-slate-900">{Number(d.date.slice(8))}</span>
                    <span className="mt-0.5 text-[10px] font-medium text-slate-500">{weekdayShort(d.date)}</span>
                  </div>
                  <span className="min-w-0 flex-1 text-xs text-slate-600">
                    Eaten with no paid day left
                    <span className="block text-[11px] text-slate-400">{d.settled ? 'Paid' : 'Unpaid'}</span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-orange-700">{formatRupees(d.deficit)}</span>
                </li>
              ))}
              {g.carried.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-500">
                    Old
                  </div>
                  <span className="min-w-0 flex-1 text-xs text-slate-600">
                    {e.note || 'Carried from the old register'}
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-orange-700">{formatRupees(e.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};
