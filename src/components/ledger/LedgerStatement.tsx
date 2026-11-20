'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { MonthlyBill, PaymentSlip } from '@/types';
import { buildLedger, formatDMY, formatMoney } from '@/lib/billingUtils';

interface LedgerStatementProps {
  bills: MonthlyBill[];
  slips: PaymentSlip[];
  todayKey: string;
  /** When set, deposit rows become tappable and open that slip. */
  onOpenSlip?: (slip: PaymentSlip) => void;
}

const COLLAPSED = 12;

/** Account statement: every monthly bill and every deposit in date order, with the running balance. */
export const LedgerStatement: React.FC<LedgerStatementProps> = ({ bills, slips, todayKey, onOpenSlip }) => {
  const [showAll, setShowAll] = useState(false);

  // Oldest first for the running balance, newest first for reading.
  const entries = useMemo(() => buildLedger(bills, slips, todayKey).reverse(), [bills, slips, todayKey]);
  const visible = showAll ? entries : entries.slice(0, COLLAPSED);

  if (entries.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No bills or deposits yet.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
        {visible.map((e) => {
          const isDeposit = e.kind === 'deposit';
          const clickable = isDeposit && e.slip && onOpenSlip;
          const Row = clickable ? 'button' : 'div';
          return (
            <li key={e.id}>
              <Row
                {...(clickable ? { type: 'button' as const, onClick: () => onOpenSlip!(e.slip!) } : {})}
                className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${clickable ? 'press active:bg-emerald-50' : ''}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isDeposit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {isDeposit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900">{e.label}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {formatDMY(e.date)}
                    {e.detail ? ` · ${e.detail}` : ''}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className={`block text-xs font-extrabold ${isDeposit ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isDeposit ? '−' : '+'}
                    {formatMoney(isDeposit ? e.credit : e.debit)}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-500">
                    {e.balance > 0 ? 'Deficit' : e.balance < 0 ? 'Advance' : 'Balance'} {formatMoney(Math.abs(e.balance))}
                  </span>
                </span>
              </Row>
            </li>
          );
        })}
      </ul>

      {entries.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="press mt-3 w-full rounded-full bg-slate-100 py-2.5 text-xs font-bold text-slate-700"
        >
          {showAll ? 'Show fewer' : `Show all ${entries.length} entries`}
        </button>
      )}
      <p className="mt-2 text-center text-[11px] text-slate-400">
        + bill added to the deficit · − deposit received · the balance is after each entry
      </p>
    </div>
  );
};
