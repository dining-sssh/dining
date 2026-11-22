import { PaymentSlip } from '@/types';

/** "2026-10-28" -> "28/10/2026" */
export const formatDMY = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

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

/**
 * Suggested Slip No. for the next slip. Slip numbers look like "157/15692" (book/number) or just
 * "15692"; the suggestion is the highest one issued so far, plus one on the last number.
 */
export function nextSlipNumbers(slips: PaymentSlip[]): { bookNo: string; slipNo: string } {
  let best: { prefix: string; book: number; serial: number } | null = null;
  slips.forEach((s) => {
    const m = /^(?:(\d+)\/)?(\d+)$/.exec(String(s.slip_no).trim());
    if (!m) return; // online payments and adjustments have no slip number
    const book = m[1] ? Number(m[1]) : 0;
    const serial = Number(m[2]);
    if (!best || serial > best.serial || (serial === best.serial && book > best.book)) {
      best = { prefix: m[1] ? `${m[1]}/` : '', book, serial };
    }
  });
  const top = best as { prefix: string; book: number; serial: number } | null;
  return top ? { bookNo: '1', slipNo: `${top.prefix}${top.serial + 1}` } : { bookNo: '1', slipNo: '1' };
}
/** Only a real food charges slip can be printed. Online payments and adjustments have no slip. */
export const isPrintableSlip = (s: PaymentSlip): boolean => !s.mode || s.mode === 'slip';

/** What to call a payment on screen. */
export function paymentLabel(s: PaymentSlip): string {
  if (isPrintableSlip(s)) return `Slip No. ${s.slip_no}`;
  if (s.mode === 'online') return 'Online payment';
  return s.note ? `Adjustment · ${s.note}` : 'Balance adjustment';
}