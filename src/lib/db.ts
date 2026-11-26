/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DeficitEntry,
  DiningRequest,
  DiningTiming,
  FoodReview,
  GraceExtension,
  HallClosedDay,
  MenuItem,
  MessSettings,
  PaymentSlip,
  Student
} from '@/types';
import { supabase } from './supabaseClient';

/**
 * Supabase access used by DataService when the keys in .env.local are filled in.
 * Reads return what the database gives (Row Level Security decides what each login may see).
 * Writes throw with the database's message so the screen can show why a save failed.
 */

const PAGE = 1000; // Supabase returns at most 1000 rows per request

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const fail = (error: { message: string; code?: string } | null): void => {
  if (error) throw new Error(error.message);
};

/** Reads every page of a query. `build` must include a stable order. */
async function fetchAll<T>(table: string, build: (q: any) => any): Promise<T[]> {
  const { data: firstData, error: firstError, count } = await build(
    client().from(table).select('*', { count: 'exact' })
  ).range(0, PAGE - 1);
  fail(firstError);
  const firstRows = (firstData ?? []) as T[];
  if (firstRows.length < PAGE || !count || count <= PAGE) return firstRows;

  const out: T[] = [...firstRows];
  const starts: number[] = [];
  for (let from = PAGE; from < count; from += PAGE) starts.push(from);

  // Fetch remaining pages in parallel batches of 6 to avoid sequential round-trip bottlenecks.
  for (let i = 0; i < starts.length; i += 6) {
    const batch = starts.slice(i, i + 6);
    const results = await Promise.all(
      batch.map((from) => build(client().from(table).select('*')).range(from, from + PAGE - 1))
    );
    for (const res of results) {
      fail(res.error);
      out.push(...((res.data ?? []) as T[]));
    }
  }
  return out;
}

/** Blank database fields come back as null; the app uses undefined. */
const clean = <T extends object>(row: T): T =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null ? undefined : v])) as T;

/* ------------------------------ students ------------------------------ */

export async function listStudents(): Promise<Student[]> {
  const rows = await fetchAll<Student>('students', (q) => q.order('room_no').order('id'));
  return rows.map(clean);
}

const studentRow = (r: Partial<Student>) => ({
  ...r,
  ...(r.enrollment_no ? { enrollment_no: r.enrollment_no.trim().toUpperCase() } : {}),
  ...(r.email ? { email: r.email.trim().toLowerCase() } : {})
});

export async function insertStudents(rows: Array<Omit<Student, 'id'>>): Promise<Student[]> {
  const { data, error } = await client().from('students').insert(rows.map(studentRow)).select();
  fail(error);
  return ((data ?? []) as Student[]).map(clean);
}

export async function patchStudent(id: string, patch: Partial<Student>): Promise<Student> {
  const { data, error } = await client().from('students').update(studentRow(patch)).eq('id', id).select().single();
  fail(error);
  return clean(data as Student);
}

export async function removeStudent(id: string): Promise<void> {
  const { error } = await client().from('students').delete().eq('id', id);
  fail(error);
}

/* ---------------------- dining on / off requests ---------------------- */

export async function listRequests(opts: { fromDate?: string; studentId?: string } = {}): Promise<DiningRequest[]> {
  // Order by primary key `id` so Postgres uses the index instead of sorting 50k+ rows by unindexed created_at.
  const rows = await fetchAll<DiningRequest>('rebate_requests', (q) => {
    let query = q;
    if (opts.studentId) query = query.eq('student_id', opts.studentId);
    if (opts.fromDate) query = query.or(`start_date.gte.${opts.fromDate},status.eq.pending`);
    return query.order('id');
  });
  return rows
    .map(clean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || a.id.localeCompare(b.id));
}

export async function insertRequest(
  row: Omit<DiningRequest, 'id' | 'created_at' | 'status' | 'reviewed_at'> & { status?: DiningRequest['status'] }
): Promise<DiningRequest> {
  const payload = { ...row, ...(row.status === 'approved' ? { reviewed_at: new Date().toISOString() } : {}) };
  const { data, error } = await client().from('rebate_requests').insert(payload).select().single();
  fail(error);
  return clean(data as DiningRequest);
}

export async function setRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await client()
    .from('rebate_requests')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  fail(error);
}

/* --------------------------------- slips --------------------------------- */

const toSlip = (row: any): PaymentSlip => ({
  ...clean(row),
  amount: Number(row.amount),
  breakup: row.breakup ?? undefined,
  settled_months: row.settled_months ?? undefined
});

export async function listSlips(opts: { enrollmentNo?: string; studentId?: string; fromDate?: string } = {}): Promise<PaymentSlip[]> {
  const rows = await fetchAll<any>('payment_slips', (q) => {
    let query = q;
    if (opts.enrollmentNo) query = query.eq('enrollment_no', opts.enrollmentNo.trim().toUpperCase());
    if (opts.studentId) query = query.eq('student_id', opts.studentId);
    if (opts.fromDate) query = query.gte('paid_on', opts.fromDate);
    return query.order('id');
  });
  return rows
    .map(toSlip)
    .sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.slip_no.localeCompare(b.slip_no));
}

export async function insertSlip(slip: Omit<PaymentSlip, 'id'>): Promise<PaymentSlip> {
  // The same slip number may appear for two students in old records, but a new slip must be unique.
  const { data: taken, error: lookupError } = await client()
    .from('payment_slips')
    .select('id')
    .eq('slip_no', slip.slip_no)
    .limit(1);
  fail(lookupError);
  if (taken && taken.length > 0) throw new Error(`R. No. ${slip.slip_no} has already been used.`);

  const { data, error } = await client()
    .from('payment_slips')
    .insert({
      ...slip,
      breakup: slip.breakup ?? null,
      settled_months: slip.settled_months?.length ? slip.settled_months : null,
      cashier: slip.cashier ?? null
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`Slip No. ${slip.slip_no} has already been used.`);
    throw new Error(error.message);
  }
  return toSlip(data);
}

export async function deleteSlip(id: string): Promise<void> {
  const { error } = await client().from('payment_slips').delete().eq('id', id);
  fail(error);
}

/* ---------------------------- hall closed days ---------------------------- */

export async function listClosedDays(): Promise<HallClosedDay[]> {
  const { data, error } = await client().from('hall_closed_days').select('day, reason').order('day');
  fail(error);
  return (data ?? []) as HallClosedDay[];
}

export async function insertClosedDay(row: HallClosedDay): Promise<void> {
  const { error } = await client().from('hall_closed_days').upsert(row, { onConflict: 'day' });
  fail(error);
}

export async function removeClosedDay(day: string): Promise<void> {
  const { error } = await client().from('hall_closed_days').delete().eq('day', day);
  fail(error);
}

/* -------------------------- carried deficits -------------------------- */

const toEntry = (row: any): DeficitEntry => ({ ...clean(row), amount: Number(row.amount) });

export async function listEntries(): Promise<DeficitEntry[]> {
  const rows = await fetchAll<any>('deficit_entries', (q) => q.order('month_key').order('id'));
  return rows.map(toEntry);
}

export async function insertEntry(row: Omit<DeficitEntry, 'id' | 'created_at'>): Promise<DeficitEntry> {
  const { data, error } = await client().from('deficit_entries').insert(row).select().single();
  fail(error);
  return toEntry(data);
}

/* ---------------------------- grace extensions ---------------------------- */

export async function listExtensions(opts: { studentId?: string; fromDate?: string } = {}): Promise<GraceExtension[]> {
  const rows = await fetchAll<GraceExtension>('grace_extensions', (q) => {
    let query = q;
    if (opts.studentId) query = query.eq('student_id', opts.studentId);
    if (opts.fromDate) query = query.or(`applied_at.gte.${opts.fromDate},status.eq.awaiting_munshi`);
    return query.order('id');
  });
  return rows
    .map(clean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || a.id.localeCompare(b.id));
}

export async function insertExtension(
  row: Omit<GraceExtension, 'id' | 'created_at' | 'status' | 'applied_at'>
): Promise<GraceExtension> {
  const { data, error } = await client().from('grace_extensions').insert(row).select().single();
  fail(error);
  return clean(data as GraceExtension);
}

export async function setExtensionStatus(id: string, status: 'applied' | 'cancelled', appliedOn?: string): Promise<void> {
  const { error } = await client()
    .from('grace_extensions')
    .update({ status, applied_at: status === 'applied' ? appliedOn ?? null : null })
    .eq('id', id);
  fail(error);
}

/* ----------------------------- menu and timings ----------------------------- */

export async function listMenu(): Promise<MenuItem[]> {
  const { data, error } = await client().from('dining_menu').select('weekday, meal, items');
  fail(error);
  return (data ?? []) as MenuItem[];
}

export async function saveMenu(items: MenuItem[]): Promise<void> {
  const rows = items.map((i) => ({ ...i, updated_at: new Date().toISOString() }));
  const { error } = await client().from('dining_menu').upsert(rows, { onConflict: 'weekday,meal' });
  fail(error);
}

export async function listTimings(): Promise<DiningTiming[]> {
  const { data, error } = await client().from('dining_timings').select('meal, start_time, end_time');
  fail(error);
  // Postgres "time" values come back as 12:30:00; the app uses 12:30.
  return ((data ?? []) as DiningTiming[]).map((t) => ({
    ...t,
    start_time: String(t.start_time).slice(0, 5),
    end_time: String(t.end_time).slice(0, 5)
  }));
}

export async function saveTimings(timings: DiningTiming[]): Promise<void> {
  const rows = timings.map((t) => ({ ...t, updated_at: new Date().toISOString() }));
  const { error } = await client().from('dining_timings').upsert(rows, { onConflict: 'meal' });
  fail(error);
}

/* -------------------------------- settings -------------------------------- */

export async function getSettings(): Promise<MessSettings | null> {
  const { data, error } = await client()
    .from('mess_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(error);
  return (data as MessSettings | null) ?? null;
}

/* -------------------------------- reviews -------------------------------- */

export async function listReviews(): Promise<FoodReview[]> {
  const rows = await fetchAll<any>('food_reviews', (q) => q.order('created_at', { ascending: false }).order('id'));
  return rows.map((r) => ({ ...clean(r), overall_rating: Number(r.overall_rating) }));
}

export async function insertReview(review: Omit<FoodReview, 'id' | 'created_at'>): Promise<FoodReview> {
  const { data, error } = await client().from('food_reviews').insert(review).select().single();
  fail(error);
  return clean(data as FoodReview);
}

/* ---------------------------------- staff ---------------------------------- */

/** 'provost' | 'munshi' for staff accounts, null for everyone else. */
export async function staffRole(email: string): Promise<'provost' | 'munshi' | null> {
  const { data, error } = await client()
    .from('staff_users')
    .select('role')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  // A real failure (missing table, no permission) must not look like "you are not registered".
  if (error) throw new Error(error.message);
  return (data?.role as 'provost' | 'munshi' | undefined) ?? null;
}
