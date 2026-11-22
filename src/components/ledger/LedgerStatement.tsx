'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, CalendarDays } from 'lucide-react';
import { PaymentSlip } from '@/types';
import { AccountState, formatDays, formatRupees } from '@/lib/diningEngine';
import { formatDMY } from '@/lib/billingUtils';
import { monthLabel } from '@/components/student/studentUtils';

interface LedgerStatementProps {
  state: AccountState;
  slips: PaymentSlip[];
  todayKey: string;
  /** When set, deposit rows become tappable and open that slip. */
  onOpenSlip?: (slip: PaymentSlip) => void;
}

interface Row {
  id: string;
  date: string;
  kind: 'deposit' | 'month';
  slip?: PaymentSlip;
  monthKey?: string;
}

const COLLAPSED = 12;

/** Deposits and monthly dining in date order: what was paid, which days it bought, and the deficit each month. */
export const LedgerStatement: React.FC<LedgerStatementProps> = ({ state, slips, todayKey, onOpenSlip }) => {
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const list: Row[] = slips.map((s) => ({ id: `d-${s.id}`, date: s.paid_on, kind: 'deposit', slip: s }));
    state.months.forEach((m) => {
      if (m.eatenDays + m.offDays + m.stoppedDays + m.carriedDeficit === 0) return;
      const [y, mo] = m.key.split('-').map(Number);
      const end = `${m.key}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`;
      list.push({ id: `m-${m.key}`, date: end > todayKey ? todayKey : end, kind: 'month', monthKey: m.key });
    });
    return list.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === b.kind ? 0 : a.kind === 'month' ? -1 : 1));
  }, [slips, state, todayKey]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">Nothing recorded yet.</p>;
  }

  const visible = showAll ? rows : rows.slice(0, COLLAPSED);

  return (
    <div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
        {visible.map((row) => {
          if (row.kind === 'deposit' && row.slip) {
            const s = row.slip;
            const r = state.slipResults.get(s.id);
            const Row = onOpenSlip ? 'button' : 'div';
            return (
              <li key={row.id}>
                <Row
                  {...(onOpenSlip ? { type: 'button' as const, onClick: () => onOpenSlip(s) } : {})}
                  className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${onOpenSlip ? 'press active:bg-emerald-50' : ''}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <ArrowDownLeft className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-900">
                      Deposit · R. No. {s.slip_no}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {formatDMY(s.paid_on)}
                      {r && r.mandatoryDays > 0 && ` · paid ${r.mandatoryDays} negative day${r.mandatoryDays > 1 ? 's' : ''}`}
                      {r && r.selectedAmount > 0 && ` · cleared ${formatRupees(r.selectedAmount)} earlier deficit`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-extrabold text-emerald-700">+{formatRupees(s.amount)}</span>
                    <span className="block text-[11px] font-semibold text-slate-500">
                      {r ? `+${formatDays(r.creditedDays)} days` : ''}
                    </span>
                  </span>
                </Row>
              </li>
            );
          }

          const m = row.monthKey ? state.months.get(row.monthKey) : undefined;
          if (!m) return null;
          return (
            <li key={row.id} className="flex items-center gap-3 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <CalendarDays className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-slate-900">{monthLabel(m.key)}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {m.eatenDays} days dined{m.offDays > 0 && ` · ${m.offDays} off`}
                  {m.stoppedDays > 0 && ` · ${m.stoppedDays} stopped`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-xs font-extrabold ${m.totalDeficit > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                  {m.totalDeficit > 0 ? `Deficit ${formatRupees(m.totalDeficit)}` : 'No deficit'}
                </span>
                {m.totalDeficit > 0 && (
                  <span className="block text-[11px] font-semibold text-slate-500">
                    {m.pendingDeficit > 0.005 ? `${formatRupees(m.pendingDeficit)} unpaid` : 'paid'}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {rows.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="press mt-3 w-full rounded-full bg-slate-100 py-2.5 text-xs font-bold text-slate-700"
        >
          {showAll ? 'Show fewer' : `Show all ${rows.length} entries`}
        </button>
      )}
    </div>
  );
};
