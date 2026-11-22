import { DeficitEntry, DiningRequest, GraceExtension, PaymentSlip } from '@/types';

/**
 * The one place where dining days, balance and deficit are worked out. Every panel uses it, so the
 * Student, Munshi and Provost screens always show the same numbers.
 *
 * How it works
 * - Dining is ON every day from the student's start date, until a closing request is approved
 *   (OFF) and until a restart request is approved (ON again).
 * - Every ON day uses one paid day. A deposit buys `amount / DAILY_RATE` days.
 * - When no paid day is left, the student may keep eating for GRACE_DAYS days (balance -1, -2, -3).
 *   Each of those days is a deficit day worth DAILY_RATE.
 * - After that dining stops by itself ("stopped") until the next deposit, or until the Provost
 *   approves more grace days and the Munshi applies them.
 * - The next deposit always pays the negative days first. The Munshi may also choose earlier
 *   months of carried deficit (DeficitEntry) to clear with the same slip.
 * - The dining year runs August to May. June and July are a break and cost nothing.
 */

export const DAILY_RATE = 1400 / 30; // 46.666...
export const GRACE_DAYS = 3;
export const LOW_BALANCE_DAYS = 3; // warn when this few paid days are left

const EPS = 1e-9;

/* ------------------------------ small date helpers ------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');

const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysKey = (key: string, n: number): string => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

/** August to May. June and July are a break. */
export const isDiningMonthNumber = (month: number): boolean => month >= 8 || month <= 5;

export const isDiningDate = (dateKey: string): boolean => isDiningMonthNumber(Number(dateKey.slice(5, 7)));

/** "2026-2027" -> its ten dining months, August 2026 ... May 2027. */
export function diningMonths(session: string): string[] {
  const startYear = Number(session.split('-')[0]);
  return Array.from({ length: 10 }, (_, i) => {
    const m = ((7 + i) % 12) + 1; // 8,9,10,11,12,1,2,3,4,5
    const y = m >= 8 ? startYear : startYear + 1;
    return `${y}-${pad(m)}`;
  });
}

/** Session a date belongs to. June and July belong to the session that starts next August. */
export function sessionOfDate(dateKey: string): string {
  const [y, m] = dateKey.split('-').map(Number);
  const start = m >= 6 ? y : y - 1;
  return `${start}-${start + 1}`;
}

/* --------------------------------- result types --------------------------------- */

export type DayKind =
  | 'eaten' //    dining on, covered by paid days
  | 'deficit' //  dining on, no paid day left: deficit day
  | 'off' //      dining closed
  | 'stopped' //  grace limit reached: dining stopped until payment
  | 'break' //    June / July
  | 'upcoming' // after today
  | 'before'; //  before the student's dining start

export interface DayInfo {
  date: string;
  kind: DayKind;
  /** Rupees of deficit on this day (0 for covered days). */
  deficit: number;
  /** True once a deposit has paid this deficit day. */
  settled: boolean;
  /** Balance in days after this day (negative while in grace). */
  balanceAfter: number;
}

export interface MonthSummary {
  key: string; // 'YYYY-MM'
  eatenDays: number; // covered + deficit days (all days dining was on)
  coveredDays: number;
  deficitDays: number;
  offDays: number;
  stoppedDays: number;
  /** Deficit that built up this month from deficit days. */
  daysDeficit: number;
  /** Carried deficit entered for this month. */
  carriedDeficit: number;
  /** Total deficit for the month = daysDeficit + carriedDeficit. */
  totalDeficit: number;
  /** Part of the month's deficit still unpaid. */
  pendingDeficit: number;
}

export interface SlipPreview {
  /** Negative days that this deposit must pay first. */
  mandatoryDays: number;
  mandatoryAmount: number;
  /** Carried deficit cleared because the Munshi selected those months. */
  selectedAmount: number;
  /** Money left after the above, turned into paid days. */
  creditedDays: number;
  /** Paid days the student will have after this deposit. */
  totalDaysLeft: number;
  /** Smallest amount that covers the mandatory and selected deficits. */
  minimumAmount: number;
  enough: boolean;
}

/** What one deposit did when it was applied. */
export interface SlipResult {
  mandatoryDays: number;
  mandatoryAmount: number;
  selectedAmount: number;
  selectedMonths: string[];
  creditedDays: number;
}

export interface AccountState {
  start: string;
  today: string;
  days: Map<string, DayInfo>;
  months: Map<string, MonthSummary>;
  /** Paid days left (never below 0). */
  wallet: number;
  /** Positive = paid days left, negative = days eaten beyond the paid days. */
  balanceDays: number;
  /** Negative days still unpaid (0 to grace limit). */
  negativeDays: number;
  negativeAmount: number;
  /** Current grace limit (3 plus any days the Provost approved and the Munshi applied). */
  graceLimit: number;
  /** All unpaid deficit: negative days plus carried deficit. */
  pendingAmount: number;
  /** Carried deficit still unpaid, by month (what the Munshi can pick on a slip). */
  carriedPending: Array<{ month: string; amount: number }>;
  /** Today: on, off (closed) or stopped (grace limit reached) or break (June-July). */
  status: 'on' | 'off' | 'stopped' | 'break';
  /** True when the student must pay (or get a Provost extension) before dining can go on. */
  atLimit: boolean;
  offSince?: string;
  totalPaid: number;
  /** What each deposit paid off and how many days it added, by slip id. */
  slipResults: Map<string, SlipResult>;
  /** Day the student last ate (covered or on credit). */
  lastEaten?: string;
}

export interface EngineInput {
  student: { dining_from?: string };
  requests: DiningRequest[];
  slips: PaymentSlip[];
  extensions: GraceExtension[];
  entries: DeficitEntry[];
  todayKey: string;
}

/* ---------------------------------- the engine ---------------------------------- */

interface Open {
  date: string;
  amount: number;
}

export function simulateAccount(input: EngineInput): AccountState {
  const { todayKey } = input;
  const start = input.student.dining_from || todayKey;

  const slips = [...input.slips].sort(
    (a, b) => a.paid_on.localeCompare(b.paid_on) || Number(a.slip_no) - Number(b.slip_no)
  );
  const events = input.requests
    .filter((r) => r.status === 'approved')
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at));
  const applied = input.extensions
    .filter((e) => e.status === 'applied' && e.applied_at)
    .sort((a, b) => String(a.applied_at).localeCompare(String(b.applied_at)));
  const entries = input.entries.map((e) => ({ ...e, settled: false }));

  const days = new Map<string, DayInfo>();
  const months = new Map<string, MonthSummary>();
  const monthOf = (key: string) => {
    const k = key.slice(0, 7);
    let m = months.get(k);
    if (!m) {
      m = {
        key: k,
        eatenDays: 0,
        coveredDays: 0,
        deficitDays: 0,
        offDays: 0,
        stoppedDays: 0,
        daysDeficit: 0,
        carriedDeficit: 0,
        totalDeficit: 0,
        pendingDeficit: 0
      };
      months.set(k, m);
    }
    return m;
  };

  let wallet = 0;
  let open: Open[] = []; // negative days not paid yet (the current run)
  let extra = 0; // grace days approved by the Provost for the current run
  let isOff = false;
  let offSince: string | undefined;
  let lastEaten: string | undefined;
  let totalPaid = 0;
  const slipResults = new Map<string, SlipResult>();
  let si = 0;
  let ri = 0;
  let ei = 0;

  const applySlip = (slip: PaymentSlip) => {
    const chosen = new Set(slip.settled_months ?? []);
    const mandatoryAmount = open.reduce((a, o) => a + o.amount, 0);
    let selectedAmount = 0;
    const selectedMonths = new Set<string>();
    entries.forEach((e) => {
      if (!e.settled && chosen.has(e.month_key)) {
        e.settled = true;
        selectedAmount += e.amount;
        selectedMonths.add(e.month_key);
      }
    });
    const mandatoryDays = open.length;
    open.forEach((o) => {
      const info = days.get(o.date);
      if (info) info.settled = true;
    });
    open = [];
    extra = 0; // a new run starts after a deposit
    totalPaid += slip.amount;
    const credited = Math.floor(Math.max((slip.amount - mandatoryAmount - selectedAmount) / DAILY_RATE, 0) + 1e-9);
    wallet += credited;
    slipResults.set(slip.id, {
      mandatoryDays,
      mandatoryAmount,
      selectedAmount,
      selectedMonths: Array.from(selectedMonths).sort(),
      creditedDays: credited
    });
  };

  for (let d = start; d <= todayKey; d = addDaysKey(d, 1)) {
    while (si < slips.length && slips[si].paid_on <= d) applySlip(slips[si++]);
    while (ri < events.length && events[ri].start_date <= d) {
      const ev = events[ri++];
      if (ev.kind === 'off') {
        if (!isOff) offSince = ev.start_date;
        isOff = true;
      } else {
        isOff = false;
        offSince = undefined;
      }
    }
    while (ei < applied.length && String(applied[ei].applied_at) <= d) extra += applied[ei++].extra_days;

    const month = monthOf(d);
    let kind: DayKind;
    let deficit = 0;

    if (!isDiningDate(d)) {
      kind = 'break';
    } else if (isOff) {
      kind = 'off';
      month.offDays += 1;
    } else if (open.length >= GRACE_DAYS + extra) {
      kind = 'stopped';
      month.stoppedDays += 1;
    } else {
      month.eatenDays += 1;
      lastEaten = d;
      if (wallet >= 1 - EPS) {
        wallet = Math.max(wallet - 1, 0);
        kind = 'eaten';
        month.coveredDays += 1;
      } else {
        deficit = (1 - wallet) * DAILY_RATE; // a part of a day may still be paid for
        wallet = 0;
        kind = 'deficit';
        open.push({ date: d, amount: deficit });
        month.deficitDays += 1;
        month.daysDeficit += deficit;
      }
    }

    days.set(d, {
      date: d,
      kind,
      deficit,
      settled: false,
      balanceAfter: wallet > EPS ? wallet : -open.length
    });
  }

  // Deposits made after the last simulated day (for example a future-dated or early slip).
  while (si < slips.length && slips[si].paid_on <= todayKey) applySlip(slips[si++]);

  entries.forEach((e) => {
    const m = monthOf(e.month_key);
    m.carriedDeficit += e.amount;
  });
  days.forEach((info) => {
    if (info.deficit > 0 && !info.settled) monthOf(info.date).pendingDeficit += info.deficit;
  });
  entries.forEach((e) => {
    if (!e.settled) monthOf(e.month_key).pendingDeficit += e.amount;
  });
  months.forEach((m) => {
    m.totalDeficit = m.daysDeficit + m.carriedDeficit;
  });

  const carriedByMonth = new Map<string, number>();
  entries.forEach((e) => {
    if (!e.settled) carriedByMonth.set(e.month_key, (carriedByMonth.get(e.month_key) ?? 0) + e.amount);
  });
  const carriedPending = Array.from(carriedByMonth.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const negativeAmount = open.reduce((a, o) => a + o.amount, 0);
  const graceLimit = GRACE_DAYS + extra;
  const atLimit = open.length >= graceLimit;
  const carriedTotal = carriedPending.reduce((a, c) => a + c.amount, 0);

  let status: AccountState['status'];
  if (!isDiningDate(todayKey)) status = 'break';
  else if (isOff) status = 'off';
  else if (atLimit) status = 'stopped';
  else status = 'on';

  return {
    start,
    today: todayKey,
    days,
    months,
    wallet,
    balanceDays: wallet > EPS ? wallet : -open.length,
    negativeDays: open.length,
    negativeAmount,
    graceLimit,
    pendingAmount: negativeAmount + carriedTotal,
    carriedPending,
    status,
    atLimit,
    offSince,
    totalPaid,
    slipResults,
    lastEaten
  };
}

/** Dining is running (or only paused for the June-July break): not closed and not stopped for balance. */
export const isDiningActive = (state: AccountState): boolean => state.status === 'on' || state.status === 'break';

/* ------------------------------ looking at single days ------------------------------ */

/** The state of any date: past days from the simulation, later days from what is known today. */
export function dayInfoFor(state: AccountState, requests: DiningRequest[], date: string): DayInfo {
  const known = state.days.get(date);
  if (known) return known;
  if (date < state.start) return { date, kind: 'before', deficit: 0, settled: false, balanceAfter: 0 };
  if (!isDiningDate(date)) return { date, kind: 'break', deficit: 0, settled: false, balanceAfter: 0 };

  // After today: only approved requests that start on or before that day are known.
  let off = state.status === 'off';
  requests
    .filter((r) => r.status === 'approved' && r.start_date <= date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.created_at.localeCompare(b.created_at))
    .forEach((r) => {
      off = r.kind === 'off';
    });
  return { date, kind: off ? 'off' : 'upcoming', deficit: 0, settled: false, balanceAfter: state.balanceDays };
}

/* ------------------------------------ cut slip ------------------------------------ */

/** What a deposit of `amount` would do, with the chosen carried-deficit months cleared. */
export function previewSlip(state: AccountState, amount: number, settleMonths: string[]): SlipPreview {
  const chosen = new Set(settleMonths);
  const selectedAmount = state.carriedPending.filter((c) => chosen.has(c.month)).reduce((a, c) => a + c.amount, 0);
  const mandatoryAmount = state.negativeAmount;
  const minimumAmount = mandatoryAmount + selectedAmount;
  const enough = amount + EPS >= minimumAmount;
  const creditedDays = enough ? Math.floor((amount - minimumAmount) / DAILY_RATE + 1e-9) : 0;
  return {
    mandatoryDays: state.negativeDays,
    mandatoryAmount,
    selectedAmount,
    creditedDays,
    totalDaysLeft: Math.floor(state.wallet + creditedDays + 1e-9),
    minimumAmount,
    enough
  };
}

/* ------------------------------------ formatting ------------------------------------ */

/** Floor to whole integer days without decimal values (e.g., 12.4 -> "12", 12.9 -> "12"). */
export const formatDays = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? -1 : 1;
  const floored = Math.floor(Math.abs(n) + 1e-9);
  return String(sign * floored);
};

/** ₹46.67 for the daily rate, whole rupees for bigger sums. */
export const formatRupees = (n: number): string => {
  const abs = Math.abs(n);
  const text =
    abs < 1000 && Math.abs(abs - Math.round(abs)) > 0.005
      ? abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(abs).toLocaleString('en-IN');
  return `${n < 0 ? '-' : ''}₹${text}`;
};
