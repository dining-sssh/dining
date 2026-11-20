'use client';

import React, { useState } from 'react';
import { CheckCircle, ChevronDown, Clock, Printer, Receipt } from 'lucide-react';
import { MonthlyBill, Student } from '@/types';
import { HALL_NAME, SESSIONS } from './studentUtils';

interface BillsViewProps {
  student: Student;
  bills: MonthlyBill[];
  session: string;
  onSessionChange: (session: string) => void;
  initialMonthKey: string;
}

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const statusTone = (status: MonthlyBill['status']) =>
  status === 'paid'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'overdue'
    ? 'bg-rose-100 text-rose-800'
    : 'bg-amber-100 text-amber-800';

export const BillsView: React.FC<BillsViewProps> = ({ student, bills, session, onSessionChange, initialMonthKey }) => {
  const [mode, setMode] = useState<'month' | 'session'>('month');
  const [selectedKey, setSelectedKey] = useState(initialMonthKey);

  const bill = bills.find((b) => b.month_key === selectedKey) ?? bills[bills.length - 1];

  const totalDiets = bills.reduce((a, b) => a + (b.total_diets || 0), 0);
  const totalBilled = bills.reduce((a, b) => a + (b.total_amount || 0), 0);
  const totalPaid = bills.filter((b) => b.status === 'paid').reduce((a, b) => a + (b.total_amount || 0), 0);
  const outstanding = totalBilled - totalPaid;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bills</h2>
          <p className="text-xs text-slate-500">Monthly statements and session summary</p>
        </div>
        <div className="relative">
          <select
            value={session}
            onChange={(e) => onSessionChange(e.target.value)}
            aria-label="Session"
            className="cursor-pointer appearance-none rounded-full border border-slate-300 bg-white py-2 pl-4 pr-9 text-xs font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {SESSIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-700" />
        </div>
      </div>

      {/* Outstanding card */}
      <div
        className={`no-print flex items-center gap-4 rounded-3xl p-4 text-white shadow-lg ${
          outstanding > 0
            ? 'bg-gradient-to-br from-[#7f1d1d] to-[#451212] shadow-rose-900/20'
            : 'bg-gradient-to-br from-[#0c5a41] to-[#052e20] shadow-emerald-900/20'
        }`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Receipt className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
            {outstanding > 0 ? 'Outstanding dues' : 'All dues cleared'}
          </p>
          <p className="text-3xl font-extrabold leading-tight">{money(outstanding)}</p>
          <p className="text-[11px] text-white/70">Session {session}</p>
        </div>
      </div>

      {/* Segmented control */}
      <div className="no-print grid grid-cols-2 rounded-full bg-slate-200/70 p-1 text-xs font-bold">
        {(['month', 'session'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 transition ${
              mode === m ? 'bg-white text-emerald-950 shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {m === 'month' ? 'Monthly statement' : 'Session summary'}
          </button>
        ))}
      </div>

      {bills.length === 0 && (
        <div className="rounded-3xl border border-white/80 bg-white/90 py-10 text-center text-xs text-slate-400">
          No bills found for session {session}.
        </div>
      )}

      {bills.length > 0 && mode === 'month' && bill && (
        <>
          {/* Month chips */}
          <div className="no-print -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {bills.map((b) => {
              const isSel = b.month_key === bill.month_key;
              const due = b.status !== 'paid';
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedKey(b.month_key)}
                  className={`min-w-[8.5rem] shrink-0 rounded-2xl border p-3 text-left transition ${
                    isSel
                      ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{b.month_name}</span>
                    <span className={`h-2 w-2 rounded-full ${due ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>
                  <p className={`mt-1 text-sm font-extrabold ${due ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {due ? money(b.total_amount) : 'Paid'}
                  </p>
                  <p className="text-[10px] text-slate-500">{b.total_diets} diets</p>
                </button>
              );
            })}
          </div>

          {/* Voucher */}
          <div className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-lg shadow-emerald-950/5">
            <div className="border-b border-slate-200 pb-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">{HALL_NAME} Dining</p>
              <p className="text-[11px] text-slate-500">Aligarh Muslim University, Aligarh</p>
              <p className="mt-2 text-base font-extrabold text-slate-900">
                Dining Bill · {bill.month_name}
              </p>
            </div>

            <dl className="my-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 text-xs">
              <Meta label="Resident" value={student.name} />
              <Meta label="Enrollment" value={student.enrollment_no} mono />
              <Meta label="House & room" value={`${student.house} · Room ${student.room_no}`} />
              <Meta label="Session" value={bill.session} />
            </dl>

            <div className="overflow-hidden rounded-2xl border border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-3">Particulars</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <Line
                    title="Diet charges"
                    sub={`${bill.total_diets} diets × ₹${bill.diet_rate}`}
                    amount={bill.diet_amount}
                  />
                  <Line title="Fixed dining charges" sub="Kitchen fuel, cook wages, upkeep" amount={bill.fixed_charges} />
                  <Line title="Establishment charges" sub="Hall administration and cleaning" amount={bill.establishment_charges} />
                  {bill.extras > 0 && <Line title="Extras" sub="Other charges" amount={bill.extras} />}
                  {bill.rebate_days > 0 && (
                    <tr className="bg-amber-50/60">
                      <td className="p-3">
                        <div className="font-semibold text-amber-900">Rebate applied</div>
                        <div className="text-[10px] text-amber-700">{bill.rebate_days} days of approved mess off</div>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">Included</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t-2 border-emerald-300 bg-emerald-50 font-bold text-emerald-950">
                  <tr>
                    <td className="p-3 text-sm">Total payable</td>
                    <td className="p-3 text-right text-base font-extrabold">₹{bill.total_amount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(bill.status)}`}>
                  {bill.status === 'paid' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {bill.status.toUpperCase()}
                </span>
                {bill.receipt_no && <p className="mt-1 font-mono text-[10px] text-slate-500">Ref: {bill.receipt_no}</p>}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
          </div>
        </>
      )}

      {bills.length > 0 && mode === 'session' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Summary label="Diets" value={String(totalDiets)} tone="bg-slate-50 border-slate-200 text-slate-900" />
            <Summary label="Billed" value={money(totalBilled)} tone="bg-emerald-50 border-emerald-200 text-emerald-950" />
            <Summary label="Paid" value={money(totalPaid)} tone="bg-sky-50 border-sky-200 text-sky-950" />
          </div>

          <ul className="space-y-2.5">
            {bills.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{b.month_name}</p>
                  <p className="text-[11px] text-slate-500">
                    {b.total_diets} diets · {b.rebate_days} rebate days
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold text-slate-900">{money(b.total_amount)}</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(b.status)}`}>
                    {b.status.toUpperCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const Meta: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <dt className="text-slate-400">{label}</dt>
    <dd className={`font-bold text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
);

const Line: React.FC<{ title: string; sub: string; amount: number }> = ({ title, sub, amount }) => (
  <tr>
    <td className="p-3">
      <div className="font-semibold text-slate-800">{title}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </td>
    <td className="p-3 text-right font-bold text-slate-900">₹{amount.toFixed(2)}</td>
  </tr>
);

const Summary: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => (
  <div className={`rounded-2xl border p-3 ${tone}`}>
    <p className="text-[11px] font-semibold opacity-70">{label}</p>
    <p className="mt-1 text-lg font-extrabold leading-tight">{value}</p>
  </div>
);
