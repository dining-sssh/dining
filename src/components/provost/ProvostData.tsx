'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DailyReviewSummary, MessSettings, MonthlyBill, PaymentSlip, RebateRequest, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { toDateKey } from '../student/studentUtils';

interface ProvostDataValue {
  loaded: boolean;
  students: Student[];
  bills: MonthlyBill[];
  slips: PaymentSlip[];
  rebates: RebateRequest[];
  settings: MessSettings | null;
  todayReview: DailyReviewSummary | null;
  /** student_id -> charged minus deposited (positive = deficit, negative = advance). */
  balanceByStudent: Map<string, number>;
  totalPendingDues: number;
  reload: () => Promise<void>;
  setSettings: (s: MessSettings) => void;
}

const Ctx = createContext<ProvostDataValue | null>(null);

export const useProvostData = (): ProvostDataValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProvostData must be used inside <ProvostDataProvider>');
  return v;
};

export const ProvostDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loaded, setLoaded] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [rebates, setRebates] = useState<RebateRequest[]>([]);
  const [settings, setSettings] = useState<MessSettings | null>(null);
  const [todayReview, setTodayReview] = useState<DailyReviewSummary | null>(null);

  const reload = useCallback(async () => {
    const [st, bl, sl, rb, stg, review] = await Promise.all([
      DataService.getStudents(),
      DataService.getMonthlyBills(),
      DataService.getPaymentSlips(),
      DataService.getRebateRequests(),
      DataService.getSettings(),
      DataService.getDailyReviewSummary(toDateKey(new Date()))
    ]);
    setStudents(st);
    setBills(bl);
    setSlips(sl);
    setRebates(rb);
    setSettings(stg);
    setTodayReview(review);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Deficit = everything charged minus everything deposited (same figure the student sees under Bills).
  const { balanceByStudent, totalPendingDues } = useMemo(() => {
    const map = new Map<string, number>();
    bills.forEach((b) => map.set(b.student_id, (map.get(b.student_id) || 0) + (b.total_amount || 0)));
    slips.forEach((s) => map.set(s.student_id, (map.get(s.student_id) || 0) - (s.amount || 0)));
    let total = 0;
    map.forEach((v) => {
      if (v > 0) total += v;
    });
    return { balanceByStudent: map, totalPendingDues: total };
  }, [bills, slips]);

  const value = useMemo<ProvostDataValue>(
    () => ({
      loaded,
      students,
      bills,
      slips,
      rebates,
      settings,
      todayReview,
      balanceByStudent,
      totalPendingDues,
      reload,
      setSettings
    }),
    [loaded, students, bills, slips, rebates, settings, todayReview, balanceByStudent, totalPendingDues, reload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
