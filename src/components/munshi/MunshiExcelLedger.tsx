'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Edit2, FileSpreadsheet, Printer } from 'lucide-react';
import { PaymentSlip, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { DAILY_RATE, DayInfo, DayKind, dayInfoFor, formatDays, formatRupees, simulateAccount } from '@/lib/diningEngine';
import { isPrintableSlip, paymentLabel } from '@/lib/billingUtils';
import { SlipData } from '@/lib/foodSlip';
import { useAdminData } from '@/components/admin/AdminData';
import { SlipModal } from '@/components/student/SlipModal';
import { SESSIONS, formatLongDate, monthTag, sessionMonths, sessionOfDate, weekdayShort } from '@/components/student/studentUtils';

/**
 * The Munshi's dining ledger (same layout as the Excel sheet), for reading only.
 * The Munshi searches a student by enrollment number; nothing on this sheet can be edited.
 * Attendance, deficits and payments all come from the dining engine and the food charges slips.
 */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const slipDate = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${String(d).padStart(2, '0')}-${MONTH_SHORT[m - 1]}-${String(y).slice(2)}`;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const CELL: Record<DayKind, { code: string; style: string }> = {
  eaten: { code: '1', style: 'bg-[#c6efce] text-[#006100]' },
  deficit: { code: 'N', style: 'bg-orange-300 text-orange-950' },
  off: { code: 'O', style: 'bg-amber-200 text-amber-950' },
  stopped: { code: 'S', style: 'bg-[#ffc7ce] text-[#9c0006]' },
  closed: { code: 'C', style: 'bg-sky-100 text-sky-800' },
  upcoming: { code: '·', style: 'bg-slate-100 text-slate-300' },
  break: { code: '·', style: 'bg-slate-100 text-slate-300' },
  before: { code: '·', style: 'bg-white text-slate-300' }
};

export const MunshiExcelLedger: React.FC = () => {
  const { students, accounts, slips, requests, entries, extensions, closedDays, todayKey, reload } = useAdminData();

  const [selected, setSelected] = useState<Student | null>(null);
  const [session, setSession] = useState(() => sessionOfDate(todayKey));
  const [badgeInput, setBadgeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [preview, setPreview] = useState<SlipData | null>(null);

  const handleDeleteSlip = async (slip: PaymentSlip) => {
    if (!selected) return;
    const slipLabel = `Slip No. ${slip.slip_no} (${formatRupees(slip.amount)}) for ${selected.name}`;
    if (
      !window.confirm(
        `Revoke and delete slip ${slipLabel}?\n\nThis will permanently delete the slip and remove the credited days from the student's dining account.`
      )
    ) {
      return;
    }
    try {
      await DataService.deletePaymentSlip(slip.id);
      setPreview(null);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not revoke slip.');
    }
  };

  // Open the student from a link (?en=GQ0103), otherwise the first student.
  useEffect(() => {
    if (selected || students.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const en = params.get('en')?.toUpperCase();
    const id = params.get('student');
    const match = students.find((s) => (en && s.enrollment_no.toUpperCase() === en) || (id && s.id === id));
    const first = match ?? students[0];
    setSelected(first);
    setBadgeInput(first.enrollment_no);
  }, [students, selected]);

  const select = (s: Student) => {
    setSelected(s);
    setBadgeInput(s.enrollment_no);
    setLookupError(null);
    setShowSuggestions(false);
    setOpenMonth(null);
  };

  const lookup = (raw: string) => {
    const q = raw.trim().toUpperCase();
    if (!q) {
      setLookupError('Write an enrollment number (for example GK2219).');
      return;
    }
    const found =
      students.find((s) => s.enrollment_no.toUpperCase() === q) ??
      students.find((s) => s.enrollment_no.toUpperCase().includes(q));
    if (found) select(found);
    else setLookupError(`No resident found with enrollment no. "${raw.trim()}".`);
  };

  const suggestions = useMemo(() => {
    const q = badgeInput.trim().toUpperCase();
    if (!q) return [];
    return students.filter((s) => s.enrollment_no.toUpperCase().includes(q)).slice(0, 8);
  }, [students, badgeInput]);

  const currentSession = useMemo(() => sessionOfDate(todayKey), [todayKey]);
  const [pastHistory, setPastHistory] = useState<{
    studentId: string;
    requests: typeof requests;
    slips: typeof slips;
    extensions: typeof extensions;
  } | null>(null);

  // When viewing a past session, fetch only the selected student's full history on demand.
  useEffect(() => {
    if (!selected || session === currentSession) return;
    if (pastHistory?.studentId === selected.id) return;
    let cancelled = false;
    Promise.all([
      DataService.getDiningRequests({ studentId: selected.id }),
      DataService.getPaymentSlips({ studentId: selected.id }),
      DataService.getGraceExtensions({ studentId: selected.id })
    ]).then(([rq, sl, ex]) => {
      if (!cancelled) setPastHistory({ studentId: selected.id, requests: rq, slips: sl, extensions: ex });
    });
    return () => {
      cancelled = true;
    };
  }, [selected, session, currentSession, pastHistory?.studentId]);

  const activeHistory = session !== currentSession && pastHistory?.studentId === selected?.id ? pastHistory : null;
  const studentSlips = useMemo(
    () => (activeHistory ? activeHistory.slips : selected ? slips.filter((s) => s.student_id === selected.id) : []),
    [activeHistory, slips, selected]
  );
  const studentRequests = useMemo(
    () => (activeHistory ? activeHistory.requests : selected ? requests.filter((r) => r.student_id === selected.id) : []),
    [activeHistory, requests, selected]
  );
  const studentExtensions = useMemo(
    () => (activeHistory ? activeHistory.extensions : selected ? extensions.filter((e) => e.student_id === selected.id) : []),
    [activeHistory, extensions, selected]
  );

  const state = useMemo(() => {
    if (!selected) return undefined;
    if (session === currentSession) return accounts.get(selected.id);
    // When viewing a past session, simulate that session's August–May window independently.
    const startYear = Number(session.split('-')[0]);
    const sessionStart = `${startYear}-08-01`;
    const sessionEnd = `${startYear + 1}-05-31`;
    return simulateAccount({
      student: { dining_from: sessionStart },
      requests: studentRequests,
      slips: studentSlips,
      extensions: studentExtensions,
      entries: entries.filter((e) => e.student_id === selected.id),
      closedDates: closedDays.map((c) => c.day),
      todayKey: sessionEnd < todayKey ? sessionEnd : todayKey
    });
  }, [selected, session, currentSession, accounts, studentRequests, studentSlips, studentExtensions, entries, closedDays, todayKey]);

  const months = useMemo(() => sessionMonths(session), [session]);

  const slipsByMonth = useMemo(() => {
    const map = new Map<string, PaymentSlip[]>();
    [...studentSlips]
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on) || Number(a.slip_no) - Number(b.slip_no))
      .forEach((s) => {
        const key = s.paid_on.slice(0, 7);
        map.set(key, [...(map.get(key) ?? []), s]);
      });
    return map;
  }, [studentSlips]);

  const infoFor = (date: string): DayInfo | null => (state ? dayInfoFor(state, studentRequests, date) : null);

  const monthRows = useMemo(
    () =>
      months.map((key) => {
        const [y, m] = key.split('-').map(Number);
        return { key, daysCount: new Date(y, m, 0).getDate(), summary: state?.months.get(key), slips: slipsByMonth.get(key) ?? [] };
      }),
    [months, state, slipsByMonth]
  );

  const totals = useMemo(() => {
    let eaten = 0;
    let deficit = 0;
    let pending = 0;
    let paidInSession = 0;
    monthRows.forEach((r) => {
      eaten += r.summary?.eatenDays ?? 0;
      deficit += r.summary?.totalDeficit ?? 0;
      pending += r.summary?.pendingDeficit ?? 0;
      paidInSession += r.slips.reduce((a, s) => a + s.amount, 0);
    });
    return { eaten, deficit, pending, paidInSession };
  }, [monthRows]);

  const previousDeficit = useMemo(() => {
    if (!state) return 0;
    let sum = 0;
    state.months.forEach((m) => {
      if (m.key < months[0]) sum += m.pendingDeficit;
    });
    return sum;
  }, [state, months]);

  const prevSession = `${Number(session.split('-')[0]) - 1}-${Number(session.split('-')[0])}`;
  const sessionLabel = session.replace('-20', ' - ');
  const balanceDays = state
    ? state.balanceDays < 0
      ? -Math.floor(Math.abs(state.balanceDays) + 1e-9)
      : Math.floor(state.balanceDays + 1e-9)
    : 0;

  return (
    <div className="space-y-3">
      {/* Action strip: reading controls only */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-serif font-bold text-slate-800">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            AMU Dining Hall Ledger
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-500">Read only</span>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            aria-label="Session"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {SESSIONS.map((s) => (
              <option key={s.value} value={s.value}>
                Session {s.value}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="press flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" />
          Print
        </button>
      </div>

      {lookupError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          {lookupError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white p-2 shadow-md sm:p-3 print:border-none print:p-0 print:shadow-none">
        {/* Top summary grid */}
        <div className="mb-2 grid min-w-[1020px] grid-cols-12 gap-1.5 border border-slate-400 bg-slate-100 p-1.5 font-sans text-slate-900">
          {/* Identity (the only thing that can be typed: the enrollment number to search) */}
          <div className="relative col-span-4 flex flex-col justify-between border border-slate-400 bg-[#e2efda] p-3">
            <div className="group relative flex flex-col items-center justify-center rounded-sm bg-[#595959] px-3 py-1.5 text-center text-white shadow-inner">
              <div className="relative flex w-full items-center justify-center">
                <input
                  type="text"
                  value={badgeInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setBadgeInput(val);
                    setShowSuggestions(true);
                    setLookupError(null);
                    const exact = students.find((s) => s.enrollment_no.toUpperCase() === val.trim());
                    if (exact) select(exact);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') lookup(badgeInput);
                  }}
                  title="Write an enrollment number to find the student"
                  placeholder="ENROLL NO"
                  aria-label="Search by enrollment number"
                  className="w-full cursor-text rounded bg-transparent text-center font-serif text-3xl font-black uppercase tracking-wider text-slate-100 placeholder-slate-400 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:text-4xl"
                />
                <Edit2 className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300 opacity-40 group-hover:opacity-100" />
              </div>
              <span className="font-sans text-[9px] text-slate-300 opacity-75">Search by enrollment no. and press Enter</span>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded border border-slate-300 bg-white text-left text-slate-900 shadow-2xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => select(s)}
                      className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-xs last:border-b-0 hover:bg-emerald-50"
                    >
                      <span className="font-mono font-black text-emerald-800">{s.enrollment_no}</span>
                      <span className="font-semibold text-slate-800">{s.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {s.house} {s.room_no}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h2 className="mt-2.5 font-serif text-xl font-black tracking-wide text-[#1e293b] sm:text-2xl">
              {selected ? selected.name.toUpperCase() : 'SELECT A STUDENT'}
            </h2>

            <div className="mt-2 flex items-center justify-between font-serif text-sm">
              <div>
                <span className="font-semibold text-slate-700">Course</span>
                <span className="ml-2 font-black text-slate-900">{selected?.course ?? '—'}</span>
              </div>
              <div className="text-right text-sm font-black text-slate-900">{selected ? `${selected.house} ${selected.room_no}` : ''}</div>
            </div>

            <div className="mt-1.5 border-t border-slate-300 pt-1.5 font-serif text-xs">
              <span className="font-semibold text-slate-700">En. No.</span>
              <span className="ml-2 font-mono font-black text-slate-900">{selected?.enrollment_no ?? '—'}</span>
            </div>
            <div className="mt-1 font-serif text-xs">
              <span className="font-semibold text-slate-700">ROOM. No.</span>
              <span className="ml-2 font-black text-slate-900">{selected ? `${selected.house} ${selected.room_no}` : '—'}</span>
              {selected?.remarks && <span className="ml-3 italic text-slate-600">“{selected.remarks}”</span>}
            </div>
          </div>

          {/* Current balance */}
          <div className="col-span-3 flex flex-col justify-between border border-slate-400 bg-white">
            <div className="border-b border-slate-400 bg-[#e2efda] py-2 text-center font-serif text-xs font-black text-[#274e13] sm:text-sm">
              CURRENT BAL. {sessionLabel} ↓
            </div>
            <div
              className={`flex flex-1 items-center justify-center p-4 text-center text-white ${
                balanceDays < 0 ? 'bg-[#c00000]' : balanceDays > 0 ? 'bg-[#385723]' : 'bg-slate-700'
              }`}
            >
              <span className="font-serif text-3xl font-black tracking-tight drop-shadow-sm sm:text-4xl">{balanceDays} Days</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-300 bg-slate-100 px-3 py-1.5 font-serif text-xs font-bold text-slate-800">
              <span>DINING TODAY →</span>
              <span className="font-mono text-sm capitalize">{state ? state.status : '—'}</span>
            </div>
          </div>

          {/* Pending deficit */}
          <div className="col-span-2 flex flex-col justify-between border border-slate-400 bg-white font-serif text-xs">
            <div className="flex border-b border-slate-300">
              <div className="flex w-3/5 items-center bg-[#b4c6e7] p-1.5 text-[11px] font-bold leading-tight text-[#1f4e78]">
                DEFICIT {prevSession.replace('-20', ' - ')}
              </div>
              <div className="flex w-2/5 items-center justify-end bg-[#d9e1f2] p-1.5 text-right font-mono font-bold text-slate-900">
                {inr(previousDeficit)}
              </div>
            </div>
            <div className="flex border-b border-slate-300">
              <div className="flex w-3/5 items-center bg-[#d9e1f2] p-1.5 text-[10px] font-bold leading-tight text-slate-800">PER DAY</div>
              <div className="flex w-2/5 items-center justify-end bg-slate-100 p-1.5 text-right font-mono text-[11px] font-bold text-slate-900">
                ₹{DAILY_RATE.toFixed(2)}
              </div>
            </div>
            <div className="flex border-b border-slate-300">
              <div className="flex w-2/5 items-center bg-[#b4c6e7] p-1.5 text-[11px] font-bold text-slate-900">PREV</div>
              <div className="flex w-3/5 items-center justify-end truncate bg-[#d9e1f2] p-1.5 text-right text-[11px] font-bold text-slate-900">
                {[selected?.previous_house, selected?.previous_room].filter(Boolean).join(' · ') || 'New allotment'}
              </div>
            </div>
            <div className="border-t border-slate-300 bg-[#c5e0b4] p-1.5 text-center">
              <div className="text-[10px] font-bold uppercase text-[#274e13]">TOTAL PENDING DEFICIT</div>
              <div
                className={`mt-0.5 rounded-sm px-2 py-1 font-serif text-xl font-black text-white shadow-inner sm:text-2xl ${
                  state && state.pendingAmount > 0.005 ? 'bg-[#c00000]' : 'bg-[#70ad47]'
                }`}
              >
                {inr(state?.pendingAmount ?? 0)}
              </div>
            </div>
          </div>

          {/* Deficit details: the total deficit of every month */}
          <div className="col-span-3 flex flex-col justify-between border border-slate-400 bg-[#adb9ca] font-serif text-xs">
            <div className="border-b border-slate-400 bg-[#8faadc] py-1.5 text-center font-serif text-xs font-black tracking-wider text-slate-950">
              DEFICITE DETAILS
            </div>
            <div className="space-y-1 p-1">
              {[0, 4, 8].map((start) => (
                <div key={start} className="grid grid-cols-5 gap-1 text-center text-[10px]">
                  {[0, 1, 2, 3].map((i) => {
                    const r = monthRows[start + i];
                    if (!r) return <div key={i} className="rounded-sm bg-slate-100/40 p-0.5" />;
                    const unpaid = (r.summary?.pendingDeficit ?? 0) > 0.005;
                    return (
                      <div key={r.key} className={`rounded-sm p-0.5 ${unpaid ? 'bg-orange-100' : 'bg-slate-100'}`} title={unpaid ? 'Some of this is unpaid' : undefined}>
                        <div className="font-medium text-slate-500">{monthTag(r.key)}</div>
                        <div className="font-mono font-bold">{Math.round(r.summary?.totalDeficit ?? 0)}</div>
                      </div>
                    );
                  })}
                  {start === 0 && (
                    <div className="rounded-sm bg-slate-200 p-0.5 text-[9px] font-bold">
                      <div>TOTAL D/F</div>
                      <div className="font-mono text-emerald-950">{inr(totals.deficit)}</div>
                    </div>
                  )}
                  {start === 4 && (
                    <div className="rounded-sm bg-slate-200 p-0.5 text-[9px] font-bold">
                      <div>PAID D/F</div>
                      <div className="font-mono text-slate-700">{inr(Math.max(totals.deficit - totals.pending, 0))}</div>
                    </div>
                  )}
                  {start === 8 && (
                    <div className="flex flex-col justify-center rounded-sm bg-[#c00000] p-1 text-white">
                      <div className="text-[8px] font-extrabold uppercase leading-tight">PENDING DF</div>
                      <div className="font-mono text-xs font-black">{inr(totals.pending)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main table */}
        <div className="min-w-[1020px] overflow-hidden border-2 border-slate-400 font-sans text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th colSpan={33} className="border-r-2 border-white bg-[#1f4e78] py-2 text-center font-serif text-sm font-black tracking-widest text-white">
                  EATEN DETAILS
                </th>
                <th colSpan={5} className="bg-[#00b0f0] py-2 text-center font-serif text-sm font-black tracking-widest text-white">
                  PAYMENTS DETAILS
                </th>
              </tr>
              <tr className="border-b-2 border-slate-400 text-center font-bold">
                <th className="w-20 border-r border-slate-300 bg-[#2f5597] p-1.5 font-serif text-white">MONTH</th>
                {DAYS.map((d) => (
                  <th key={d} className="w-6 border-r border-slate-300 bg-[#e2efda] p-0.5 font-mono text-[11px] text-[#375623]">
                    {d}
                  </th>
                ))}
                <th className="w-14 border-r-2 border-slate-400 bg-[#00b0f0] p-1.5 font-serif text-[11px] font-black text-white">TOTAL DAYS</th>
                <th className="w-14 border-r border-slate-300 bg-[#ed7d31] p-1.5 text-[10px] font-bold text-white">DAYS</th>
                <th className="w-20 border-r border-slate-300 bg-[#ed7d31] p-1.5 text-[10px] font-bold text-white">AMOUNT</th>
                <th className="w-24 border-r border-slate-300 bg-[#ed7d31] p-1.5 text-[10px] font-bold text-white">SLIP NO.</th>
                <th className="w-20 border-r border-slate-300 bg-[#ed7d31] p-1.5 text-[10px] font-bold text-white">SLIP DATE</th>
                <th className="w-24 bg-[#41719c] p-1.5 text-[10px] font-bold text-white">MONTH DEFICIT</th>
              </tr>
            </thead>

            <tbody className="text-center">
              {monthRows.map((row) => {
                const open = openMonth === row.key;
                const deficitDays: DayInfo[] = [];
                if (open && state) {
                  state.days.forEach((info, date) => {
                    if (info.deficit > 0 && date.startsWith(row.key)) deficitDays.push(info);
                  });
                  deficitDays.sort((a, b) => a.date.localeCompare(b.date));
                }
                const carried = open && selected ? row.summary?.carriedDeficit ?? 0 : 0;

                return (
                  <React.Fragment key={row.key}>
                    <tr className="border-t border-slate-300">
                      <td className="whitespace-nowrap border-r border-slate-300 bg-[#2f5597] p-0 font-serif text-xs font-bold text-white">
                        <button
                          type="button"
                          onClick={() => setOpenMonth(open ? null : row.key)}
                          aria-expanded={open}
                          title="Click to see the deficit of every day of this month"
                          className="press flex w-full items-center justify-center gap-1 px-1.5 py-1.5 hover:bg-[#3d68b8]"
                        >
                          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {monthTag(row.key)}
                        </button>
                      </td>

                      {DAYS.map((d) => {
                        if (d > row.daysCount) {
                          return (
                            <td key={d} className="select-none border-r border-slate-200 bg-slate-200/50 p-0 text-slate-300">
                              ·
                            </td>
                          );
                        }
                        const dateKey = `${row.key}-${String(d).padStart(2, '0')}`;
                        const info = infoFor(dateKey);
                        const kind: DayKind = info?.kind ?? 'before';
                        const cell = CELL[kind];
                        return (
                          <td
                            key={d}
                            title={
                              info
                                ? `${formatLongDate(dateKey)}: ${kind}${info.deficit > 0 ? `, deficit ${formatRupees(info.deficit)}` : ''}`
                                : formatLongDate(dateKey)
                            }
                            className={`select-none border-r border-slate-300 p-0 font-mono text-xs font-bold ${cell.style}`}
                          >
                            <span className="inline-block w-full py-0.5 leading-none">{cell.code}</span>
                          </td>
                        );
                      })}

                      <td className="border-r-2 border-slate-400 bg-[#00b0f0] p-1 font-mono text-sm font-black text-white">
                        {row.summary?.eatenDays ?? 0}
                      </td>

                      <td className="border-r border-slate-300 bg-white p-1 font-mono font-semibold text-slate-800">
                        <div className="flex flex-col gap-0.5">
                          {row.slips.length === 0
                            ? '0'
                            : row.slips.map((s) => (
                                <span key={s.id}>
                                  {Math.floor((state?.slipResults.get(s.id)?.creditedDays ?? s.amount / DAILY_RATE) + 1e-9)}
                                </span>
                              ))}
                        </div>
                      </td>
                      <td className="border-r border-slate-300 bg-white p-1 font-mono font-semibold text-slate-800">
                        <div className="flex flex-col gap-0.5">
                          {row.slips.length === 0 ? '₹0' : row.slips.map((s) => <span key={s.id}>{inr(s.amount)}</span>)}
                        </div>
                      </td>
                      <td className="border-r border-slate-300 bg-white p-1 font-mono text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          {row.slips.length === 0
                            ? '—'
                            : row.slips.map((s) =>
                                isPrintableSlip(s) ? (
                                  <button
                                    key={s.id}
                                    type="button"
                                    disabled={!selected}
                                    onClick={() => selected && setPreview({ slip: s, student: selected })}
                                    title="Open this slip"
                                    className="press font-semibold text-sky-800 underline decoration-dotted underline-offset-2"
                                  >
                                    {s.book_no}/{s.slip_no}
                                  </button>
                                ) : (
                                  <span key={s.id} className="font-semibold text-slate-600" title={s.note ?? undefined}>
                                    {s.mode === 'online' ? 'ONLINE' : 'ADJUST'}
                                  </span>
                                )
                              )}
                        </div>
                      </td>
                      <td className="border-r border-slate-300 bg-white p-1 font-mono text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          {row.slips.length === 0 ? '—' : row.slips.map((s) => <span key={s.id}>{slipDate(s.paid_on)}</span>)}
                        </div>
                      </td>
                      <td
                        className={`p-1 font-mono font-bold ${
                          (row.summary?.pendingDeficit ?? 0) > 0.005 ? 'bg-orange-100 text-orange-900' : 'bg-white text-slate-800'
                        }`}
                      >
                        {row.summary ? inr(row.summary.totalDeficit) : '—'}
                      </td>
                    </tr>

                    {open && (
                      <tr className="bg-amber-50/70">
                        <td colSpan={38} className="border-t border-slate-300 px-4 py-3 text-left">
                          <p className="mb-2 font-serif text-sm font-black text-slate-900">
                            {monthTag(row.key)} · deficit day by day
                            <span className="ml-2 font-sans text-[11px] font-semibold text-slate-500">
                              {formatRupees(DAILY_RATE)} for each day eaten with no paid day left
                            </span>
                          </p>
                          {deficitDays.length === 0 && carried === 0 ? (
                            <p className="text-xs text-slate-500">No deficit this month.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {deficitDays.map((d) => (
                                <span
                                  key={d.date}
                                  className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800"
                                >
                                  {Number(d.date.slice(8))} {weekdayShort(d.date)} ·{' '}
                                  <b className="text-orange-700">{formatRupees(d.deficit)}</b>
                                  <span className={d.settled ? ' text-emerald-700' : ' text-rose-700'}> {d.settled ? 'paid' : 'unpaid'}</span>
                                </span>
                              ))}
                              {carried > 0 && (
                                <span className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                                  Old register · <b className="text-orange-700">{formatRupees(carried)}</b>
                                </span>
                              )}
                            </div>
                          )}
                          <p className="mt-2 text-xs font-bold text-slate-800">
                            Total monthly deficit: {formatRupees(row.summary?.totalDeficit ?? 0)}
                            <span className="ml-2 font-semibold text-slate-500">
                              unpaid {formatRupees(row.summary?.pendingDeficit ?? 0)}
                            </span>
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
                <td colSpan={32} className="border-r border-slate-300 p-2 text-right font-serif text-slate-700">
                  Total Eaten Days:
                </td>
                <td className="border-r-2 border-slate-400 bg-slate-200 p-1 text-center font-mono text-sm font-black text-slate-950">{totals.eaten}</td>
                <td className="border-r border-slate-300 bg-slate-200 p-1 text-center font-mono text-xs font-black text-slate-950">
                  {Math.floor(totals.paidInSession / DAILY_RATE + 1e-9)}
                </td>
                <td colSpan={4} className="bg-slate-100 p-1 pr-4 text-right font-serif text-xs text-slate-600">
                  Account balance: <span className="ml-1 font-mono text-sm font-black text-slate-900">{formatDays(balanceDays)} Days</span>
                  <span className="ml-3">
                    Total pending deficit:{' '}
                    <span className="font-mono text-sm font-black text-rose-700">{inr(state?.pendingAmount ?? 0)}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="no-print mt-3 text-[11px] text-slate-500">
          <b>1</b> dined · <b>N</b> negative day (dined on deficit) · <b>O</b> dining off · <b>S</b> dining stopped (grace used up) · <b>C</b> hall closed ·{' '}
          <b>·</b> no dining that day. Click a month to see its deficit day by day. This sheet is read only; payments are added with{' '}
          <b>Cut Slip</b>.
        </p>
      </div>

      <SlipModal data={preview} onClose={() => setPreview(null)} onDelete={handleDeleteSlip} />
    </div>
  );
};
