/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DiningDailyRecord,
  FoodReview,
  MessSettings,
  MonthlyBill,
  PaymentSlip,
  RebateRequest,
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
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(client().from(table).select('*')).range(from, from + PAGE - 1);
    fail(error);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/* ------------------------------ students ------------------------------ */

export const listStudents = (): Promise<Student[]> =>
  fetchAll<Student>('students', (q) => q.order('room_no').order('id'));

export async function insertStudents(rows: Array<Omit<Student, 'id'>>): Promise<Student[]> {
  const clean = rows.map((r) => ({
    ...r,
    enrollment_no: r.enrollment_no.trim().toUpperCase(),
    email: r.email.trim().toLowerCase()
  }));
  const { data, error } = await client().from('students').insert(clean).select();
  fail(error);
  return (data ?? []) as Student[];
}

export async function removeStudent(id: string): Promise<void> {
  const { error } = await client().from('students').delete().eq('id', id);
  fail(error);
}

/* ------------------------- day-wise dining register ------------------------- */

export const listRecords = (opts: { studentId?: string; date?: string } = {}): Promise<DiningDailyRecord[]> =>
  fetchAll<DiningDailyRecord>('dining_daily_records', (q) => {
    let query = q;
    if (opts.studentId) query = query.eq('student_id', opts.studentId);
    if (opts.date) query = query.eq('date', opts.date);
    return query.order('date').order('id');
  });

export async function upsertRecords(rows: DiningDailyRecord[]): Promise<void> {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  const clean = rows.map((r) => {
    const eaten = r.eaten ?? Boolean(r.lunch || r.dinner);
    return {
      id: r.id,
      student_id: r.student_id,
      enrollment_no: r.enrollment_no,
      date: r.date,
      eaten,
      lunch: r.lunch ?? eaten,
      dinner: r.dinner ?? eaten,
      is_rebate: r.is_rebate,
      rebate_reason: r.rebate_reason ?? null,
      guest_diets: r.guest_diets || 0,
      marked_by: r.marked_by ?? null,
      updated_at: now
    };
  });
  // Insert in chunks so a long closure (hundreds of days) stays inside request limits.
  for (let i = 0; i < clean.length; i += 500) {
    const { error } = await client()
      .from('dining_daily_records')
      .upsert(clean.slice(i, i + 500), { onConflict: 'student_id,date' });
    fail(error);
  }
}

/* -------------------------------- bills -------------------------------- */

export const listBills = (opts: { enrollmentNo?: string; session?: string } = {}): Promise<MonthlyBill[]> =>
  fetchAll<MonthlyBill>('monthly_bills', (q) => {
    let query = q;
    if (opts.enrollmentNo) query = query.eq('enrollment_no', opts.enrollmentNo.trim().toUpperCase());
    if (opts.session) query = query.eq('session', opts.session);
    return query.order('month_key').order('id');
  });

export async function generateBills(monthKey: string): Promise<number> {
  const { data, error } = await client().rpc('generate_monthly_bills', { p_month: monthKey });
  fail(error);
  return Number(data ?? 0);
}

/* --------------------------------- slips --------------------------------- */

const toSlip = (row: any): PaymentSlip => ({ ...row, breakup: row.breakup ?? undefined, cashier: row.cashier ?? undefined });

export async function listSlips(opts: { enrollmentNo?: string } = {}): Promise<PaymentSlip[]> {
  const rows = await fetchAll<any>('payment_slips', (q) => {
    let query = q;
    if (opts.enrollmentNo) query = query.eq('enrollment_no', opts.enrollmentNo.trim().toUpperCase());
    return query.order('paid_on').order('slip_no');
  });
  return rows.map(toSlip);
}

export async function insertSlip(slip: Omit<PaymentSlip, 'id'>): Promise<PaymentSlip> {
  const { data, error } = await client()
    .from('payment_slips')
    .insert({ ...slip, breakup: slip.breakup ?? null, cashier: slip.cashier ?? null })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`R. No. ${slip.slip_no} has already been used.`);
    throw new Error(error.message);
  }
  return toSlip(data);
}

/* -------------------------------- rebates -------------------------------- */

export const listRebates = (): Promise<RebateRequest[]> =>
  fetchAll<RebateRequest>('rebate_requests', (q) => q.order('created_at', { ascending: false }).order('id'));

export async function insertRebate(
  row: Omit<RebateRequest, 'id' | 'created_at' | 'status'> & { status?: RebateRequest['status'] }
): Promise<RebateRequest> {
  const { data, error } = await client().from('rebate_requests').insert(row).select().single();
  fail(error);
  return data as RebateRequest;
}

export async function setRebateStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await client()
    .from('rebate_requests')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
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

export async function saveSettings(s: MessSettings): Promise<void> {
  const { error } = await client()
    .from('mess_settings')
    .upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: 'session' });
  fail(error);
}

/* -------------------------------- reviews -------------------------------- */

export const listReviews = (): Promise<FoodReview[]> =>
  fetchAll<FoodReview>('food_reviews', (q) => q.order('created_at', { ascending: false }).order('id'));

export async function insertReview(review: Omit<FoodReview, 'id' | 'created_at'>): Promise<FoodReview> {
  const { data, error } = await client().from('food_reviews').insert(review).select().single();
  fail(error);
  return data as FoodReview;
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
