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
