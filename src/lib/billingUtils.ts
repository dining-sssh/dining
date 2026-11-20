import { MonthlyBill, PaymentSlip } from '@/types';

export const formatMoney = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** "2026-10-28" -> "28/10/2026" */
export const formatDMY = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

export interface AccountSummary {
  totalCharged: number;
  totalPaid: number;
  /** charged - paid. Positive = deficit (student owes), negative = advance balance. */
  balance: number;
}

export function summarizeAccount(bills: MonthlyBill[], slips: PaymentSlip[]): AccountSummary {
  const totalCharged = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const totalPaid = slips.reduce((acc, s) => acc + (s.amount || 0), 0);
  return { totalCharged, totalPaid, balance: totalCharged - totalPaid };
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const below100 = (n: number): string =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;

const below1000 = (n: number): string => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? below100(rest) : ''].filter(Boolean).join(' ');
};

/** Whole rupees in words using the Indian system (thousand, lakh, crore). */
export function rupeesInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts = [
    crore ? `${below1000(crore)} Crore` : '',
    lakh ? `${below100(lakh)} Lakh` : '',
    thousand ? `${below100(thousand)} Thousand` : '',
    rest ? below1000(rest) : ''
  ].filter(Boolean);

  return `${parts.join(' ')} Rupees Only`;
}

export interface LedgerEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: 'charge' | 'deposit';
  label: string;
  detail?: string;
  /** Added to the deficit (monthly bill). */
  debit: number;
  /** Reduces the deficit (deposit slip). */
  credit: number;
  /** Running balance after this entry. Positive = deficit, negative = advance. */
  balance: number;
  slip?: PaymentSlip;
}

/**
 * One chronological statement from the monthly bills (charges) and the deposit slips (credits).
 * A month's bill is dated on its last day; the running month is dated today.
 */
export function buildLedger(bills: MonthlyBill[], slips: PaymentSlip[], todayKey: string): LedgerEntry[] {
  type Raw = Omit<LedgerEntry, 'balance'>;
  const raw: Raw[] = [];

  bills.forEach((b) => {
    const [y, m] = b.month_key.split('-').map(Number);
    const monthEnd = `${b.month_key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    const running = monthEnd > todayKey;
    raw.push({
      id: `charge-${b.id}`,
      date: running ? todayKey : monthEnd,
      kind: 'charge',
      label: `${b.month_name} dining bill`,
      detail: `${b.total_diets} diets${running ? ' · month running' : ''}`,
      debit: b.total_amount || 0,
      credit: 0
    });
  });

  slips.forEach((s) =>
    raw.push({
      id: `deposit-${s.id}`,
      date: s.paid_on,
      kind: 'deposit',
      label: `Deposit · R. No. ${s.slip_no}`,
      detail: `Book ${s.book_no}`,
      debit: 0,
      credit: s.amount || 0,
      slip: s
    })
  );

  raw.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'charge' ? -1 : 1) || a.id.localeCompare(b.id));

  let balance = 0;
  return raw.map((e) => {
    balance += e.debit - e.credit;
    return { ...e, balance };
  });
}

/** Suggested Book No. and R. No. for the next slip: one more than the highest R. No. issued so far. */
export function nextSlipNumbers(slips: PaymentSlip[]): { bookNo: string; slipNo: string } {
  let top: PaymentSlip | null = null;
  slips.forEach((s) => {
    if (!top || Number(s.slip_no) > Number(top.slip_no)) top = s;
  });
  const last = top as PaymentSlip | null;
  return last
    ? { bookNo: last.book_no, slipNo: String((Number(last.slip_no) || 0) + 1) }
    : { bookNo: '1', slipNo: '1' };
}
export interface BillDeficit {
  bill: MonthlyBill;
  /** Part of this month's bill covered by deposits. */
  applied: number;
  /** Part still unpaid. This is the month's deficit. */
  deficit: number;
}

/**
 * Deposits are applied to the oldest bill first, so each month ends up with a deficit (what is still
 * unpaid for that month). The deficits add up to the pending deficit; anything left over is the advance.
 */
export function allocateDeficits(
  bills: MonthlyBill[],
  slips: PaymentSlip[]
): { months: BillDeficit[]; pending: number; advance: number } {
  let pool = slips.reduce((acc, s) => acc + (s.amount || 0), 0);
  const months = [...bills]
    .sort((a, b) => a.month_key.localeCompare(b.month_key))
    .map((bill) => {
      const total = bill.total_amount || 0;
      const applied = Math.min(total, pool);
      pool -= applied;
      return { bill, applied, deficit: total - applied };
    });
  return { months, pending: months.reduce((acc, m) => acc + m.deficit, 0), advance: pool };
}