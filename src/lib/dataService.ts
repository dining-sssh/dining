import { 
  Student, 
  DiningDailyRecord, 
  MonthlyBill, 
  PaymentSlip, 
  RebateRequest, 
  MessSettings, 
  HostelHouseCode, 
  FoodReview, 
  DailyReviewSummary, 
  HOSTEL_HOUSES 
} from '@/types';
import { 
  INITIAL_STUDENTS, 
  INITIAL_SETTINGS, 
  generateInitialDailyRecords, 
  generateInitialBills, 
  generateInitialPayments, 
  INITIAL_REBATES,
  INITIAL_REVIEWS
} from './mockData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as db from './db';

const STORAGE_KEY_STUDENTS = 'amu_dining_students';
// v2 keys: the mock ledger was regenerated (full session of records, consistent bills and slips).
const STORAGE_KEY_RECORDS = 'amu_dining_records_v2';
const STORAGE_KEY_BILLS = 'amu_dining_bills_v2';
const STORAGE_KEY_PAYMENTS = 'amu_dining_payments_v1';
const STORAGE_KEY_REBATES = 'amu_dining_rebates';
const STORAGE_KEY_SETTINGS = 'amu_dining_settings';
const STORAGE_KEY_REVIEWS = 'amu_dining_reviews';

/**
 * With Supabase keys in .env.local every call goes to the database (and Row Level Security decides
 * what each login may see). Without keys the app runs on demo data kept in the browser (localStorage).
 */
const useDb = (): boolean => isSupabaseConfigured && Boolean(supabase);

// Parsed copies of what is in localStorage, so big lists are not re-parsed on every call.
const parsedCache = new Map<string, { raw: string; value: unknown }>();

// Helper to get from LocalStorage or initialize with mock data.
// `initialData` may be a function so the mock data is only generated when it is actually needed.
function getLocal<T>(key: string, initialData: T | (() => T)): T {
  const resolveInitial = (): T =>
    typeof initialData === 'function' ? (initialData as () => T)() : initialData;

  if (typeof window === 'undefined') return resolveInitial();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = resolveInitial();
      setLocal(key, initial);
      return initial;
    }
    const cached = parsedCache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    const value = JSON.parse(raw) as T;
    parsedCache.set(key, { raw, value });
    return value;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return resolveInitial();
  }
}

function setLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(data);
    localStorage.setItem(key, raw);
    parsedCache.set(key, { raw, value: data });
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

/** A failed read must not blank the whole screen: log it and show an empty list. */
async function safeRead<T>(label: string, read: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await read();
  } catch (e) {
    console.error(`Could not load ${label} from Supabase:`, e);
    return empty;
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Every YYYY-MM-DD from start to end (inclusive), at most 400 days. */
function eachDate(start: string, end: string): string[] {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  const out: string[] = [];
  while (cur <= last && out.length < 400) {
    out.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export const DataService = {
  // Check connection status
  isLiveSupabase(): boolean {
    return useDb();
  },

  // --- LOGIN ---
  /** Provost / Munshi role from the staff_users table. Null for students, or when no database is connected. */
  async getStaffRole(email: string): Promise<'provost' | 'munshi' | null> {
    if (!useDb()) return null;
    return db.staffRole(email);
  },

  // --- STUDENTS ---
  /** strict makes database errors throw (used by login, so the real reason can be shown). */
  async getStudents(opts: { strict?: boolean } = {}): Promise<Student[]> {
    if (useDb()) return opts.strict ? db.listStudents() : safeRead('students', db.listStudents, []);
    return getLocal<Student[]>(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
  },

  async addStudent(student: Omit<Student, 'id'>): Promise<Student> {
    if (useDb()) {
      const [created] = await db.insertStudents([student]);
      return created;
    }

    const newStudent: Student = {
      ...student,
      previous_room: student.previous_room?.trim() || 'New Allotment',
      id: `s-${Date.now()}`
    };
    const students = await this.getStudents();
    const updated = [newStudent, ...students];
    setLocal(STORAGE_KEY_STUDENTS, updated);
    return newStudent;
  },

  async bulkAddStudents(csvStudents: Array<{
    enrollment_no: string;
    name: string;
    house: HostelHouseCode;
    room_no: string;
    course: string;
    email: string;
    previous_room?: string;
  }>): Promise<{ added: number; errors: string[] }> {
    const existing = await this.getStudents();
    const existingEnrollments = new Set(existing.map(s => s.enrollment_no.toUpperCase()));
    const existingEmails = new Set(existing.map(s => s.email.toLowerCase()));
    const errors: string[] = [];
    const validToAdd: Student[] = [];

    csvStudents.forEach((row, idx) => {
      const lineNum = idx + 2;
      const enr = row.enrollment_no?.trim().toUpperCase();

      if (!enr) {
        errors.push(`Row ${lineNum}: Missing Enrollment Number.`);
        return;
      }
      if (existingEnrollments.has(enr)) {
        errors.push(`Row ${lineNum}: Enrollment ${enr} already exists.`);
        return;
      }
      if (!['HM', 'BH', 'QH', 'KH', 'AK', 'MB'].includes(row.house)) {
        errors.push(`Row ${lineNum}: Invalid House code "${row.house}". Must be HM, BH, QH, KH, AK, or MB.`);
        return;
      }
      if (!row.name?.trim()) {
        errors.push(`Row ${lineNum}: Missing student Name.`);
        return;
      }
      if (!row.room_no?.trim()) {
        errors.push(`Row ${lineNum}: Missing Room Number.`);
        return;
      }

      const email = (row.email?.trim() || `${enr.toLowerCase()}@myamu.ac.in`).toLowerCase();
      if (existingEmails.has(email)) {
        errors.push(`Row ${lineNum}: Email ${email} is already used by another student.`);
        return;
      }

      existingEnrollments.add(enr);
      existingEmails.add(email);
      validToAdd.push({
        id: `s-${Date.now()}-${idx}`,
        enrollment_no: enr,
        name: row.name.trim(),
        house: row.house,
        room_no: row.room_no.trim(),
        course: row.course?.trim() || 'General Course',
        email,
        previous_room: row.previous_room?.trim() || 'New Allotment',
        session: '2026-2027',
        status: 'active'
      });
    });

    if (validToAdd.length > 0) {
      if (useDb()) {
        try {
          // The database makes the ids.
          await db.insertStudents(validToAdd.map(({ id: _id, ...rest }) => rest));
        } catch (e) {
          return { added: 0, errors: [...errors, e instanceof Error ? e.message : 'Could not save students.'] };
        }
      } else {
        setLocal(STORAGE_KEY_STUDENTS, [...existing, ...validToAdd]);
      }
    }

    return { added: validToAdd.length, errors };
  },

  async deleteStudent(id: string): Promise<void> {
    if (useDb()) {
      await db.removeStudent(id);
      return;
    }
    const students = await this.getStudents();
    const updated = students.filter(s => s.id !== id);
    setLocal(STORAGE_KEY_STUDENTS, updated);
  },

  // --- DAY-WISE DINING RECORDS ---
  async getDailyRecordsForDate(dateStr: string): Promise<DiningDailyRecord[]> {
    if (useDb()) return safeRead('dining records', () => db.listRecords({ date: dateStr }), []);

    const students = await this.getStudents();
    const allRecords = getLocal<DiningDailyRecord[]>(
      STORAGE_KEY_RECORDS, 
      () => generateInitialDailyRecords(students)
    );

    let recordsForDate = allRecords.filter(r => r.date === dateStr);

    // Demo data only: a day nobody has marked yet starts with everyone present.
    if (recordsForDate.length === 0) {
      recordsForDate = students.map(s => ({
        id: `rec-${s.id}-${dateStr}`,
        student_id: s.id,
        enrollment_no: s.enrollment_no,
        date: dateStr,
        eaten: true,
        lunch: true,
        dinner: true,
        is_rebate: false,
        guest_diets: 0,
        marked_by: 'Munshi'
      }));
      const updated = [...allRecords, ...recordsForDate];
      setLocal(STORAGE_KEY_RECORDS, updated);
    }

    return recordsForDate;
  },

  /** Pass `studentId` to load one student's days only (much lighter on a real database). */
  async getAllDailyRecords(opts: { studentId?: string } = {}): Promise<DiningDailyRecord[]> {
    if (useDb()) return safeRead('dining records', () => db.listRecords({ studentId: opts.studentId }), []);

    const students = await this.getStudents();
    const all = getLocal<DiningDailyRecord[]>(
      STORAGE_KEY_RECORDS, 
      () => generateInitialDailyRecords(students)
    );
    return opts.studentId ? all.filter(r => r.student_id === opts.studentId) : all;
  },

  async updateDailyRecords(recordsToUpdate: DiningDailyRecord[]): Promise<void> {
    if (useDb()) {
      await db.upsertRecords(recordsToUpdate);
      return;
    }

    const currentRecords = await this.getAllDailyRecords();
    const map = new Map(currentRecords.map(r => [`${r.student_id}_${r.date}`, r]));

    recordsToUpdate.forEach(r => {
      map.set(`${r.student_id}_${r.date}`, r);
    });

    setLocal(STORAGE_KEY_RECORDS, Array.from(map.values()));
  },

  // --- MONTHLY BILLS ---
  async getMonthlyBills(session?: string): Promise<MonthlyBill[]> {
    if (useDb()) return safeRead('bills', () => db.listBills({ session }), []);

    const students = await this.getStudents();
    const bills = getLocal<MonthlyBill[]>(
      STORAGE_KEY_BILLS, 
      () => generateInitialBills(students)
    );
    if (session) {
      return bills.filter(b => b.session === session);
    }
    return bills;
  },

  async getBillsForStudent(enrollmentNo: string, session?: string): Promise<MonthlyBill[]> {
    if (useDb()) return safeRead('bills', () => db.listBills({ enrollmentNo, session }), []);

    const allBills = await this.getMonthlyBills();
    return allBills.filter(b => 
      b.enrollment_no.toUpperCase() === enrollmentNo.toUpperCase() &&
      (!session || b.session === session)
    );
  },

  /** Makes (or refreshes) every active student's bill for a month from the register and current rates. Live database only. */
  async generateBills(monthKey: string): Promise<number> {
    if (!useDb()) return 0;
    return db.generateBills(monthKey);
  },

  // --- PAYMENT SLIPS (Food Charges Slips) ---
  async getPaymentSlips(): Promise<PaymentSlip[]> {
    if (useDb()) return safeRead('slips', () => db.listSlips(), []);

    const students = await this.getStudents();
    return getLocal<PaymentSlip[]>(STORAGE_KEY_PAYMENTS, () => generateInitialPayments(students));
  },

  async getPaymentSlipsForStudent(enrollmentNo: string): Promise<PaymentSlip[]> {
    if (useDb()) return safeRead('slips', () => db.listSlips({ enrollmentNo }), []);

    const all = await this.getPaymentSlips();
    return all.filter(s => s.enrollment_no.toUpperCase() === enrollmentNo.toUpperCase());
  },

  async addPaymentSlip(slip: Omit<PaymentSlip, 'id'>): Promise<PaymentSlip> {
    if (useDb()) return db.insertSlip(slip);

    const all = await this.getPaymentSlips();
    if (all.some(s => s.slip_no === slip.slip_no)) {
      throw new Error(`R. No. ${slip.slip_no} has already been used.`);
    }
    const created: PaymentSlip = { ...slip, id: `slip-${Date.now()}-${slip.slip_no}` };
    setLocal(STORAGE_KEY_PAYMENTS, [...all, created]);
    return created;
  },

  // --- REBATES ---
  async getRebateRequests(): Promise<RebateRequest[]> {
    if (useDb()) return safeRead('rebate requests', db.listRebates, []);
    return getLocal<RebateRequest[]>(STORAGE_KEY_REBATES, INITIAL_REBATES);
  },

  async addRebateRequest(req: Omit<RebateRequest, 'id' | 'status' | 'created_at'>): Promise<RebateRequest> {
    if (useDb()) return db.insertRebate(req);

    const newReq: RebateRequest = {
      ...req,
      id: `reb-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0]
    };
    const rebates = await this.getRebateRequests();
    const updated = [newReq, ...rebates];
    setLocal(STORAGE_KEY_REBATES, updated);
    return newReq;
  },

  /** Marks every day from start to end as mess off for one student, keeping guest diets already noted. */
  async markRebateDays(params: {
    studentId: string;
    enrollmentNo: string;
    start: string;
    end: string;
    reason: string;
    markedBy: string;
  }): Promise<number> {
    const existing = await this.getAllDailyRecords({ studentId: params.studentId });
    const byDate = new Map(existing.map((r) => [r.date, r]));

    const rows: DiningDailyRecord[] = eachDate(params.start, params.end).map((date) => ({
      id: `rec-${params.studentId}-${date}`,
      student_id: params.studentId,
      enrollment_no: params.enrollmentNo,
      guest_diets: 0,
      ...byDate.get(date),
      date,
      eaten: false,
      lunch: false,
      dinner: false,
      is_rebate: true,
      rebate_reason: params.reason,
      marked_by: params.markedBy
    }));

    await this.updateDailyRecords(rows);
    return rows.length;
  },

  async updateRebateStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const rebates = await this.getRebateRequests();
    const reb = rebates.find(r => r.id === id);

    if (useDb()) {
      await db.setRebateStatus(id, status);
    } else {
      setLocal(STORAGE_KEY_REBATES, rebates.map(r => (r.id === id ? { ...r, status } : r)));
    }

    // Approved leave becomes mess-off days in the register
    if (status === 'approved' && reb) {
      await this.markRebateDays({
        studentId: reb.student_id,
        enrollmentNo: reb.enrollment_no,
        start: reb.start_date,
        end: reb.end_date,
        reason: reb.reason,
        markedBy: 'Provost'
      });
    }
  },

  /**
   * Closes dining for a student starting from effectiveDate to endDate.
   * Enforces AMU rule: If the student has already eaten lunch/meals today,
   * dining cannot be closed on the same day; closure must take effect from the next day.
   */
  async closeDiningForStudent(params: {
    studentId: string;
    enrollmentNo: string;
    studentName: string;
    effectiveDate: string; // YYYY-MM-DD
    endDate: string;       // YYYY-MM-DD
    reason: string;
    markedBy?: string;
  }): Promise<{ affectedDays: number; rebate: RebateRequest; actualStartDate: string }> {
    const today = new Date();
    const todayStr = dateKey(today);

    const dailyRecords = await this.getAllDailyRecords({ studentId: params.studentId });

    // Check if the student has consumed meals today
    const todayRec = dailyRecords.find((r) => r.date === todayStr);
    const hasEatenToday = todayRec && (todayRec.lunch || todayRec.dinner || todayRec.eaten) && !todayRec.is_rebate;

    // Enforce Rule: If eaten lunch/meals today, dining CANNOT be closed on the same day
    let actualStartKey = params.effectiveDate;
    if (params.effectiveDate <= todayStr && hasEatenToday) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      actualStartKey = dateKey(tomorrow);
    }

    const reason = params.reason || 'Dining Closed by Munshi';
    const affectedDays = await this.markRebateDays({
      studentId: params.studentId,
      enrollmentNo: params.enrollmentNo,
      start: actualStartKey,
      end: params.endDate,
      reason,
      markedBy: params.markedBy || 'Munshi'
    });

    // Record an approved rebate request for this closure
    let newRebate: RebateRequest;
    if (useDb()) {
      newRebate = await db.insertRebate({
        student_id: params.studentId,
        enrollment_no: params.enrollmentNo,
        student_name: params.studentName,
        start_date: actualStartKey,
        end_date: params.endDate,
        reason: params.reason || 'Official Dining Closure by Munshi',
        status: 'approved'
      });
    } else {
      newRebate = {
        id: `reb-close-${Date.now()}`,
        student_id: params.studentId,
        enrollment_no: params.enrollmentNo,
        student_name: params.studentName,
        start_date: actualStartKey,
        end_date: params.endDate,
        reason: params.reason || 'Official Dining Closure by Munshi',
        status: 'approved',
        created_at: todayStr
      };
      const rebates = await this.getRebateRequests();
      setLocal(STORAGE_KEY_REBATES, [newRebate, ...rebates]);
    }

    return { affectedDays, rebate: newRebate, actualStartDate: actualStartKey };
  },

  // --- SETTINGS ---
  async getSettings(): Promise<MessSettings> {
    if (useDb()) {
      const fromDb = await safeRead<MessSettings | null>('settings', db.getSettings, null);
      return fromDb ?? INITIAL_SETTINGS;
    }
    return getLocal<MessSettings>(STORAGE_KEY_SETTINGS, INITIAL_SETTINGS);
  },

  async updateSettings(settings: MessSettings): Promise<void> {
    if (useDb()) {
      await db.saveSettings(settings);
      return;
    }
    setLocal(STORAGE_KEY_SETTINGS, settings);
  },

  // --- FOOD & CLEANLINESS REVIEWS ---
  async getFoodReviews(): Promise<FoodReview[]> {
    if (useDb()) return safeRead('reviews', db.listReviews, []);
    return getLocal<FoodReview[]>(STORAGE_KEY_REVIEWS, INITIAL_REVIEWS);
  },

  async addFoodReview(
    review: Omit<FoodReview, 'id' | 'created_at' | 'overall_rating'> & { overall_rating?: number }
  ): Promise<FoodReview> {
    const overall =
      review.overall_rating ??
      Number(
        ((review.quality_rating + review.quantity_rating + review.taste_rating + review.cleanliness_rating) / 4).toFixed(1)
      );

    if (useDb()) return db.insertReview({ ...review, overall_rating: overall });

    const newReview: FoodReview = {
      ...review,
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      overall_rating: overall,
      created_at: new Date().toISOString()
    };

    const currentReviews = await this.getFoodReviews();
    const updated = [newReview, ...currentReviews];
    setLocal(STORAGE_KEY_REVIEWS, updated);
    return newReview;
  },

  async getReviewsForDate(dateStr: string): Promise<FoodReview[]> {
    const all = await this.getFoodReviews();
    return all.filter((r) => r.date === dateStr);
  },

  async getDailyReviewSummary(dateStr: string): Promise<DailyReviewSummary> {
    const all = await this.getFoodReviews();
    const dayReviews = all.filter((r) => r.date === dateStr);

    const houseList: HostelHouseCode[] = ['HM', 'BH', 'QH', 'KH', 'AK', 'MB'];
    const initialHouseStats: DailyReviewSummary['house_cleanliness'] = {} as DailyReviewSummary['house_cleanliness'];

    houseList.forEach((code) => {
      initialHouseStats[code] = {
        house: code,
        houseName: HOSTEL_HOUSES[code]?.name || code,
        averageScore: 0,
        reviewCount: 0
      };
    });

    if (dayReviews.length === 0) {
      return {
        date: dateStr,
        total_reviews: 0,
        overall_score: 0,
        quality_score: 0,
        quantity_score: 0,
        taste_score: 0,
        cleanliness_score: 0,
        house_cleanliness: initialHouseStats,
        reviews: []
      };
    }

    let sumQuality = 0;
    let sumQuantity = 0;
    let sumTaste = 0;
    let sumCleanliness = 0;
    let sumOverall = 0;

    const houseScoresMap: Record<HostelHouseCode, { sum: number; count: number }> = {
      HM: { sum: 0, count: 0 },
      BH: { sum: 0, count: 0 },
      QH: { sum: 0, count: 0 },
      KH: { sum: 0, count: 0 },
      AK: { sum: 0, count: 0 },
      MB: { sum: 0, count: 0 }
    };

    dayReviews.forEach((rev) => {
      sumQuality += rev.quality_rating;
      sumQuantity += rev.quantity_rating;
      sumTaste += rev.taste_rating;
      sumCleanliness += rev.cleanliness_rating;
      sumOverall += rev.overall_rating;

      if (houseScoresMap[rev.cleanliness_house]) {
        houseScoresMap[rev.cleanliness_house].sum += rev.cleanliness_rating;
        houseScoresMap[rev.cleanliness_house].count += 1;
      }
    });

    const total = dayReviews.length;

    houseList.forEach((code) => {
      const stats = houseScoresMap[code];
      const avg = stats.count > 0 ? Number((stats.sum / stats.count).toFixed(1)) : 0;
      initialHouseStats[code] = {
        house: code,
        houseName: HOSTEL_HOUSES[code]?.name || code,
        averageScore: avg,
        reviewCount: stats.count
      };
    });

    return {
      date: dateStr,
      total_reviews: total,
      overall_score: Number((sumOverall / total).toFixed(1)),
      quality_score: Number((sumQuality / total).toFixed(1)),
      quantity_score: Number((sumQuantity / total).toFixed(1)),
      taste_score: Number((sumTaste / total).toFixed(1)),
      cleanliness_score: Number((sumCleanliness / total).toFixed(1)),
      house_cleanliness: initialHouseStats,
      reviews: dayReviews
    };
  },

  async getAllDailyReviewSummaries(): Promise<DailyReviewSummary[]> {
    const all = await this.getFoodReviews();
    const uniqueDates = Array.from(new Set(all.map((r) => r.date))).sort().reverse();
    return Promise.all(uniqueDates.map((d) => this.getDailyReviewSummary(d)));
  },

  // Reset to initial mock data
  resetAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_STUDENTS);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_BILLS);
    localStorage.removeItem(STORAGE_KEY_PAYMENTS);
    parsedCache.clear();
    localStorage.removeItem(STORAGE_KEY_REBATES);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_REVIEWS);
  }
};
