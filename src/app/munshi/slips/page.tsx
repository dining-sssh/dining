'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Download, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import { PaymentSlip } from '@/types';
import { DataService } from '@/lib/dataService';
import { formatDMY, isPrintableSlip, nextSlipNumbers, paymentLabel } from '@/lib/billingUtils';
import { DAILY_RATE, formatDays, formatRupees, previewSlip } from '@/lib/diningEngine';
import { SlipData } from '@/lib/foodSlip';
import { useAdminData } from '@/components/admin/AdminData';
import { BTN_PRIMARY, Card, EmptyState, INPUT, PageHeader, Pill } from '@/components/admin/ui';
import { StudentPicker } from '@/components/munshi/StudentPicker';
import { SlipModal } from '@/components/student/SlipModal';
import { monthLabel } from '@/components/student/studentUtils';

const MAX_PARTS = 5;
const RECENT = 12;

const Label: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-slate-700">{text}</span>
    {children}
  </label>
);

function SlipsView() {
  const params = useSearchParams();
  const presetStudent = params.get('student');
  const { students, slips, accounts, settings, todayKey, reload } = useAdminData();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [parts, setParts] = useState<string[]>(['']);
  const [settle, setSettle] = useState<string[]>([]);
  const [slipOverride, setSlipOverride] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(todayKey);
  const [cashierOverride, setCashierOverride] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [issued, setIssued] = useState<SlipData | null>(null);
  const [preview, setPreview] = useState<SlipData | null>(null);
  const [recentQuery, setRecentQuery] = useState('');

  useEffect(() => {
    if (!presetStudent || studentId) return;
    if (students.some((s) => s.id === presetStudent)) setStudentId(presetStudent);
  }, [presetStudent, students, studentId]);

  const student = students.find((s) => s.id === studentId) ?? null;
  const state = student ? accounts.get(student.id) : undefined;

  const suggested = useMemo(() => nextSlipNumbers(slips), [slips]);
  const slipNo = slipOverride ?? suggested.slipNo;
  const defaultCashier = (settings?.munshi_name ?? '').replace(/\s*\(.*?\)\s*/g, '').trim();
  const cashier = cashierOverride ?? defaultCashier;

  const amounts = parts.map((p) => (p.trim() === '' ? NaN : Number(p))).filter((n) => !Number.isNaN(n));
  const total = amounts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  // What this deposit would do: pay the negative days, clear the chosen months, and add days.
  const outcome = useMemo(() => (state ? previewSlip(state, total, settle) : null), [state, total, settle]);

  const nameById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const recent = useMemo(() => {
    const q = recentQuery.trim().toLowerCase();
    return [...slips]
      .filter((s) => {
        if (!q) return true;
        const name = nameById.get(s.student_id)?.name.toLowerCase() ?? '';
        return s.slip_no.includes(q) || s.enrollment_no.toLowerCase().includes(q) || name.includes(q);
      })
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on) || Number(b.slip_no) - Number(a.slip_no))
      .slice(0, RECENT);
  }, [slips, recentQuery, nameById]);

  const setPart = (i: number, v: string) => setParts((prev) => prev.map((p, idx) => (idx === i ? v.replace(/[^\d]/g, '') : p)));
  const toggleMonth = (m: string) => setSettle((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const pickStudent = (id: string | null) => {
    setStudentId(id);
    setSettle([]);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!student || !outcome) return setError('Select the student first.');
    const entered = parts.map((p) => p.trim()).filter(Boolean);
    if (entered.length === 0) return setError('Enter the amount received.');
    const nums = entered.map(Number);
    if (nums.some((n) => !Number.isInteger(n) || n <= 0)) return setError('Amounts must be whole numbers above zero.');
    if (!outcome.enough) {
      return setError(
        `The amount is too low. The negative days and the months you ticked need at least ${formatRupees(outcome.minimumAmount)}.`
      );
    }
    if (!slipNo.trim()) return setError('Slip No. is required.');
    if (!paidOn) return setError('Choose the date.');
    if (paidOn > todayKey) return setError('The date cannot be in the future.');

    setSaving(true);
    try {
      const created = await DataService.addPaymentSlip({
        student_id: student.id,
        enrollment_no: student.enrollment_no,
        book_no: '1',
        slip_no: slipNo.trim(),
        amount: nums.reduce((a, b) => a + b, 0),
        breakup: nums.length > 1 ? nums : undefined,
        settled_months: settle.length ? [...settle].sort() : undefined,
        paid_on: paidOn,
        cashier: cashier.trim() || undefined
      });
      await reload();
      setIssued({ slip: created, student });
      // Next slip: numbers move on by themselves, everything else is cleared.
      setStudentId(null);
      setParts(['']);
      setSettle([]);
      setSlipOverride(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the slip.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlip = async (slip: PaymentSlip) => {
    const owner = nameById.get(slip.student_id);
    const slipLabel = `Slip No. ${slip.slip_no} (${formatRupees(slip.amount)}) for ${owner?.name ?? slip.enrollment_no}`;
    if (
      !window.confirm(
        `Revoke and delete slip ${slipLabel}?\n\nThis will permanently delete the slip and remove the credited days from the student's dining account.`
      )
    ) {
      return;
    }

    setDeletingId(slip.id);
    setError('');
    try {
      await DataService.deletePaymentSlip(slip.id);
      if (preview?.slip.id === slip.id) setPreview(null);
      if (issued?.slip.id === slip.id) setIssued(null);
      await reload();
      setInfoMessage(`Slip ${slipLabel} was revoked successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke slip.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader title="Food charges slip" subtitle="Receive a deposit and cut the slip. It adds days to the student's dining balance." />

      {infoMessage && (
        <div className="fade-enter flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            {infoMessage}
          </p>
          <button type="button" onClick={() => setInfoMessage(null)} aria-label="Dismiss" className="press rounded-full p-1 text-blue-500 hover:bg-blue-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {issued && (
        <div className="fade-enter flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Slip No. {issued.slip.slip_no} for {issued.student.name} saved ({formatRupees(issued.slip.amount)}).
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview(issued)}
              className="press inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-4 py-2 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              View / download slip
            </button>
            <button
              type="button"
              disabled={deletingId === issued.slip.id}
              onClick={() => handleDeleteSlip(issued.slip)}
              className="press inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 active:bg-rose-200 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Revoke
            </button>
            <button type="button" onClick={() => setIssued(null)} aria-label="Dismiss" className="press rounded-full bg-white p-2 text-slate-500 ring-1 ring-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <form onSubmit={submit} className="space-y-4 lg:col-span-3">
          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">1. Student</h2>
            <StudentPicker students={students} selectedId={studentId} onSelect={(s) => pickStudent(s?.id ?? null)} />

            {student && state && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-2.5">
                  <p className="text-[10px] font-semibold text-slate-500">Paid days left</p>
                  <p className="text-sm font-extrabold text-slate-900">{formatDays(state.wallet)}</p>
                </div>
                <div className={`rounded-2xl p-2.5 ${state.negativeDays > 0 ? 'bg-amber-100' : 'bg-slate-50'}`}>
                  <p className="text-[10px] font-semibold text-slate-600">Negative days</p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {state.negativeDays > 0 ? `-${state.negativeDays}` : '0'}
                  </p>
                </div>
                <div className={`rounded-2xl p-2.5 ${state.pendingAmount > 0.005 ? 'bg-sky-100' : 'bg-emerald-100'}`}>
                  <p className="text-[10px] font-semibold text-slate-600">Pending deficit</p>
                  <p className="text-sm font-extrabold text-slate-900">{formatRupees(state.pendingAmount)}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">2. Amount received</h2>

            <div className="space-y-2">
              {parts.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={i === 0 ? 'Amount (₹)' : `Amount ${i + 1} (₹)`}
                    value={p}
                    onChange={(e) => setPart(i, e.target.value)}
                    className={`${INPUT} font-bold`}
                    aria-label={`Amount ${i + 1}`}
                  />
                  {parts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setParts((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove amount ${i + 1}`}
                      className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {parts.length < MAX_PARTS && (
                <button
                  type="button"
                  onClick={() => setParts((prev) => [...prev, ''])}
                  className="press inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Another amount
                </button>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
              <span className="text-xs font-semibold text-emerald-900">{amounts.length > 1 ? `${amounts.join(' + ')} =` : 'Total'}</span>
              <span className="text-xl font-black text-emerald-950">{formatRupees(total)}</span>
            </div>

            {/* Deficit to clear with this deposit */}
            {student && state && (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900">Deficit paid with this slip</p>
                </div>

                <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${state.negativeDays > 0 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-slate-50'}`}>
                  <span className="font-semibold text-slate-700">
                    Negative days (always deducted)
                    <span className="block text-[11px] font-normal text-slate-500">
                      {state.negativeDays} day{state.negativeDays === 1 ? '' : 's'} × {formatRupees(DAILY_RATE)}
                    </span>
                  </span>
                  <span className="font-extrabold text-slate-900">{formatRupees(state.negativeAmount)}</span>
                </div>

                {state.carriedPending.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-slate-600">Earlier months with a pending deficit. Tick the ones to include:</p>
                    <div className="flex flex-wrap gap-2">
                      {state.carriedPending.map((c) => {
                        const on = settle.includes(c.month);
                        return (
                          <button
                            key={c.month}
                            type="button"
                            onClick={() => toggleMonth(c.month)}
                            aria-pressed={on}
                            className={`press rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                              on ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {monthLabel(c.month).slice(0, 3)}: {formatRupees(c.amount)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">No earlier month has a pending deficit.</p>
                )}
              </div>
            )}

            {/* Result */}
            {student && outcome && (
              <div className={`rounded-2xl p-3.5 ${outcome.enough ? 'bg-emerald-900 text-white' : 'bg-rose-50 text-rose-900 ring-1 ring-rose-200'}`}>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="opacity-80">Amount received</dt>
                    <dd className="font-bold">{formatRupees(total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-80">− Negative days ({outcome.mandatoryDays})</dt>
                    <dd className="font-bold">{formatRupees(outcome.mandatoryAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-80">− Earlier deficit ticked</dt>
                    <dd className="font-bold">{formatRupees(outcome.selectedAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-80">New days bought</dt>
                    <dd className="font-bold">{formatDays(outcome.creditedDays)}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-2">
                  <span className="text-xs font-semibold">Total days left</span>
                  <span className="text-2xl font-black">{outcome.enough ? formatDays(outcome.totalDaysLeft) : '—'}</span>
                </div>
                {!outcome.enough && (
                  <p className="mt-1 text-[11px] font-semibold">
                    Add at least {formatRupees(outcome.minimumAmount - total)} more to cover the deficit above.
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">3. Slip details</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Label text="Slip No.">
                <input value={slipNo} onChange={(e) => setSlipOverride(e.target.value)} className={`${INPUT} font-mono`} />
              </Label>
              <Label text="Date">
                <input type="date" max={todayKey} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={INPUT} />
              </Label>
              <Label text="Cashier">
                <input value={cashier} onChange={(e) => setCashierOverride(e.target.value)} className={INPUT} />
              </Label>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={saving} className={`${BTN_PRIMARY} w-full py-3`}>
              <Receipt className="h-4 w-4" />
              {saving ? 'Saving…' : 'Cut slip'}
            </button>
          </Card>
        </form>

        <Card className="space-y-3 self-start lg:col-span-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Slips issued</h2>
            <p className="text-xs text-slate-500">Latest first. Tap one to view or download it again.</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
            <input
              type="search"
              placeholder="Slip No., enrollment or name"
              value={recentQuery}
              onChange={(e) => setRecentQuery(e.target.value)}
              className={`${INPUT} pl-10`}
            />
          </div>

          {recent.length === 0 ? (
            <EmptyState>No slips found.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {recent.map((s: PaymentSlip) => {
                const owner = nameById.get(s.student_id);
                const isDeleting = deletingId === s.id;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-1 p-1 hover:bg-slate-50">
                    <button
                      type="button"
                      disabled={!owner || isDeleting || !isPrintableSlip(s)}
                      onClick={() => owner && setPreview({ slip: s, student: owner })}
                      className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left active:bg-emerald-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900">{owner?.name ?? s.enrollment_no}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {isPrintableSlip(s) ? (
                            <>
                              Slip No. <span className="font-mono font-semibold">{s.slip_no}</span>
                            </>
                          ) : (
                            paymentLabel(s)
                          )}{' '}· {formatDMY(s.paid_on)}
                        </span>
                      </span>
                      <Pill tone="emerald">{formatRupees(s.amount)}</Pill>
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDeleteSlip(s)}
                      title="Revoke slip"
                      aria-label={`Revoke slip No. ${s.slip_no}`}
                      className="press rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <SlipModal data={preview} onClose={() => setPreview(null)} onDelete={handleDeleteSlip} />
    </>
  );
}

export default function MunshiSlipsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-400">Loading…</p>}>
      <SlipsView />
    </Suspense>
  );
}
