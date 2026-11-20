'use client';

import React, { useMemo, useState } from 'react';
import { Clock, IndianRupee, Search, Wallet } from 'lucide-react';
import { formatDMY, formatMoney } from '@/lib/billingUtils';
import { useProvostData } from '@/components/provost/ProvostData';
import { BTN_GHOST, Card, EmptyState, INPUT, PageHeader, StatCard } from '@/components/admin/ui';

const PAGE = 25;

export default function ProvostBillingPage() {
  const { bills, slips, students, totalPendingDues } = useProvostData();
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('ALL');
  const [limit, setLimit] = useState(PAGE);

  const nameByStudent = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const months = useMemo(() => {
    const seen = new Map<string, string>();
    bills.forEach((b) => seen.set(b.month_key, b.month_name));
    return Array.from(seen.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [bills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills
      .filter((b) => {
        const name = (nameByStudent.get(b.student_id) || '').toLowerCase();
        const match = !q || b.enrollment_no.toLowerCase().includes(q) || name.includes(q);
        return match && (month === 'ALL' || b.month_key === month);
      })
      .sort((a, b) => b.month_key.localeCompare(a.month_key) || a.enrollment_no.localeCompare(b.enrollment_no));
  }, [bills, query, month, nameByStudent]);

  const recentSlips = useMemo(
    () => [...slips].sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.slip_no.localeCompare(a.slip_no)).slice(0, 10),
    [slips]
  );

  const totalBilled = bills.reduce((a, b) => a + (b.total_amount || 0), 0);
  const totalPaid = slips.reduce((a, s) => a + (s.amount || 0), 0);

  return (
    <>
      <PageHeader title="Billing" subtitle="Monthly bills generated for residents and the deposits received" />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Billed" value={formatMoney(totalBilled)} icon={IndianRupee} tone="slate" />
        <StatCard label="Deposited" value={formatMoney(totalPaid)} icon={Wallet} tone="emerald" />
        <StatCard label="Pending" value={formatMoney(totalPendingDues)} icon={Clock} tone="amber" />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
            <input
              type="search"
              placeholder="Search enrollment no or name"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              className={`${INPUT} pl-10`}
            />
          </div>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Month"
            className={`${INPUT} sm:w-56`}
          >
            <option value="ALL">All months</option>
            {months.map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState>No bills match.</EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Student</th>
                    <th className="p-3 text-right">Diets</th>
                    <th className="p-3 text-right">Rebate</th>
                    <th className="p-3 text-right">Diet amt</th>
                    <th className="p-3 text-right">Fixed + estb.</th>
                    <th className="p-3 text-right">Month deficit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.slice(0, limit).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{b.month_name}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{nameByStudent.get(b.student_id) || '—'}</div>
                        <div className="font-mono text-[11px] text-slate-500">{b.enrollment_no}</div>
                      </td>
                      <td className="p-3 text-right">{b.total_diets}</td>
                      <td className="p-3 text-right">{b.rebate_days} d</td>
                      <td className="p-3 text-right">{formatMoney(b.diet_amount)}</td>
                      <td className="p-3 text-right">{formatMoney(b.fixed_charges + b.establishment_charges)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatMoney(b.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > limit && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={`${BTN_GHOST} w-full`}>
                Show more ({filtered.length - limit} left)
              </button>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-bold text-slate-900">Recent deposits</h2>
        <p className="text-xs text-slate-500">Latest food charges slips</p>
        {recentSlips.length === 0 ? (
          <EmptyState>No deposits recorded.</EmptyState>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">R. No.</th>
                  <th className="p-3">Book</th>
                  <th className="p-3">Student</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Paid on</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSlips.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{s.slip_no}</td>
                    <td className="p-3 text-slate-600">{s.book_no}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{nameByStudent.get(s.student_id) || '—'}</div>
                      <div className="font-mono text-[11px] text-slate-500">{s.enrollment_no}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-800">{formatMoney(s.amount)}</td>
                    <td className="p-3 text-slate-600">{formatDMY(s.paid_on)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
