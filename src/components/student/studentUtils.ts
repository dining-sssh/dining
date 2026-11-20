import { DiningDailyRecord, RebateRequest } from '@/types';

export const HALL_NAME = 'Sulaiman Hall';

export const SESSIONS = [
  { value: '2026-2027', label: 'Session 2026-2027 (Current)' },
  { value: '2025-2026', label: 'Session 2025-2026 (Previous)' },
  { value: '2024-2025', label: 'Session 2024-2025 (Past)' }
];

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

export const shiftMonth = (monthKey: string, delta: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const formatInDays = (n: number): string => (n === 1 ? 'Tomorrow' : `in ${n} Days`);

/* ------------------------------------------------------------------ */
/* Dining day status                                                   */
/* ------------------------------------------------------------------ */

export type DayStatus = 'done' | 'off' | 'rebate' | 'upcoming' | 'none';

export interface DayInfo {
  status: DayStatus;
  record?: DiningDailyRecord;
  rebateReason?: string;
}

export const isEaten = (r: DiningDailyRecord): boolean =>
  !r.is_rebate && Boolean(r.eaten ?? (r.lunch || r.dinner));

export type DayResolver = (dateKey: string) => DayInfo;

export function createDayResolver(
  records: DiningDailyRecord[],
  rebates: RebateRequest[],
  todayKey: string
): DayResolver {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const approved = rebates.filter((r) => r.status === 'approved');

  return (key: string): DayInfo => {
    const record = byDate.get(key);
    const request = approved.find((r) => key >= r.start_date && key <= r.end_date);

    if (record?.is_rebate) {
      return { status: 'rebate', record, rebateReason: record.rebate_reason ?? request?.reason };
    }
    // Past/today days with a Munshi entry are decided by that entry.
    if (record && key <= todayKey) {
      return { status: isEaten(record) ? 'done' : 'off', record };
    }
    // Approved leave covers days that have no entry yet (mostly upcoming days).
    if (request) {
      return { status: 'rebate', record, rebateReason: request.reason };
    }
    if (key >= todayKey) {
      return { status: 'upcoming', record };
    }
    return { status: 'none' };
  };
}

/* ------------------------------------------------------------------ */
/* Home hero (Active / Inactive / Off)                                 */
/* ------------------------------------------------------------------ */

export type HeroKind = 'active' | 'inactive' | 'off';

export interface HeroState {
  kind: HeroKind;
  lastDiningKey: string | null;
  nextDiningInDays: number | null;
  resumeInDays: number | null;
  offPeriod: { start: string; end: string; reason?: string } | null;
}

const MAX_SCAN_DAYS = 366;

export function computeHeroState(resolve: DayResolver, todayKey: string): HeroState {
  const today = resolve(todayKey);
  const kind: HeroKind =
    today.status === 'rebate' ? 'off' : today.status === 'off' ? 'inactive' : 'active';

  let lastDiningKey: string | null = null;
  for (let i = 0; i <= MAX_SCAN_DAYS; i++) {
    const key = addDays(todayKey, -i);
    if (resolve(key).status === 'done') {
      lastDiningKey = key;
      break;
    }
  }

  let nextDiningInDays: number | null = null;
  for (let i = 1; i <= MAX_SCAN_DAYS; i++) {
    if (resolve(addDays(todayKey, i)).status !== 'rebate') {
      nextDiningInDays = i;
      break;
    }
  }

  let offPeriod: HeroState['offPeriod'] = null;
  let resumeInDays: number | null = null;
  if (kind === 'off') {
    let start = todayKey;
    let end = todayKey;
    for (let i = 0; i < MAX_SCAN_DAYS && resolve(addDays(start, -1)).status === 'rebate'; i++) {
      start = addDays(start, -1);
    }
    for (let i = 0; i < MAX_SCAN_DAYS && resolve(addDays(end, 1)).status === 'rebate'; i++) {
      end = addDays(end, 1);
    }
    offPeriod = { start, end, reason: today.rebateReason };
    resumeInDays = diffDays(todayKey, addDays(end, 1));
  }

  return { kind, lastDiningKey, nextDiningInDays, resumeInDays, offPeriod };
}

/* ------------------------------------------------------------------ */
/* Month statistics                                                    */
/* ------------------------------------------------------------------ */

export interface MonthStats {
  dietsLogged: number;
  daysEaten: number;
  daysNotEaten: number;
  rebateDays: number;
}

export function computeMonthStats(records: DiningDailyRecord[], monthKey: string): MonthStats {
  const inMonth = records.filter((r) => r.date.startsWith(monthKey));
  const eaten = inMonth.filter(isEaten);
  return {
    dietsLogged: eaten.length + inMonth.reduce((acc, r) => acc + (r.guest_diets || 0), 0),
    daysEaten: eaten.length,
    daysNotEaten: inMonth.filter((r) => !r.is_rebate && !isEaten(r)).length,
    rebateDays: inMonth.filter((r) => r.is_rebate).length
  };
}
