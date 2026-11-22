import {
  Student,
  DiningRequest,
  PaymentSlip,
  DeficitEntry,
  GraceExtension,
  HallClosedDay,
  MenuItem,
  DiningTiming,
  MessSettings,
  HostelHouseCode,
  FoodReview,
  DailyReviewSummary,
  HOSTEL_HOUSES,
  HOUSE_CODES
} from '@/types';
import {
  INITIAL_STUDENTS,
  INITIAL_SETTINGS,
  INITIAL_REVIEWS,
  INITIAL_MENU,
  INITIAL_TIMINGS,
  generateInitialSlips,
  generateInitialRequests,
  generateInitialEntries,
  generateInitialExtensions
} from './mockData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as db from './db';

// v-suffixed keys: the demo data changed shape with the per-day dining model.
const STORAGE_KEY_STUDENTS = 'amu_dining_students_v3';
const STORAGE_KEY_REQUESTS = 'amu_dining_requests_v1';
const STORAGE_KEY_PAYMENTS = 'amu_dining_payments_v3';
const STORAGE_KEY_ENTRIES = 'amu_dining_entries_v1';
const STORAGE_KEY_EXTENSIONS = 'amu_dining_extensions_v1';
const STORAGE_KEY_CLOSED = 'amu_dining_closed_v1';
const STORAGE_KEY_MENU = 'amu_dining_menu_v1';
const STORAGE_KEY_TIMINGS = 'amu_dining_timings_v1';
const STORAGE_KEY_SETTINGS = 'amu_dining_settings_v2';
const STORAGE_KEY_REVIEWS = 'amu_dining_reviews';
const OLD_STORAGE_KEYS = [
  'amu_dining_students',
  'amu_dining_records_v2',
  'amu_dining_bills_v2',
  'amu_dining_payments_v1',
  'amu_dining_rebates',
  'amu_dining_settings'
];

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
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

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
  /** `strict` makes database errors throw (used by login, so the real reason can be shown). */
  async getStudents(opts: { strict?: boolean } = {}): Promise<Student[]> {
    if (useDb()) return opts.strict ? db.listStudents() : safeRead('students', db.listStudents, []);
    return getLocal<Student[]>(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
  },

  async addStudent(student: Omit<Student, 'id'>): Promise<Student> {
    const clean = {
      ...student,
      enrollment_no: student.enrollment_no.trim().toUpperCase(),
      email: student.email.trim().toLowerCase(),
      previous_room: student.previous_room?.trim() || 'New Allotment'
    };

    if (useDb()) {
      const [created] = await db.insertStudents([clean]);
      return created;
    }

    const students = await this.getStudents();
    if (students.some((s) => s.enrollment_no.toUpperCase() === clean.enrollment_no)) {
      throw new Error(`Enrollment ${clean.enrollment_no} already exists.`);
    }
    if (students.some((s) => s.email.toLowerCase() === clean.email)) {
      throw new Error(`Email ${clean.email} is already used by another student.`);
    }
    const newStudent: Student = { ...clean, dining_from: clean.dining_from ?? todayKey(), id: `s-${Date.now()}` };
    setLocal(STORAGE_KEY_STUDENTS, [newStudent, ...students]);
    return newStudent;
  },

  /** Edit details such as a mistyped email, remarks or previous hostel. */
  async updateStudent(id: string, patch: Partial<Omit<Student, 'id'>>): Promise<Student> {
    const normalised: Partial<Student> = {
      ...patch,
      ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
      ...(patch.enrollment_no !== undefined ? { enrollment_no: patch.enrollment_no.trim().toUpperCase() } : {})
    };

    if (useDb()) return db.patchStudent(id, normalised);

    const students = await this.getStudents();
    if (
      normalised.email &&
      students.some((s) => s.id !== id && s.email.toLowerCase() === normalised.email)
    ) {
      throw new Error(`Email ${normalised.email} is already used by another student.`);
    }
    const current = students.find((s) => s.id === id);
    if (!current) throw new Error('Student not found.');
    const updated: Student = { ...current, ...normalised };
    setLocal(STORAGE_KEY_STUDENTS, students.map((s) => (s.id === id ? updated : s)));
    return updated;
  },

  async bulkAddStudents(csvStudents: Array<{
    enrollment_no: string;
    name: string;
    house: HostelHouseCode;
    room_no: string;
    course: string;
    email: string;
    previous_room?: string;
    remarks?: string;
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
      if (!HOUSE_CODES.includes(row.house)) {
        errors.push(`Row ${lineNum}: Invalid House code "${row.house}". Must be ${HOUSE_CODES.join(', ')}.`);
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
        remarks: row.remarks?.trim() || undefined,
        session: '2026-2027',
        status: 'active',
        dining_from: todayKey()
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
    setLocal(STORAGE_KEY_STUDENTS, students.filter(s => s.id !== id));
  },

  // --- DINING ON / OFF REQUESTS ---
  async getDiningRequests(): Promise<DiningRequest[]> {
    if (useDb()) return safeRead('dining requests', db.listRequests, []);
    return getLocal<DiningRequest[]>(STORAGE_KEY_REQUESTS, () => generateInitialRequests(INITIAL_STUDENTS));
  },

  /** A student asks to close dining (from a date, until restarted) or to open it again. Waits for the Munshi. */
  async addDiningRequest(req: {
    student_id: string;
    enrollment_no: string;
    student_name: string;
    kind: 'off' | 'on';
    start_date: string;
    reason: string;
  }): Promise<DiningRequest> {
    if (useDb()) return db.insertRequest(req);

    const created: DiningRequest = {
      ...req,
      id: `req-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString().split('T')[0]
    };
    const all = await this.getDiningRequests();
    setLocal(STORAGE_KEY_REQUESTS, [created, ...all]);
    return created;
  },

  /** Munshi approves or rejects a student's request. Approved requests change the dining status. */
  async decideDiningRequest(id: string, status: 'approved' | 'rejected'): Promise<void> {
    if (useDb()) {
      await db.setRequestStatus(id, status);
      return;
    }
    const all = await this.getDiningRequests();
    setLocal(
      STORAGE_KEY_REQUESTS,
      all.map((r) => (r.id === id ? { ...r, status, reviewed_at: new Date().toISOString() } : r))
    );
  },

  /**
   * The Munshi closes or restarts dining for a student straight away, from any date
   * (past dates included). It is saved as an already approved request.
   */
  async setDiningStatus(params: {
    student: Pick<Student, 'id' | 'enrollment_no' | 'name'>;
    kind: 'off' | 'on';
    startDate: string;
    reason: string;
  }): Promise<DiningRequest> {
    const row = {
      student_id: params.student.id,
      enrollment_no: params.student.enrollment_no,
      student_name: params.student.name,
      kind: params.kind,
      start_date: params.startDate,
      reason: params.reason,
      status: 'approved' as const
    };
    if (useDb()) return db.insertRequest(row);

    const created: DiningRequest = {
      ...row,
      id: `req-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
      reviewed_at: new Date().toISOString()
    };
    const all = await this.getDiningRequests();
    setLocal(STORAGE_KEY_REQUESTS, [created, ...all]);
    return created;
  },

  // --- PAYMENT SLIPS (Food Charges Slips) ---
  async getPaymentSlips(): Promise<PaymentSlip[]> {
    if (useDb()) return safeRead('slips', () => db.listSlips(), []);
    return getLocal<PaymentSlip[]>(STORAGE_KEY_PAYMENTS, () => generateInitialSlips(INITIAL_STUDENTS));
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
      throw new Error(`Slip No. ${slip.slip_no} has already been used.`);
    }
    const created: PaymentSlip = { ...slip, id: `slip-${Date.now()}-${slip.slip_no}` };
    setLocal(STORAGE_KEY_PAYMENTS, [...all, created]);
    return created;
  },

  async deletePaymentSlip(id: string): Promise<void> {
    if (useDb()) {
      await db.deleteSlip(id);
      return;
    }
    const all = await this.getPaymentSlips();
    setLocal(STORAGE_KEY_PAYMENTS, all.filter((s) => s.id !== id));
  },

  // --- CARRIED DEFICITS ---
  async getDeficitEntries(): Promise<DeficitEntry[]> {
    if (useDb()) return safeRead('deficits', db.listEntries, []);
    return getLocal<DeficitEntry[]>(STORAGE_KEY_ENTRIES, () => generateInitialEntries(INITIAL_STUDENTS));
  },

  async addDeficitEntry(entry: Omit<DeficitEntry, 'id' | 'created_at'>): Promise<DeficitEntry> {
    if (useDb()) return db.insertEntry(entry);
    const created: DeficitEntry = { ...entry, id: `def-${Date.now()}`, created_at: todayKey() };
    const all = await this.getDeficitEntries();
    setLocal(STORAGE_KEY_ENTRIES, [...all, created]);
    return created;
  },

  // --- GRACE EXTENSIONS (Provost approves, Munshi applies) ---
  async getGraceExtensions(): Promise<GraceExtension[]> {
    if (useDb()) return safeRead('extensions', db.listExtensions, []);
    return getLocal<GraceExtension[]>(STORAGE_KEY_EXTENSIONS, () => generateInitialExtensions(INITIAL_STUDENTS));
  },

  /** Provost approves more grace days. It goes to the Munshi, who applies it. */
  async approveGraceExtension(params: {
    student: Pick<Student, 'id' | 'enrollment_no' | 'name'>;
    extraDays: number;
    note?: string;
    approvedBy: string;
  }): Promise<GraceExtension> {
    const row = {
      student_id: params.student.id,
      enrollment_no: params.student.enrollment_no,
      student_name: params.student.name,
      extra_days: params.extraDays,
      note: params.note || null,
      approved_by: params.approvedBy
    };
    if (useDb()) return db.insertExtension(row);

    const created: GraceExtension = {
      ...row,
      id: `ext-${Date.now()}`,
      status: 'awaiting_munshi',
      created_at: todayKey()
    };
    const all = await this.getGraceExtensions();
    setLocal(STORAGE_KEY_EXTENSIONS, [created, ...all]);
    return created;
  },

  /** Munshi carries out the Provost's approval; the extra days count from `onDate`. */
  async applyGraceExtension(id: string, onDate: string): Promise<void> {
    if (useDb()) {
      await db.setExtensionStatus(id, 'applied', onDate);
      return;
    }
    const all = await this.getGraceExtensions();
    setLocal(
      STORAGE_KEY_EXTENSIONS,
      all.map((e) => (e.id === id ? { ...e, status: 'applied' as const, applied_at: onDate } : e))
    );
  },

  async cancelGraceExtension(id: string): Promise<void> {
    if (useDb()) {
      await db.setExtensionStatus(id, 'cancelled');
      return;
    }
    const all = await this.getGraceExtensions();
    setLocal(STORAGE_KEY_EXTENSIONS, all.map((e) => (e.id === id ? { ...e, status: 'cancelled' as const } : e)));
  },

  // --- HALL CLOSED DAYS (nobody is charged) ---
  async getClosedDays(): Promise<HallClosedDay[]> {
    if (useDb()) return safeRead('closed days', db.listClosedDays, []);
    return getLocal<HallClosedDay[]>(STORAGE_KEY_CLOSED, []);
  },

  async addClosedDay(day: HallClosedDay): Promise<void> {
    if (useDb()) {
      await db.insertClosedDay(day);
      return;
    }
    const all = await this.getClosedDays();
    setLocal(STORAGE_KEY_CLOSED, [...all.filter((d) => d.day !== day.day), day].sort((a, b) => a.day.localeCompare(b.day)));
  },

  async removeClosedDay(day: string): Promise<void> {
    if (useDb()) {
      await db.removeClosedDay(day);
      return;
    }
    const all = await this.getClosedDays();
    setLocal(STORAGE_KEY_CLOSED, all.filter((d) => d.day !== day));
  },

  // --- MENU AND TIMINGS (set by the Munshi, shown to students) ---
  async getMenu(): Promise<MenuItem[]> {
    if (useDb()) return safeRead('menu', db.listMenu, []);
    return getLocal<MenuItem[]>(STORAGE_KEY_MENU, INITIAL_MENU);
  },

  async saveMenu(items: MenuItem[]): Promise<void> {
    if (useDb()) {
      await db.saveMenu(items);
      return;
    }
    setLocal(STORAGE_KEY_MENU, items);
  },

  async getTimings(): Promise<DiningTiming[]> {
    if (useDb()) return safeRead('timings', db.listTimings, []);
    return getLocal<DiningTiming[]>(STORAGE_KEY_TIMINGS, INITIAL_TIMINGS);
  },

  async saveTimings(timings: DiningTiming[]): Promise<void> {
    if (useDb()) {
      await db.saveTimings(timings);
      return;
    }
    setLocal(STORAGE_KEY_TIMINGS, timings);
  },

  // --- SETTINGS (names only; the rate is fixed at 1400 / 30 per day) ---
  async getSettings(): Promise<MessSettings> {
    if (useDb()) {
      const fromDb = await safeRead<MessSettings | null>('settings', db.getSettings, null);
      return fromDb ?? INITIAL_SETTINGS;
    }
    return getLocal<MessSettings>(STORAGE_KEY_SETTINGS, INITIAL_SETTINGS);
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
    setLocal(STORAGE_KEY_REVIEWS, [newReview, ...currentReviews]);
    return newReview;
  },

  async getReviewsForDate(dateStr: string): Promise<FoodReview[]> {
    const all = await this.getFoodReviews();
    return all.filter((r) => r.date === dateStr);
  },

  async getDailyReviewSummary(dateStr: string): Promise<DailyReviewSummary> {
    const all = await this.getFoodReviews();
    const dayReviews = all.filter((r) => r.date === dateStr);

    const houseStats = {} as DailyReviewSummary['house_cleanliness'];
    const houseSums = {} as Record<HostelHouseCode, { sum: number; count: number }>;
    HOUSE_CODES.forEach((code) => {
      houseSums[code] = { sum: 0, count: 0 };
    });

    let sumQuality = 0;
    let sumQuantity = 0;
    let sumTaste = 0;
    let sumCleanliness = 0;
    let sumOverall = 0;

    dayReviews.forEach((rev) => {
      sumQuality += rev.quality_rating;
      sumQuantity += rev.quantity_rating;
      sumTaste += rev.taste_rating;
      sumCleanliness += rev.cleanliness_rating;
      sumOverall += rev.overall_rating;
      if (houseSums[rev.cleanliness_house]) {
        houseSums[rev.cleanliness_house].sum += rev.cleanliness_rating;
        houseSums[rev.cleanliness_house].count += 1;
      }
    });

    HOUSE_CODES.forEach((code) => {
      const stats = houseSums[code];
      houseStats[code] = {
        house: code,
        houseName: HOSTEL_HOUSES[code]?.name || code,
        averageScore: stats.count > 0 ? Number((stats.sum / stats.count).toFixed(1)) : 0,
        reviewCount: stats.count
      };
    });

    const total = dayReviews.length;
    const avg = (sum: number) => (total > 0 ? Number((sum / total).toFixed(1)) : 0);

    return {
      date: dateStr,
      total_reviews: total,
      overall_score: avg(sumOverall),
      quality_score: avg(sumQuality),
      quantity_score: avg(sumQuantity),
      taste_score: avg(sumTaste),
      cleanliness_score: avg(sumCleanliness),
      house_cleanliness: houseStats,
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
    [
      STORAGE_KEY_STUDENTS,
      STORAGE_KEY_REQUESTS,
      STORAGE_KEY_PAYMENTS,
      STORAGE_KEY_ENTRIES,
      STORAGE_KEY_EXTENSIONS,
      STORAGE_KEY_CLOSED,
      STORAGE_KEY_MENU,
      STORAGE_KEY_TIMINGS,
      STORAGE_KEY_SETTINGS,
      STORAGE_KEY_REVIEWS,
      ...OLD_STORAGE_KEYS
    ].forEach((key) => localStorage.removeItem(key));
    parsedCache.clear();
  }
};
