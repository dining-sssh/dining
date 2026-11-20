'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Download, FileText } from 'lucide-react';
import { MonthlyBill, PaymentSlip, Student } from '@/types';
import { allocateDeficits, formatDMY, formatMoney, summarizeAccount } from '@/lib/billingUtils';
import { SlipData } from '@/lib/foodSlip';
import { SlipModal } from './SlipModal';
import { LedgerStatement } from '../ledger/LedgerStatement';

interface BillsViewProps {
  student: Student;
  bills: MonthlyBill[];
  slips: PaymentSlip[];
  todayKey: string;
}

const PLAN_DAYS = [7, 15, 30];
const SLIPS_COLLAPSED = 6;

export const BillsView: React.FC<BillsViewProps> = ({ student, bills, slips, todayKey }) => {
  const todayMonth = todayKey.slice(0, 7);

  const sortedBills = useMemo(() => [...bills].sort((a, b) => b.month_key.localeCompare(a.month_key)), [bills]);
  const sortedSlips = useMemo(() => [...slips].sort((a, b) => b.paid_on.localeCompare(a.paid_on)), [slips]);
  const account = useMemo(() => summarizeAccount(bills, slips), [bills, slips]);
  // Deposits are applied to the oldest bill first; what is left unpaid on each bill is that month's deficit.
  const allocation = useMemo(() => allocateDeficits(bills, slips), [bills, slips]);

  const [monthKey, setMonthKey] = useState(todayMonth);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [planDays, setPlanDays] = useState(PLAN_DAYS[1]);
  const [showAllSlips, setShowAllSlips] = useState(false);
  const [preview, setPreview] = useState<SlipData | null>(null);
  const [showStatement, setShowStatement] = useState(false);

  const bill = sortedBills.find((b) => b.month_key === monthKey) ?? sortedBills[0];
  const hasDeficit = account.balance > 0;
  const monthShare = allocation.months.find((m) => m.bill.id === bill?.id);
  const monthDeficit = monthShare?.deficit ?? 0;
  const rate = sortedBills[0]?.diet_rate ?? 65;

  // Estimated amount to deposit so the deficit is cleared and the chosen number of days is covered.
  const planAmount = Math.max(0, account.balance + planDays * rate);
  const creditDays = account.balance < 0 ? Math.floor(-account.balance / rate) : 0;

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

      {sortedBills.length === 0 || !bill ? (
        <div className="rounded-3xl bg-white py-10 text-center text-xs text-slate-400 shadow-sm">
          No bills have been generated for your account yet.
        </div>
      ) : (
        <>
          {/* Two boxes: this month's deficit + overall pending deficit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={bill.month_key}
                  onChange={(e) => {
                    setMonthKey(e.target.value);
                    setShowBreakdown(false);
                  }}
                  aria-label="Select month"
                  className="w-full cursor-pointer appearance-none rounded-lg border border-emerald-700/40 bg-emerald-200 py-1.5 pl-3 pr-8 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {sortedBills.map((b) => (
                    <option key={b.id} value={b.month_key}>
                      {b.month_name}
                      {b.month_key === todayMonth ? ' (running)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-emerald-900" />
              </div>

              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                aria-expanded={showBreakdown}
                className="press flex h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-amber-200 px-2 text-center shadow-sm"
              >
                <span className="text-[11px] font-semibold text-amber-900/80">Deficit · {bill.month_name}</span>
                <span className="mt-1 text-3xl font-black text-slate-900">{formatMoney(monthDeficit)}</span>
                <span className="mt-1 text-[10px] font-semibold text-amber-900/70">
                  {showBreakdown ? 'Hide details' : 'Tap for details'}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <p className="py-1.5 text-center text-xs font-semibold text-slate-600">
                {hasDeficit || account.balance === 0 ? 'Pending Deficit' : 'Advance Balance'}
              </p>
              <div
                className={`flex h-28 w-full flex-col items-center justify-center rounded-2xl border-2 px-2 text-center shadow-sm ${
                  hasDeficit ? 'border-sky-400/70 bg-sky-200' : 'border-emerald-400/70 bg-emerald-200'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-700">All months so far</span>
                <span className="mt-1 text-3xl font-black text-slate-900">{formatMoney(Math.abs(account.balance))}</span>
                <span className="mt-1 text-[10px] font-semibold text-slate-600">
                  {hasDeficit ? 'to be paid' : account.balance === 0 ? 'nothing due' : 'credit with the hall'}
                </span>
              </div>
            </div>
          </div>

          {showBreakdown && (
            <div className="fade-enter rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
              <p className="mb-2 text-sm font-bold text-slate-900">{bill.month_name} · charges</p>
              <dl className="space-y-1.5">
                <Row label={`Diets (${bill.total_diets} × ₹${bill.diet_rate})`} value={bill.diet_amount} />
                <Row label="Fixed dining charges" value={bill.fixed_charges} />
                <Row label="Establishment charges" value={bill.establishment_charges} />
                {bill.extras > 0 && <Row label="Extras" value={bill.extras} />}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <dt>Month bill</dt>
                  <dd>{formatMoney(bill.total_amount)}</dd>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <dt>Paid against this month</dt>
                  <dd className="font-semibold">− {formatMoney(monthShare?.applied ?? 0)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                  <dt>Month deficit</dt>
                  <dd>{formatMoney(monthDeficit)}</dd>
                </div>
              </dl>
              {bill.rebate_days > 0 && (
                <p className="mt-2 text-[11px] text-amber-800">{bill.rebate_days} days of approved mess off were not charged.</p>
              )}
              {bill.month_key === todayMonth && (
                <p className="mt-2 text-[11px] text-slate-500">This month is still running, so the amount can change.</p>
              )}
            </div>
          )}

          {/* Pay planner */}
          <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
            <h3 className="text-sm font-bold text-slate-900">How much to deposit?</h3>
            <p className="text-[11px] text-slate-500">Pick how many more days you want dining for.</p>

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
                {hasDeficit ? `Clear ${formatMoney(account.balance)} + ${planDays} days` : `${planDays} days of dining`}
              </span>
              <span className="text-xl font-black text-emerald-950">{formatMoney(planAmount)}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Estimate at ₹{rate} per diet; monthly fixed charges are not included.
              {creditDays > 0 && ` Your advance already covers about ${creditDays} days.`}
            </p>
          </section>
        </>
      )}

      {/* Previously paid */}
      <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Previously paid</h3>
            <p className="text-[11px] text-slate-500">
              {sortedSlips.length} {sortedSlips.length === 1 ? 'slip' : 'slips'} · tap a row to open the slip
            </p>
          </div>
          <p className="text-right text-lg font-black text-emerald-800">{formatMoney(account.totalPaid)}</p>
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
                    <td className="px-2 py-2.5 text-right font-bold text-slate-900">{formatMoney(s.amount)}</td>
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
            <span className="block text-[11px] text-slate-500">Every bill and deposit with the running balance</span>
          </span>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${showStatement ? 'rotate-180' : ''}`} />
        </button>
        {showStatement && (
          <div className="fade-enter mt-3">
            <LedgerStatement
              bills={bills}
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

const Row: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex justify-between text-slate-600">
    <dt>{label}</dt>
    <dd className="font-semibold text-slate-900">{formatMoney(value)}</dd>
  </div>
);
