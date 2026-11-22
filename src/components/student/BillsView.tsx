'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Download, FileText } from 'lucide-react';
import { PaymentSlip, Student } from '@/types';
import { AccountState, DAILY_RATE, formatDays, formatRupees } from '@/lib/diningEngine';
import { formatDMY } from '@/lib/billingUtils';
import { SlipData } from '@/lib/foodSlip';
import { SlipModal } from './SlipModal';
import { LedgerStatement } from '../ledger/LedgerStatement';
import { monthLabel } from './studentUtils';

interface BillsViewProps {
  student: Student;
  state: AccountState;
  slips: PaymentSlip[];
  todayKey: string;
}

const PLAN_DAYS = [7, 15, 30];
const SLIPS_COLLAPSED = 6;

export const BillsView: React.FC<BillsViewProps> = ({ student, state, slips, todayKey }) => {
  const todayMonth = todayKey.slice(0, 7);

  const monthKeys = useMemo(
    () =>
      Array.from(state.months.values())
        .filter((m) => m.eatenDays + m.offDays + m.stoppedDays + m.carriedDeficit > 0)
        .map((m) => m.key)
        .sort((a, b) => b.localeCompare(a)),
    [state]
  );
  const sortedSlips = useMemo(() => [...slips].sort((a, b) => b.paid_on.localeCompare(a.paid_on)), [slips]);

  const [monthKey, setMonthKey] = useState(todayMonth);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [planDays, setPlanDays] = useState(PLAN_DAYS[2]);
  const [showAllSlips, setShowAllSlips] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [preview, setPreview] = useState<SlipData | null>(null);

  const selectedKey = monthKeys.includes(monthKey) ? monthKey : monthKeys[0];
  const month = selectedKey ? state.months.get(selectedKey) : undefined;

  const hasPending = state.pendingAmount > 0.005;

  // Deposit needed to clear what is owed and still have `planDays` of dining paid for.
  const planAmount = state.pendingAmount + Math.max(planDays - state.wallet, 0) * DAILY_RATE;

  const visibleSlips = showAllSlips ? sortedSlips : sortedSlips.slice(0, SLIPS_COLLAPSED);

  return (
    <div className="space-y-4">
      {/* Identity strip */}
      <div className="rounded-2xl border border-emerald-900/10 bg-white px-4 py-3 text-center shadow-sm">
        <p className="truncate text-sm font-extrabold tracking-wide text-emerald-950">
          {student.name.toUpperCase()} | {student.enrollment_no} | {student.house}
          {student.room_no}
        </p>
      </div>

      {/* Two boxes: this month's deficit + overall pending deficit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="relative">
            <select
              value={selectedKey ?? ''}
              onChange={(e) => {
                setMonthKey(e.target.value);
                setShowBreakdown(false);
              }}
              disabled={monthKeys.length === 0}
              aria-label="Select month"
              className="w-full cursor-pointer appearance-none rounded-lg border border-emerald-700/40 bg-emerald-200 py-1.5 pl-3 pr-8 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {monthKeys.length === 0 && <option value="">No month yet</option>}
              {monthKeys.map((k) => (
                <option key={k} value={k}>
                  {monthLabel(k)}
                  {k === todayMonth ? ' (running)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-emerald-900" />
          </div>

          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            disabled={!month}
            className="press flex h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-amber-200 px-2 text-center shadow-sm"
          >
            <span className="text-[11px] font-semibold text-amber-900/80">
              Deficit · {selectedKey ? monthLabel(selectedKey) : 'This month'}
            </span>
            <span className="mt-1 text-3xl font-black text-slate-900">{formatRupees(month?.totalDeficit ?? 0)}</span>
            <span className="mt-1 text-[10px] font-semibold text-amber-900/70">
              {month && month.pendingDeficit > 0.005
                ? `${formatRupees(month.pendingDeficit)} unpaid`
                : month && month.totalDeficit > 0
                ? 'all paid'
                : showBreakdown
                ? 'Hide details'
                : 'Tap for details'}
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <p className="py-1.5 text-center text-xs font-semibold text-slate-600">Pending Deficit</p>
          <div
            className={`flex h-28 w-full flex-col items-center justify-center rounded-2xl border-2 px-2 text-center shadow-sm ${
              hasPending ? 'border-sky-400/70 bg-sky-200' : 'border-emerald-400/70 bg-emerald-200'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-700">All months so far</span>
            <span className="mt-1 text-3xl font-black text-slate-900">{formatRupees(state.pendingAmount)}</span>
            <span className="mt-1 text-[10px] font-semibold text-slate-600">
              {hasPending ? 'to be paid' : 'nothing due'}
            </span>
          </div>
        </div>
      </div>

      {/* Balance in days */}
      <div className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dining balance</p>
          <p className="text-xl font-black text-slate-900">
            {state.negativeDays > 0 ? `-${state.negativeDays}` : formatDays(state.wallet)} days
          </p>
        </div>
        <p className="max-w-[11rem] text-right text-[11px] text-slate-500">
          {state.negativeDays > 0
            ? `Grace ${state.negativeDays} of ${state.graceLimit}. The next deposit pays these first.`
            : `One day = ${formatRupees(DAILY_RATE)}`}
        </p>
      </div>

      {showBreakdown && month && (
        <div className="fade-enter rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
          <p className="mb-2 text-sm font-bold text-slate-900">{monthLabel(month.key)}</p>
          <dl className="space-y-1.5">
            <Row label="Days dined" value={String(month.eatenDays)} />
            <Row label="Covered by paid days" value={String(month.coveredDays)} />
            <Row label="Days on deficit" value={`${month.deficitDays} × ${formatRupees(DAILY_RATE)}`} />
            {month.carriedDeficit > 0 && <Row label="Carried from the old register" value={formatRupees(month.carriedDeficit)} />}
            {month.offDays > 0 && <Row label="Dining off (not charged)" value={`${month.offDays} days`} />}
            {month.stoppedDays > 0 && <Row label="Dining stopped (not charged)" value={`${month.stoppedDays} days`} />}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
              <dt>Month deficit</dt>
              <dd>{formatRupees(month.totalDeficit)}</dd>
            </div>
          </dl>
          {month.key === todayMonth && (
            <p className="mt-2 text-[11px] text-slate-500">This month is still running, so the amount can change.</p>
          )}
        </div>
      )}

      {/* Pay planner */}
      <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
        <h3 className="text-sm font-bold text-slate-900">How much to deposit?</h3>
        <p className="text-[11px] text-slate-500">Pick how many days of dining you want paid for.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {PLAN_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPlanDays(d)}
              aria-pressed={planDays === d}
              className={`press rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                planDays === d ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
          <span className="text-xs font-semibold text-emerald-900">
            {hasPending ? `Clear ${formatRupees(state.pendingAmount)} + ${planDays} days` : `${planDays} days of dining`}
          </span>
          <span className="text-xl font-black text-emerald-950">{formatRupees(planAmount)}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          At {formatRupees(DAILY_RATE)} a day. Your {formatDays(state.wallet)} paid day{state.wallet === 1 ? '' : 's'} already count.
        </p>
      </section>

      {/* Previously paid */}
      <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Previously paid</h3>
            <p className="text-[11px] text-slate-500">
              {sortedSlips.length} {sortedSlips.length === 1 ? 'slip' : 'slips'} · tap a row to open the slip
            </p>
          </div>
          <p className="text-right text-lg font-black text-emerald-800">{formatRupees(state.totalPaid)}</p>
        </div>

        {sortedSlips.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">No payments recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2">S.N</th>
                  <th className="px-2 py-2">Slip no.</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2">Paid on</th>
                  <th className="w-9 px-2 py-2" aria-label="Download" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSlips.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => setPreview({ slip: s, student })}
                    className="cursor-pointer active:bg-emerald-50"
                  >
                    <td className="px-3 py-2.5 font-semibold text-slate-500">{i + 1}</td>
                    <td className="px-2 py-2.5 font-mono font-semibold text-slate-800">{s.slip_no}</td>
                    <td className="px-2 py-2.5 text-right font-bold text-slate-900">{formatRupees(s.amount)}</td>
                    <td className="px-2 py-2.5 text-slate-600">{formatDMY(s.paid_on)}</td>
                    <td className="px-2 py-2.5 text-emerald-800">
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sortedSlips.length > SLIPS_COLLAPSED && (
          <button
            type="button"
            onClick={() => setShowAllSlips((v) => !v)}
            className="press mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 py-2.5 text-xs font-bold text-slate-700"
          >
            <FileText className="h-3.5 w-3.5" />
            {showAllSlips ? 'Show fewer' : `Show all ${sortedSlips.length} slips`}
          </button>
        )}
      </section>

      {/* Full account statement */}
      <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
        <button
          type="button"
          onClick={() => setShowStatement((v) => !v)}
          aria-expanded={showStatement}
          className="press flex w-full items-center justify-between text-left"
        >
          <span>
            <span className="block text-sm font-bold text-slate-900">Account statement</span>
            <span className="block text-[11px] text-slate-500">Deposits and the deficit of every month</span>
          </span>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${showStatement ? 'rotate-180' : ''}`} />
        </button>
        {showStatement && (
          <div className="fade-enter mt-3">
            <LedgerStatement
              state={state}
              slips={slips}
              todayKey={todayKey}
              onOpenSlip={(slip) => setPreview({ slip, student })}
            />
          </div>
        )}
      </section>

      <SlipModal data={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-slate-600">
    <dt>{label}</dt>
    <dd className="font-semibold text-slate-900">{value}</dd>
  </div>
);
