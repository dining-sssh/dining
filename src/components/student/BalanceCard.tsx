'use client';

import React from 'react';
import { ChevronRight, Wallet } from 'lucide-react';
import { AccountState, DAILY_RATE, formatDays, formatRupees } from '@/lib/diningEngine';

interface BalanceCardProps {
  state: AccountState;
  onOpenBills: () => void;
}

/** Paid days left, or the negative grace days, with a marker for every grace day. */
export const BalanceCard: React.FC<BalanceCardProps> = React.memo(({ state, onOpenBills }) => {
  const negative = state.negativeDays > 0;
  const zero = !negative && state.wallet <= 1e-9;
  const big = negative ? `-${state.negativeDays}` : formatDays(state.wallet);

  const tone = state.status === 'stopped'
    ? 'border-rose-200 bg-rose-50'
    : negative || zero
    ? 'border-amber-200 bg-amber-50'
    : 'border-white bg-white';

  return (
    <button
      type="button"
      onClick={onOpenBills}
      className={`press w-full rounded-3xl border p-4 text-left shadow-sm ${tone}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-white">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dining balance</p>
          <p className="text-3xl font-black leading-tight text-slate-900">
            {big}
            <span className="ml-1 text-sm font-semibold text-slate-500">{Math.abs(Number(big)) === 1 ? 'day' : 'days'}</span>
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </div>

      {/* grace markers: 0 (paid days over) then -1, -2, -3 */}
      <div className="mt-3 flex items-center gap-1.5" aria-label={`Grace days used: ${state.negativeDays} of ${state.graceLimit}`}>
        {Array.from({ length: state.graceLimit }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < state.negativeDays ? (state.atLimit ? 'bg-rose-500' : 'bg-amber-500') : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>0 days left</span>
        <span>-{state.graceLimit} dining stops</span>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-xs ring-1 ring-black/5">
        <span className="font-semibold text-slate-600">Pending deficit</span>
        <span className={`font-extrabold ${state.pendingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
          {state.pendingAmount > 0 ? formatRupees(state.pendingAmount) : 'None'}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">One day = {formatRupees(DAILY_RATE)} (₹1400 for 30 days)</p>
    </button>
  );
});
BalanceCard.displayName = 'BalanceCard';
