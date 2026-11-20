'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Ban, Check, Edit2, FileSpreadsheet, Printer, Receipt, Save } from 'lucide-react';
import { DiningDailyRecord, MonthlyBill, PaymentSlip, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { allocateDeficits, summarizeAccount } from '@/lib/billingUtils';
import { SlipData } from '@/lib/foodSlip';
import { CloseDiningModal } from '@/components/munshi/CloseDiningModal';
import { SlipModal } from '@/components/student/SlipModal';
import { SESSIONS, isEaten, sessionMonths, sessionOfDate, toDateKey } from '@/components/student/studentUtils';

/**
 * The Munshi's dining ledger (same layout as the Excel sheet).
 * Everything on it comes from the real records: attendance from the day-wise register,
 * payments from the food charges slips, deficits from the monthly bills.
 */

type Cell = 1 | 0 | 'SS' | 'R' | null; // eaten | not eaten | eaten with guest | mess off | no entry

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const monthTag = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]}-${String(y).slice(2)}`;
};

const slipDate = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${String(d).padStart(2, '0')}-${MONTH_SHORT[m - 1]}-${String(y).slice(2)}`;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const MunshiExcelLedger: React.FC = () => {
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [session, setSession] = useState(() => sessionOfDate(toDateKey(new Date())));

  const [records, setRecords] = useState<DiningDailyRecord[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [rate, setRate] = useState(65);
  const [reloadTick, setReloadTick] = useState(0);

  /** Cells changed by the Munshi and not saved yet: date -> 1 (eaten) or 0 (not eaten). */
  const [edits, setEdits] = useState<Record<string, 0 | 1>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [badgeInput, setBadgeInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [closeDiningOpen, setCloseDiningOpen] = useState(false);
  const [preview, setPreview] = useState<SlipData | null>(null);

  const dirty = Object.keys(edits).length > 0;

  /* ----------------------------- students ----------------------------- */

  const selectStudent = useCallback(
    (s: Student) => {
      if (selected && s.id !== selected.id && dirty && !confirm('You have unsaved attendance changes. Leave without saving?')) {
        return false;
      }
      setEdits({});
      setSelected(s);
      setBadgeInput(s.enrollment_no);
      setLookupError(null);
      setShowSuggestions(false);
      return true;
    },
    [selected, dirty]
  );

  useEffect(() => {
    DataService.getStudents().then((list) => {
      setStudents(list);
      if (list.length === 0) return;
      // A link from the Students page can open a specific resident.
      const params = new URLSearchParams(window.location.search);
      const en = params.get('en')?.toUpperCase();
      const id = params.get('student');
      const match = list.find((s) => (en && s.enrollment_no.toUpperCase() === en) || (id && s.id === id));
      const first = match ?? list[0];
      setSelected(first);
      setBadgeInput(first.enrollment_no);
    });
  }, []);

  const lookup = (raw: string) => {
    const q = raw.trim().toUpperCase();
    if (!q) {
      setLookupError('Write an enrollment number (for example GK2219).');
      return;
    }
    const found =
      students.find((s) => s.enrollment_no.toUpperCase() === q) ??
      students.find((s) => s.enrollment_no.toUpperCase().includes(q));
    if (found) selectStudent(found);
    else setLookupError(`No resident found with enrollment no. "${raw.trim()}".`);
  };

  /* ------------------------------- data ------------------------------- */

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    Promise.all([
      DataService.getAllDailyRecords({ studentId: selected.id }),
      DataService.getBillsForStudent(selected.enrollment_no),
      DataService.getPaymentSlipsForStudent(selected.enrollment_no),
      DataService.getSettings()
    ]).then(([allRecords, studentBills, studentSlips, settings]) => {
      if (cancelled) return;
      setRecords(allRecords);
      setBills(studentBills);
      setSlips(studentSlips);
      setRate(settings.diet_rate || 65);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, reloadTick]);

  const recordByDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);
  const months = useMemo(() => sessionMonths(session), [session]);

  const cellOf = useCallback(
    (dateKey: string): Cell => {
      if (dateKey in edits) return edits[dateKey];
      const rec = recordByDate.get(dateKey);
      if (!rec) return null;
      if (rec.is_rebate) return 'R';
      if (isEaten(rec)) return rec.guest_diets > 0 ? 'SS' : 1;
      return 0;
    },
    [edits, recordByDate]
  );

  const toggleCell = (dateKey: string) => {
    if (dateKey > todayKey) return; // future days are not marked yet
    const current = cellOf(dateKey);
    const next: 0 | 1 = current === 1 || current === 'SS' ? 0 : 1;

    // Back to what is already saved: not an edit any more.
    const rec = recordByDate.get(dateKey);
    const savedValue: Cell = !rec ? null : rec.is_rebate ? 'R' : isEaten(rec) ? (rec.guest_diets > 0 ? 'SS' : 1) : 0;
    const matchesSaved = (next === 1 && (savedValue === 1 || savedValue === 'SS')) || (next === 0 && savedValue === 0);

    setEdits((prev) => {
      const copy = { ...prev };
      if (matchesSaved) delete copy[dateKey];
      else copy[dateKey] = next;
      return copy;
    });
  };

  const save = async () => {
    if (!selected || !dirty) return;
    setIsSaving(true);
    try {
      const toSave: DiningDailyRecord[] = Object.entries(edits).map(([date, value]) => {
        const existing = recordByDate.get(date);
        const eaten = value === 1;
        return {
          id: `rec-${selected.id}-${date}`,
          student_id: selected.id,
          enrollment_no: selected.enrollment_no,
          guest_diets: 0,
          ...existing,
          date,
          eaten,
          lunch: eaten,
          dinner: eaten,
          is_rebate: false,
          rebate_reason: undefined,
          marked_by: 'Munshi'
        };
      });
      await DataService.updateDailyRecords(toSave);
      setEdits({});
      setReloadTick((t) => t + 1);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Could not save the ledger. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------------------- calculations --------------------------- */

  const slipsByMonth = useMemo(() => {
    const map = new Map<string, PaymentSlip[]>();
    [...slips]
      .sort((a, b) => a.paid_on.localeCompare(b.paid_on) || Number(a.slip_no) - Number(b.slip_no))
      .forEach((s) => {
        const key = s.paid_on.slice(0, 7);
        map.set(key, [...(map.get(key) ?? []), s]);
      });
    return map;
  }, [slips]);

  const billByMonth = useMemo(() => new Map(bills.map((b) => [b.month_key, b])), [bills]);
  const allocation = useMemo(() => allocateDeficits(bills, slips), [bills, slips]);
  const account = useMemo(() => summarizeAccount(bills, slips), [bills, slips]);

  const monthRows = useMemo(
    () =>
      months.map((key) => {
        const [y, m] = key.split('-').map(Number);
        const daysCount = new Date(y, m, 0).getDate();
        let eaten = 0;
        for (let d = 1; d <= daysCount; d++) {
          const c = cellOf(`${key}-${String(d).padStart(2, '0')}`);
          if (c === 1 || c === 'SS') eaten += 1;
        }
        const deficit = allocation.months.find((x) => x.bill.month_key === key);
        return { key, daysCount, eaten, bill: billByMonth.get(key), deficit, slips: slipsByMonth.get(key) ?? [] };
      }),
    [months, cellOf, allocation, billByMonth, slipsByMonth]
  );

  const sessionTotals = useMemo(() => {
    const inSession = monthRows.map((r) => r.deficit).filter((d): d is NonNullable<typeof d> => Boolean(d));
    return {
      billed: inSession.reduce((a, d) => a + d.bill.total_amount, 0),
      applied: inSession.reduce((a, d) => a + d.applied, 0),
      pending: inSession.reduce((a, d) => a + d.deficit, 0)
    };
  }, [monthRows]);

  const eatenTotal = monthRows.reduce((a, r) => a + r.eaten, 0);
  const paidInSession = monthRows.reduce((a, r) => a + r.slips.reduce((x, s) => x + s.amount, 0), 0);
  const paidDaysTotal = paidInSession / rate;
  const previousDeficit = allocation.months
    .filter((d) => d.bill.month_key < months[0])
    .reduce((a, d) => a + d.deficit, 0);

  const pendingAmount = Math.max(account.balance, 0);
  const balanceDays = Math.round((-account.balance / rate) * 10) / 10;
  const messOffDays = records.filter((r) => r.is_rebate && months.includes(r.date.slice(0, 7))).length;
  const prevSession = `${Number(session.split('-')[0]) - 1}-${Number(session.split('-')[0])}`;
  const sessionLabel = session.replace('-20', ' - ');

  const suggestions = useMemo(() => {
    const q = badgeInput.trim().toUpperCase();
    if (!q) return [];
    return students.filter((s) => s.enrollment_no.toUpperCase().includes(q)).slice(0, 8);
  }, [students, badgeInput]);

  /* -------------------------------- UI -------------------------------- */

  return (
    <div className="space-y-3">
      {/* Action strip */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2.5 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 font-serif font-bold text-slate-800">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            AMU Dining Hall Ledger
          </span>
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

        <div className="flex flex-wrap items-center gap-2">
          {selected && (
            <Link
              href={`/munshi/slips?student=${selected.id}`}
              className="press flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-emerald-950 shadow-sm"
            >
              <Receipt className="h-3.5 w-3.5" />
              Cut slip
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCloseDiningOpen(true)}
            className="press flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800"
            title="Close dining for resident (next day rule enforced)"
          >
            <Ban className="h-3.5 w-3.5 text-rose-600" />
            Close dining
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !dirty}
            className="press flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Saving…' : dirty ? `Save ${Object.keys(edits).length} change${Object.keys(edits).length > 1 ? 's' : ''}` : 'Saved'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="press flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-900">
          <Check className="h-4 w-4 text-emerald-700" />
          Attendance saved.
        </div>
      )}
      {lookupError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          {lookupError}
        </div>
      )}

      {/* The sheet */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white p-2 shadow-md sm:p-3 print:border-none print:p-0 print:shadow-none">
        {/* Top summary grid */}
        <div className="mb-2 grid min-w-[1020px] grid-cols-12 gap-1.5 border border-slate-400 bg-slate-100 p-1.5 font-sans text-slate-900">
          {/* Identity */}
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
                    if (exact) selectStudent(exact);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') lookup(badgeInput);
                  }}
                  title="Write an enrollment number to find the student"
                  placeholder="ENROLL NO"
                  aria-label="Enrollment number"
                  className="w-full cursor-text rounded bg-transparent text-center font-serif text-3xl font-black uppercase tracking-wider text-slate-100 placeholder-slate-400 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:text-4xl"
                />
                <Edit2 className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300 opacity-40 group-hover:opacity-100" />
              </div>
              <span className="font-sans text-[9px] text-slate-300 opacity-75">Write enrollment no. and press Enter</span>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded border border-slate-300 bg-white text-left text-slate-900 shadow-2xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => selectStudent(s)}
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
              <div className="text-right text-sm font-black text-slate-900">
                {selected ? `${selected.house} ${selected.room_no}` : ''}
              </div>
            </div>

            <div className="mt-1.5 border-t border-slate-300 pt-1.5 font-serif text-xs">
              <span className="font-semibold text-slate-700">En. No.</span>
              <span className="ml-2 font-mono font-black text-slate-900">{selected?.enrollment_no ?? '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-serif text-xs">
              <div>
                <span className="font-semibold text-slate-700">ROOM. No.</span>
                <span className="ml-2 font-black text-slate-900">{selected ? `${selected.house} ${selected.room_no}` : '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => setCloseDiningOpen(true)}
                className="no-print flex items-center gap-1 font-sans text-[10px] font-bold text-rose-700 underline hover:text-rose-900"
              >
                <Ban className="h-3 w-3 text-rose-600" />
                Close mess
              </button>
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
              <span className="font-serif text-3xl font-black tracking-tight drop-shadow-sm sm:text-4xl">
                {balanceDays} Days
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-300 bg-slate-100 px-3 py-1.5 font-serif text-xs font-bold text-slate-800">
              <span>MESS OFF DAYS →</span>
              <span className="font-mono text-sm">{messOffDays}</span>
            </div>
          </div>

          {/* Previous deficit + pending */}
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
              <div className="flex w-3/5 items-center bg-[#d9e1f2] p-1.5 text-[10px] font-bold leading-tight text-slate-800">
                RATE PER DAY
              </div>
              <div className="flex w-2/5 items-center justify-end bg-slate-100 p-1.5 text-right font-mono font-bold text-slate-900">
                {inr(rate)}
              </div>
            </div>
            <div className="flex border-b border-slate-300">
              <div className="flex w-2/5 items-center bg-[#b4c6e7] p-1.5 text-[11px] font-bold text-slate-900">ROOM NO</div>
              <div className="flex w-3/5 items-center justify-end truncate bg-[#d9e1f2] p-1.5 text-right text-[11px] font-bold text-slate-900">
                {selected?.previous_room || 'New allotment'}
              </div>
            </div>
            <div className="border-t border-slate-300 bg-[#c5e0b4] p-1.5 text-center">
              <div className="text-[10px] font-bold uppercase text-[#274e13]">
                {account.balance < 0 ? 'ADVANCE BALANCE' : 'TOTAL PENDING AMOUNT'}
              </div>
              <div
                className={`mt-0.5 rounded-sm px-2 py-1 font-serif text-xl font-black text-white shadow-inner sm:text-2xl ${
                  pendingAmount > 0 ? 'bg-[#c00000]' : 'bg-[#70ad47]'
                }`}
              >
                {inr(account.balance < 0 ? -account.balance : pendingAmount)}
              </div>
            </div>
          </div>

          {/* Deficit details */}
          <div className="col-span-3 flex flex-col justify-between border border-slate-400 bg-[#adb9ca] font-serif text-xs">
            <div className="border-b border-slate-400 bg-[#8faadc] py-1.5 text-center font-serif text-xs font-black tracking-wider text-slate-950">
              DEFICITE DETAILS
            </div>
            <div className="space-y-1 p-1">
              {[0, 4, 8].map((start) => (
                <div key={start} className="grid grid-cols-5 gap-1 text-center text-[10px]">
                  {monthRows.slice(start, start + 4).map((r) => (
                    <div key={r.key} className="rounded-sm bg-slate-100 p-0.5">
                      <div className="font-medium text-slate-500">{monthTag(r.key)}</div>
                      <div className="font-mono font-bold">{r.deficit ? Math.round(r.deficit.deficit) : 0}</div>
                    </div>
                  ))}
                  {start === 0 && (
                    <div className="rounded-sm bg-slate-200 p-0.5 text-[9px] font-bold">
                      <div>BILLED</div>
                      <div className="font-mono text-emerald-950">{inr(sessionTotals.billed)}</div>
                    </div>
                  )}
                  {start === 4 && (
                    <div className="rounded-sm bg-slate-200 p-0.5 text-[9px] font-bold">
                      <div>PAID</div>
                      <div className="font-mono text-slate-700">{inr(sessionTotals.applied)}</div>
                    </div>
                  )}
                  {start === 8 && (
                    <div className="flex flex-col justify-center rounded-sm bg-[#c00000] p-1 text-white">
                      <div className="text-[8px] font-extrabold uppercase leading-tight">PENDING DF</div>
                      <div className="font-mono text-xs font-black">{inr(sessionTotals.pending)}</div>
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
                <th className="w-16 border-r border-slate-300 bg-[#2f5597] p-1.5 font-serif text-white">MONTH</th>
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
                <th className="w-20 bg-[#41719c] p-1.5 text-[10px] font-bold text-white">MONTH BILL</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 text-center">
              {monthRows.map((row) => (
                <tr key={row.key}>
                  <td className="whitespace-nowrap border-r border-slate-300 bg-[#2f5597] p-1 font-serif text-xs font-bold text-white">
                    {monthTag(row.key)}
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
                    const future = dateKey > todayKey;
                    const cell = cellOf(dateKey);
                    const changed = dateKey in edits;

                    let style = 'bg-white text-slate-300 hover:bg-slate-100';
                    if (future) style = 'bg-slate-100 text-slate-300 cursor-not-allowed';
                    else if (cell === 1) style = 'bg-[#c6efce] text-[#006100] hover:bg-emerald-300';
                    else if (cell === 'SS') style = 'bg-[#c6efce] text-amber-700 hover:bg-emerald-300';
                    else if (cell === 0) style = 'bg-[#ffc7ce] text-[#9c0006] hover:bg-rose-300';
                    else if (cell === 'R') style = 'bg-amber-300 text-amber-950 hover:bg-amber-400';

                    return (
                      <td
                        key={d}
                        onClick={() => toggleCell(dateKey)}
                        title={
                          future
                            ? `${dateKey}: not marked yet`
                            : `${dateKey}: ${cell === 'R' ? 'mess off' : cell === null ? 'no entry' : cell === 0 ? 'not eaten' : 'eaten'}. Click to change`
                        }
                        className={`select-none border-r border-slate-300 p-0 font-mono text-xs font-bold ${future ? '' : 'cursor-pointer'} ${style} ${
                          changed ? 'outline outline-2 -outline-offset-2 outline-sky-500' : ''
                        }`}
                      >
                        <span className="inline-block w-full py-0.5 leading-none">{future || cell === null ? '·' : cell}</span>
                      </td>
                    );
                  })}

                  <td className="border-r-2 border-slate-400 bg-[#00b0f0] p-1 font-mono text-sm font-black text-white">{row.eaten}</td>

                  {/* Payments: the real slips of this month */}
                  <td className="border-r border-slate-300 bg-white p-1 font-mono font-semibold text-slate-800">
                    <div className="flex flex-col gap-0.5">
                      {row.slips.length === 0 ? '0.00' : row.slips.map((s) => <span key={s.id}>{(s.amount / rate).toFixed(2)}</span>)}
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
                        : row.slips.map((s) => (
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
                          ))}
                    </div>
                  </td>
                  <td className="border-r border-slate-300 bg-white p-1 font-mono text-slate-700">
                    <div className="flex flex-col gap-0.5">
                      {row.slips.length === 0 ? '—' : row.slips.map((s) => <span key={s.id}>{slipDate(s.paid_on)}</span>)}
                    </div>
                  </td>
                  <td className="bg-white p-1 font-mono font-bold text-slate-800">{row.bill ? inr(row.bill.total_amount) : '—'}</td>
                </tr>
              ))}

              <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
                <td colSpan={32} className="border-r border-slate-300 p-2 text-right font-serif text-slate-700">
                  Total Eaten Days:
                </td>
                <td className="border-r-2 border-slate-400 bg-slate-200 p-1 text-center font-mono text-sm font-black text-slate-950">
                  {eatenTotal}
                </td>
                <td className="border-r border-slate-300 bg-slate-200 p-1 text-center font-mono text-xs font-black text-slate-950">
                  {paidDaysTotal.toFixed(2)}
                </td>
                <td colSpan={4} className="bg-slate-100 p-1 pr-4 text-right font-serif text-xs text-slate-600">
                  Account balance: <span className="ml-1 font-mono text-sm font-black text-slate-900">{balanceDays} Days</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="no-print mt-3 text-[11px] text-slate-500">
          <b>1</b> eaten · <b>0</b> not eaten · <b>SS</b> eaten with guest diet · <b>R</b> mess off · <b>·</b> no entry or day not reached.
          Click a day to change it, then save. Payments come from the slips you cut; use <b>Cut slip</b> to add one.
        </p>
      </div>

      <CloseDiningModal
        isOpen={closeDiningOpen}
        onClose={() => setCloseDiningOpen(false)}
        student={selected}
        students={students}
        onSuccess={() => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 4000);
          setReloadTick((t) => t + 1);
        }}
      />

      <SlipModal data={preview} onClose={() => setPreview(null)} />
    </div>
  );
};
