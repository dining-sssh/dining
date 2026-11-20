import { 
  Student, 
  DiningDailyRecord, 
  MonthlyBill, 
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
  INITIAL_REBATES,
  INITIAL_REVIEWS
} from './mockData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY_STUDENTS = 'amu_dining_students';
const STORAGE_KEY_RECORDS = 'amu_dining_records';
const STORAGE_KEY_BILLS = 'amu_dining_bills';
const STORAGE_KEY_REBATES = 'amu_dining_rebates';
const STORAGE_KEY_SETTINGS = 'amu_dining_settings';
const STORAGE_KEY_REVIEWS = 'amu_dining_reviews';

// Helper to get from LocalStorage or initialize with mock data
function getLocal<T>(key: string, initialData: T): T {
  if (typeof window === 'undefined') return initialData;
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return initialData;
  }
}

function setLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

export const DataService = {
  // Check connection status
  isLiveSupabase(): boolean {
    return isSupabaseConfigured;
  },

  // --- STUDENTS ---
  async getStudents(): Promise<Student[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('students').select('*').order('room_no', { ascending: true });
        if (!error && data && data.length > 0) return data as Student[];
      } catch (err) {
        console.warn('Supabase query failed, falling back to local store:', err);
      }
    }
    return getLocal<Student[]>(STORAGE_KEY_STUDENTS, INITIAL_STUDENTS);
  },

  async addStudent(student: Omit<Student, 'id'>): Promise<Student> {
    const newStudent: Student = {
      ...student,
      id: `s-${Date.now()}`
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('students').insert([student]).select();
        if (!error && data && data[0]) {
          return data[0] as Student;
        }
      } catch (err) {
        console.warn('Failed to insert in Supabase, using local:', err);
      }
    }

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

      existingEnrollments.add(enr);
      validToAdd.push({
        id: `s-${Date.now()}-${idx}`,
        enrollment_no: enr,
        name: row.name.trim(),
        house: row.house,
        room_no: row.room_no.trim(),
        course: row.course?.trim() || 'General Course',
        email: row.email?.trim() || `${enr.toLowerCase()}@myamu.ac.in`,
        previous_room: row.previous_room?.trim() || 'N/A',
        session: '2026-2027',
        status: 'active'
      });
    });

    if (validToAdd.length > 0) {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('students').insert(validToAdd);
        } catch (e) {
          console.warn('Supabase bulk insert warning:', e);
        }
      }
      const updated = [...existing, ...validToAdd];
      setLocal(STORAGE_KEY_STUDENTS, updated);
    }

    return { added: validToAdd.length, errors };
  },

  async deleteStudent(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('students').delete().eq('id', id);
      } catch (err) {
        console.warn(err);
      }
    }
    const students = await this.getStudents();
    const updated = students.filter(s => s.id !== id);
    setLocal(STORAGE_KEY_STUDENTS, updated);
  },

  // --- DAY-WISE DINING RECORDS ---
  async getDailyRecordsForDate(dateStr: string): Promise<DiningDailyRecord[]> {
    const students = await this.getStudents();
    const allRecords = getLocal<DiningDailyRecord[]>(
      STORAGE_KEY_RECORDS, 
      generateInitialDailyRecords(students)
    );

    let recordsForDate = allRecords.filter(r => r.date === dateStr);

    // If no records exist for this day yet, automatically initialize default present records for all active students
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

  async getAllDailyRecords(): Promise<DiningDailyRecord[]> {
    const students = await this.getStudents();
    return getLocal<DiningDailyRecord[]>(
      STORAGE_KEY_RECORDS, 
      generateInitialDailyRecords(students)
    );
  },

  async updateDailyRecords(recordsToUpdate: DiningDailyRecord[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('dining_daily_records').upsert(recordsToUpdate);
      } catch (e) {
        console.warn(e);
      }
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
    const students = await this.getStudents();
    const bills = getLocal<MonthlyBill[]>(
      STORAGE_KEY_BILLS, 
      generateInitialBills(students)
    );
    if (session) {
      return bills.filter(b => b.session === session);
    }
    return bills;
  },

  async getBillsForStudent(enrollmentNo: string, session?: string): Promise<MonthlyBill[]> {
    const allBills = await this.getMonthlyBills();
    return allBills.filter(b => 
      b.enrollment_no.toUpperCase() === enrollmentNo.toUpperCase() &&
      (!session || b.session === session)
    );
  },

  // --- REBATES ---
  async getRebateRequests(): Promise<RebateRequest[]> {
    return getLocal<RebateRequest[]>(STORAGE_KEY_REBATES, INITIAL_REBATES);
  },

  async addRebateRequest(req: Omit<RebateRequest, 'id' | 'status' | 'created_at'>): Promise<RebateRequest> {
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

  async updateRebateStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const rebates = await this.getRebateRequests();
    const updated = rebates.map(r => r.id === id ? { ...r, status } : r);
    setLocal(STORAGE_KEY_REBATES, updated);

    // If approved, mark the affected days as is_rebate in daily records
    if (status === 'approved') {
      const reb = rebates.find(r => r.id === id);
      if (reb) {
        const dailyRecords = await this.getAllDailyRecords();
        const start = new Date(reb.start_date);
        const end = new Date(reb.end_date);

        const updatedDaily = dailyRecords.map(d => {
          if (d.enrollment_no === reb.enrollment_no) {
            const curDate = new Date(d.date);
            if (curDate >= start && curDate <= end) {
              return { ...d, is_rebate: true, eaten: false, lunch: false, dinner: false, rebate_reason: reb.reason };
            }
          }
          return d;
        });
        setLocal(STORAGE_KEY_RECORDS, updatedDaily);
      }
    }
  },

  // --- SETTINGS ---
  async getSettings(): Promise<MessSettings> {
    return getLocal<MessSettings>(STORAGE_KEY_SETTINGS, INITIAL_SETTINGS);
  },

  async updateSettings(settings: MessSettings): Promise<void> {
    setLocal(STORAGE_KEY_SETTINGS, settings);
  },

  // --- FOOD & CLEANLINESS REVIEWS ---
  async getFoodReviews(): Promise<FoodReview[]> {
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
    localStorage.removeItem(STORAGE_KEY_REBATES);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_REVIEWS);
  }
};
