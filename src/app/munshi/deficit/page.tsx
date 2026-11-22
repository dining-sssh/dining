'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Receipt } from 'lucide-react';
import { DataService } from '@/lib/dataService';
import { DAILY_RATE, DayInfo, formatDays, formatRupees } from '@/lib/diningEngine';
import { useAdminData } from '@/components/admin/AdminData';
import { diningLabel } from '@/components/admin/studentStatus';
import { BTN_ACCENT, BTN_PRIMARY, Card, EmptyState, INPUT, PageHeader, Pill } from '@/components/admin/ui';
import { StudentPicker } from '@/components/munshi/StudentPicker';
import { formatLongDate, monthLabel, weekdayShort } from '@/components/student/studentUtils';

function DeficitView() {
  const { students, accounts, entries, reload, todayKey } = useAdminData();
  const params = useSearchParams();
  const preset = params.get('en');

  const [studentId, setStudentId] = useState<string | null>(null);
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!preset || studentId) return;
    const found = students.find((s) => s.enrollment_no.toUpperCase() === preset.toUpperCase());
    if (found) setStudentId(found.id);
  }, [preset, students, studentId]);

  const student = students.find((s) => s.id === studentId) ?? null;
  const state = student ? accounts.get(student.id) : undefined;

  // Students who are at zero, on grace, stopped or still owe something.
  const attention = useMemo(
    () =>
      students
        .map((s) => ({ student: s, state: accounts.get(s.id) }))
        .filter(
          (x) =>
            x.student.status === 'active' &&
            x.state &&
            (x.state.negativeDays > 0 || x.state.status === 'stopped' || x.state.pendingAmount > 0.005 || (x.state.status === 'on' && x.state.wallet <= 1e-9))
        )
        .sort(
          (a, b) =>
            (b.state?.negativeDays ?? 0) - (a.state?.negativeDays ?? 0) || (b.state?.pendingAmount ?? 0) - (a.state?.pendingAmount ?? 0)
        ),
    [students, accounts]
  );

  const monthGroups = useMemo(() => {
    if (!state) return [];
    const groups = new Map<string, DayInfo[]>();
    state.days.forEach((info, date) => {
      if (info.deficit > 0) groups.set(date.slice(0, 7), [...(groups.get(date.slice(0, 7)) ?? []), info]);
    });
    const carried = entries.filter((e) => e.student_id === student?.id);
    carried.forEach((e) => {
      if (!groups.has(e.month_key)) groups.set(e.month_key, []);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, days]) => ({
        key,
        days: days.sort((a, b) => b.date.localeCompare(a.date)),
        carried: carried.filter((e) => e.month_key === key),
        summary: state.months.get(key)
      }));
  }, [state, entries, student]);

  const addCarried = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const value = Number(amount);
    if (!month) return setError('Choose the month.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount above zero.');
    setSaving(true);
    setError('');
    try {
      await DataService.addDeficitEntry({
        student_id: student.id,
        enrollment_no: student.enrollment_no,
        month_key: month,
        amount: value,
        note: note.trim() || 'Carried from the old register'
      });
      setAmount('');
      setNote('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Deficit (per day)"
        subtitle={`Every day eaten with no paid day left costs ${formatRupees(DAILY_RATE)} (₹1400 ÷ 30)`}
      />

      <Card className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Needs attention ({attention.length})</h2>
        {attention.length === 0 ? (
          <EmptyState>Every active student has paid days left.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {attention.map(({ student: s, state: st }) => {
              const label = diningLabel(s, st);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-3.5 py-3">
                  <button type="button" onClick={() => setStudentId(s.id)} className="press min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-slate-900">{s.name}</span>
                    <span className="block truncate font-mono text-xs text-slate-500">
                      {s.enrollment_no} · {s.house}
                      {s.room_no}
                    </span>
                  </button>
                  <Pill tone={label.tone}>{label.text}</Pill>
                  <span className="w-20 text-right text-sm font-extrabold text-slate-900">
                    {st && st.negativeDays > 0 ? `-${st.negativeDays}` : formatDays(st?.wallet ?? 0)} d
                  </span>
                  <span className="w-24 text-right text-sm font-extrabold text-rose-700">{formatRupees(st?.pendingAmount ?? 0)}</span>
                  <Link href={`/munshi/slips?student=${s.id}`} className="press rounded-full bg-amber-400 p-2 text-emerald-950" aria-label={`Cut slip for ${s.name}`}>
                    <Receipt className="h-4 w-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Look up one student</h2>
        <StudentPicker students={students} selectedId={studentId} onSelect={(s) => setStudentId(s?.id ?? null)} />

        {student && state && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-50 p-2.5">
                <p className="text-[10px] font-semibold text-slate-500">Balance</p>
                <p className="text-sm font-extrabold text-slate-900">
                  {state.negativeDays > 0 ? `-${state.negativeDays}` : formatDays(state.wallet)} days
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-2.5">
                <p className="text-[10px] font-semibold text-slate-500">Negative days</p>
                <p className="text-sm font-extrabold text-slate-900">
                  {state.negativeDays} of {state.graceLimit}
                </p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-2.5">
                <p className="text-[10px] font-semibold text-slate-600">Pending deficit</p>
                <p className="text-sm font-extrabold text-slate-900">{formatRupees(state.pendingAmount)}</p>
              </div>
            </div>

            {monthGroups.length === 0 ? (
              <EmptyState>No deficit for this student.</EmptyState>
            ) : (
              <div className="space-y-3">
                {monthGroups.map((g) => (
                  <section key={g.key} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2">
                      <h3 className="text-xs font-bold text-slate-900">{monthLabel(g.key)}</h3>
                      <span className="text-xs font-extrabold text-orange-800">
                        {formatRupees(g.summary?.totalDeficit ?? 0)}
                        <span className="ml-1 font-semibold text-slate-500">
                          · {formatRupees(g.summary?.pendingDeficit ?? 0)} unpaid
                        </span>
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {g.days.map((d) => (
                        <li key={d.date} className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                          <span className="font-semibold text-slate-800">
                            {formatLongDate(d.date)} <span className="text-slate-400">{weekdayShort(d.date)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Pill tone={d.settled ? 'emerald' : 'amber'}>{d.settled ? 'Paid' : 'Unpaid'}</Pill>
                            <span className="w-16 text-right font-extrabold text-orange-700">{formatRupees(d.deficit)}</span>
                          </span>
                        </li>
                      ))}
                      {g.carried.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                          <span className="text-slate-600">{e.note || 'Carried from the old register'}</span>
                          <span className="font-extrabold text-orange-700">{formatRupees(e.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {/* Deficits that belong to the old books */}
            <form onSubmit={addCarried} className="space-y-3 rounded-2xl border border-dashed border-slate-300 p-3.5">
              <h3 className="text-xs font-bold text-slate-900">Add an earlier deficit (from the old register)</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={INPUT} aria-label="Month" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Amount (₹)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  className={INPUT}
                  aria-label="Amount"
                />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={INPUT} />
              </div>
              {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" />
                {saving ? 'Saving…' : 'Add deficit'}
              </button>
              <p className="text-[11px] text-slate-500">
                It shows up as a month on the Cut Slip screen, where you can choose to clear it with a deposit.
              </p>
            </form>

            <Link href={`/munshi/slips?student=${student.id}`} className={`${BTN_ACCENT} w-full`}>
              <Receipt className="h-4 w-4" />
              Cut a slip for {student.name}
            </Link>
          </>
        )}
      </Card>
    </>
  );
}

export default function MunshiDeficitPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-400">Loading…</p>}>
      <DeficitView />
    </Suspense>
  );
}
