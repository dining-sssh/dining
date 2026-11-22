import { DiningRequest, GraceExtension } from '@/types';
import {
  AccountState,
  DayInfo,
  DayKind,
  LOW_BALANCE_DAYS,
  dayInfoFor,
  diningMonths,
  formatDays,
  formatRupees,
  sessionOfDate as engineSessionOfDate
} from '@/lib/diningEngine';

export const HALL_NAME = 'Sulaiman Hall';

export const SESSIONS = [
  { value: '2026-2027', label: 'Session 2026-2027 (Current)' },
  { value: '2025-2026', label: 'Session 2025-2026 (Previous)' },
  { value: '2024-2025', label: 'Session 2024-2025 (Past)' }
];

/** The dining year runs August to May. */
export const sessionMonths = diningMonths;
export const sessionOfDate = engineSessionOfDate;

/* ------------------------------------------------------------------ */
/* Date helpers (all keys are local-time "YYYY-MM-DD" strings)         */
/* ------------------------------------------------------------------ */

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number): string => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

export const diffDays = (fromKey: string, toKey: string): number =>
  Math.round((parseDateKey(toKey).getTime() - parseDateKey(fromKey).getTime()) / 86400000);

/** "Tue, 28 Oct 2025" */
export const formatLongDate = (key: string): string => {
  const d = parseDateKey(key);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

/** "24 Nov" */
export const formatDayMonth = (key: string): string => {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const weekdayShort = (key: string): string => WEEKDAYS_SHORT[parseDateKey(key).getDay()];

/** "2026-11" -> "November 2026" */
export const monthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};

/** "2026-11" -> "Nov-26" */
export const monthTag = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]}-${String(y).slice(2)}`;
};

export const shiftMonth = (monthKey: string, delta: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const formatInDays = (n: number): string => (n === 1 ? 'Tomorrow' : `in ${n} Days`);

/* ------------------------------------------------------------------ */
/* Calendar day labels                                                 */
/* ------------------------------------------------------------------ */

export const DAY_LABEL: Record<DayKind, string> = {
  eaten: 'Dining done',
  deficit: 'Eaten on deficit',
  off: 'Dining off',
  stopped: 'Dining stopped',
  break: 'Vacation (June, July)',
  upcoming: 'Upcoming',
  before: 'Before dining started'
};

/** The sentence shown when a date is tapped or hovered. */
export function describeDay(info: DayInfo): string {
  if (info.kind === 'deficit') {
    return `${DAY_LABEL.deficit}. Deficit ${formatRupees(info.deficit)}${info.settled ? ' (paid)' : ' (unpaid)'}`;
  }
  if (info.kind === 'eaten') return `${DAY_LABEL.eaten}. No deficit`;
  if (info.kind === 'stopped') return `${DAY_LABEL.stopped}. Pay to start again. No deficit`;
  return `${DAY_LABEL[info.kind]}. No deficit`;
}

/* ------------------------------------------------------------------ */
/* Home hero                                                           */
/* ------------------------------------------------------------------ */

export type HeroKind = 'active' | 'grace' | 'stopped' | 'off' | 'break';

export interface HeroState {
  kind: HeroKind;
  lastDiningKey: string | null;
  /** Days until the next dining day, when it is known. */
  nextDiningInDays: number | null;
  /** Off: days until dining restarts (only when a restart is already approved). */
  resumeInDays: number | null;
  offSince: string | null;
  balanceDays: number;
  negativeDays: number;
  graceLimit: number;
  pendingAmount: number;
}

export function computeHero(state: AccountState, requests: DiningRequest[], todayKey: string): HeroState {
  const kind: HeroKind =
    state.status === 'off'
      ? 'off'
      : state.status === 'stopped'
      ? 'stopped'
      : state.status === 'break'
      ? 'break'
      : state.negativeDays > 0
      ? 'grace'
      : 'active';

  let nextDiningInDays: number | null = null;
  let resumeInDays: number | null = null;
  for (let i = 1; i <= 366; i++) {
    const k = dayInfoFor(state, requests, addDays(todayKey, i)).kind;
    if (k === 'upcoming') {
      if (kind === 'off') resumeInDays = i;
      else nextDiningInDays = i;
      break;
    }
  }
  if (kind === 'stopped') nextDiningInDays = null;

  return {
    kind,
    lastDiningKey: state.lastEaten ?? null,
    nextDiningInDays,
    resumeInDays,
    offSince: state.offSince ?? null,
    balanceDays: state.balanceDays,
    negativeDays: state.negativeDays,
    graceLimit: state.graceLimit,
    pendingAmount: state.pendingAmount
  };
}

/* ------------------------------------------------------------------ */
/* Notifications (worked out again on every load, so they stay until   */
/* the balance is fixed)                                               */
/* ------------------------------------------------------------------ */

export interface Notice {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
}

export function buildNotices(
  state: AccountState,
  requests: DiningRequest[],
  extensions: GraceExtension[],
  todayKey: string
): Notice[] {
  const notices: Notice[] = [];

  if (state.status === 'stopped') {
    notices.push({
      id: 'stopped',
      level: 'critical',
      title: 'Dining stopped',
      body: `You have used all ${state.graceLimit} grace days (balance -${state.negativeDays}). Deposit at the Munshi office to start again, or ask for an extension.`
    });
  } else if (state.status === 'on' && state.negativeDays > 0) {
    notices.push({
      id: 'grace',
      level: 'warning',
      title: `Balance is -${state.negativeDays} day${state.negativeDays > 1 ? 's' : ''}`,
      body: `You are eating on grace days (${state.negativeDays} of ${state.graceLimit}). Dining stops at -${state.graceLimit}. Deposit ${formatRupees(
        state.negativeAmount
      )} or more to clear it.`
    });
  } else if (state.status === 'on' && state.wallet <= 1e-9) {
    notices.push({
      id: 'zero',
      level: 'critical',
      title: '0 days left',
      body: `Your dining balance has run out. You can still eat for ${state.graceLimit} grace days, then dining stops. Please deposit now.`
    });
  } else if (state.status === 'on' && state.wallet <= LOW_BALANCE_DAYS) {
    notices.push({
      id: 'low',
      level: 'warning',
      title: `Only ${formatDays(state.wallet)} day${state.wallet > 1 ? 's' : ''} left`,
      body: 'Your paid days are about to finish. Deposit at the Munshi office to avoid a deficit.'
    });
  }

  const carried = state.carriedPending.reduce((a, c) => a + c.amount, 0);
  if (carried > 0) {
    notices.push({
      id: 'carried',
      level: 'info',
      title: `Earlier deficit ${formatRupees(carried)}`,
      body: `Pending for ${state.carriedPending.map((c) => monthTag(c.month)).join(', ')}. The Munshi can clear it with your next deposit.`
    });
  }

  if (state.status === 'off' && state.offSince) {
    notices.push({
      id: 'off',
      level: 'info',
      title: 'Dining is off',
      body: `Closed since ${formatLongDate(state.offSince)}. Use "Request to open dining" when you are back.`
    });
  }

  requests
    .filter((r) => r.status === 'pending')
    .forEach((r) =>
      notices.push({
        id: `req-${r.id}`,
        level: 'info',
        title: r.kind === 'off' ? 'Dining off request is pending' : 'Open dining request is pending',
        body: `From ${formatLongDate(r.start_date)}. The Munshi will review it.`
      })
    );

  requests
    .filter((r) => r.status !== 'pending' && r.reviewed_at && diffDays(String(r.reviewed_at).slice(0, 10), todayKey) <= 7)
    .forEach((r) =>
      notices.push({
        id: `dec-${r.id}`,
        level: 'info',
        title: `Request ${r.status}`,
        body: `${r.kind === 'off' ? 'Dining off' : 'Open dining'} from ${formatLongDate(r.start_date)}.`
      })
    );

  extensions
    .filter((e) => e.status === 'applied' && e.applied_at && diffDays(String(e.applied_at), todayKey) <= 7)
    .forEach((e) =>
      notices.push({
        id: `ext-${e.id}`,
        level: 'info',
        title: `${e.extra_days} extra grace day${e.extra_days > 1 ? 's' : ''} approved`,
        body: 'The Provost approved more days beyond -3 and the Munshi has applied them.'
      })
    );

  return notices;
}
