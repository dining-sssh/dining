export type HostelHouseCode = 'HM' | 'BH' | 'QH' | 'KH' | 'AK' | 'MB';

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
  KH: {
    code: 'KH',
    name: 'Kashmir house',
    shortName: 'Kashmir House',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  AK: {
    code: 'AK',
    name: 'Agha khan house',
    shortName: 'Agha Khan',
    color: 'bg-rose-100 text-rose-800 border-rose-300'
  },
  MB: {
    code: 'MB',
    name: 'Mahamoodabad house',
    shortName: 'Mahamoodabad',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  }
};

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
  phone?: string;
  session: string;
  status: 'active' | 'suspended' | 'passed_out';
  created_at?: string;
}

export interface DiningDailyRecord {
  id: string;
  student_id: string;
  enrollment_no: string;
  date: string; // YYYY-MM-DD
  eaten?: boolean; // Whole day dining status: Eaten or Not Eaten
  lunch?: boolean;
  dinner?: boolean;
  is_rebate: boolean;
  rebate_reason?: string;
  guest_diets: number;
  marked_by?: string;
  updated_at?: string;
}

export interface MonthlyBill {
  id: string;
  student_id: string;
  enrollment_no: string;
  session: string;
  month_name: string; // e.g. "November 2026"
  month_key: string;  // e.g. "2026-11"
  total_diets: number;
  rebate_days: number;
  diet_rate: number;
  diet_amount: number;
  fixed_charges: number;
  establishment_charges: number;
  extras: number;
  total_amount: number;
  status: 'paid' | 'pending' | 'overdue';
  payment_date?: string;
  receipt_no?: string;
}

export interface RebateRequest {
  id: string;
  student_id: string;
  enrollment_no: string;
  student_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
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
