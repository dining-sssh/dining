export type HostelHouseCode = 'HM' | 'JK' | 'MB' | 'KH' | 'BH' | 'QH' | 'AK';

export interface HostelHouseInfo {
  code: HostelHouseCode;
  name: string;
  shortName: string;
  color: string;
}

export const HOSTEL_HOUSES: Record<HostelHouseCode, HostelHouseInfo> = {
  HM: {
    code: 'HM',
    name: 'Hasrat Mohani hostel',
    shortName: 'Hasrat Mohani',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  JK: {
    code: 'JK',
    name: 'JK hostel',
    shortName: 'JK Hostel',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300'
  },
  MB: {
    code: 'MB',
    name: 'Mahamoodabad house',
    shortName: 'Mahamoodabad',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  KH: {
    code: 'KH',
    name: 'Kashmir house',
    shortName: 'Kashmir House',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  BH: {
    code: 'BH',
    name: 'Bhopal house',
    shortName: 'Bhopal House',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  QH: {
    code: 'QH',
    name: 'Qidwai hostel',
    shortName: 'Qidwai Hostel',
    color: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  AK: {
    code: 'AK',
    name: 'Agha khan house',
    shortName: 'Agha Khan',
    color: 'bg-rose-100 text-rose-800 border-rose-300'
  }
};

/** All seven hostels in the order they are listed in the forms. */
export const HOUSE_CODES: HostelHouseCode[] = ['HM', 'JK', 'MB', 'KH', 'BH', 'QH', 'AK'];

export type UserRole = 'provost' | 'munshi' | 'student';

export type AuthRole = 'student' | 'admin';

export interface AuthSession {
  role: AuthRole;
  selectedPanel: UserRole; // 'student' | 'provost' | 'munshi'
  email: string;
  adminType?: 'provost' | 'munshi';
  studentId?: string;
  studentEnrollment?: string;
  studentName?: string;
}

export interface Student {
  id: string;
  enrollment_no: string;
  name: string;
  house: HostelHouseCode;
  room_no: string;
  course: string;
  email: string;
  previous_room?: string;
  /** Hostel / house the student lived in before (free text, usually a house code). */
  previous_house?: string;
  remarks?: string;
  phone?: string;
  session: string;
  status: 'active' | 'suspended' | 'passed_out';
  /** First day dining counts for this student (YYYY-MM-DD). */
  dining_from?: string;
  created_at?: string;
}

/**
 * A request to switch a student's dining off or back on, from `start_date` onwards.
 * Dining stays off until an approved 'on' request restarts it.
 * (Stored in the `rebate_requests` table.)
 */
export interface DiningRequest {
  id: string;
  student_id: string;
  enrollment_no: string;
  student_name: string;
  kind: 'off' | 'on';
  start_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
}

/** A deficit carried from earlier books (a month and an amount) that is still to be paid. */
export interface DeficitEntry {
  id: string;
  student_id: string;
  enrollment_no: string;
  month_key: string; // 'YYYY-MM'
  amount: number;
  note?: string | null;
  created_at: string;
}

/** A "Food Charges Slip": one deposit made by a student at the dining office. */
export interface PaymentSlip {
  id: string;
  student_id: string;
  enrollment_no: string;
  book_no: string;
  slip_no: string; // printed as "R. No."
  amount: number;
  breakup?: number[]; // e.g. [1600, 1400] is written as "1600 + 1400 = 3000/-"
  /** Months of carried deficit (DeficitEntry) that this payment clears. */
  settled_months?: string[];
  paid_on: string; // YYYY-MM-DD
  cashier?: string;
}

/** Provost's approval to keep dining beyond the normal -3 day limit. The Munshi applies it. */
export interface GraceExtension {
  id: string;
  student_id: string;
  enrollment_no: string;
  student_name: string;
  extra_days: number;
  note?: string | null;
  status: 'awaiting_munshi' | 'applied' | 'cancelled';
  approved_by?: string | null;
  created_at: string;
  applied_at?: string | null; // date the Munshi applied it (YYYY-MM-DD)
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';

/** What is served on one weekday (0 = Sunday ... 6 = Saturday) for one meal. */
export interface MenuItem {
  weekday: number;
  meal: MealType;
  items: string;
}

export interface DiningTiming {
  meal: MealType;
  start_time: string; // '12:30'
  end_time: string; // '14:30'
}

export interface MessSettings {
  session: string;
  diet_rate: number;
  fixed_charges: number;
  establishment_charges: number;
  provost_name: string;
  munshi_name: string;
  hall_name: string;
  min_rebate_days: number;
}

export type RatingScale = 1 | 2 | 3 | 4 | 5;

export interface FoodReview {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_no: string;
  date: string; // YYYY-MM-DD
  meal_type: 'lunch' | 'dinner' | 'all_day';
  quality_rating: RatingScale; // 1-5
  quantity_rating: RatingScale; // 1-5
  taste_rating: RatingScale; // 1-5
  cleanliness_rating: RatingScale; // 1-5
  cleanliness_house: HostelHouseCode; // e.g. HM, QH
  overall_rating: number; // average of 4 ratings (1-5)
  comments?: string;
  created_at: string;
}

export interface HouseCleanlinessSummary {
  house: HostelHouseCode;
  houseName: string;
  averageScore: number;
  reviewCount: number;
}

export interface DailyReviewSummary {
  date: string;
  total_reviews: number;
  overall_score: number; // 0 - 5
  quality_score: number;
  quantity_score: number;
  taste_score: number;
  cleanliness_score: number;
  house_cleanliness: Record<HostelHouseCode, HouseCleanlinessSummary>;
  reviews: FoodReview[];
}
