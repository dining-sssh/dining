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

/** Suggested Slip No. for the next slip: one more than the highest Slip No. issued so far. */
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
