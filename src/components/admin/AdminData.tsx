'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DailyReviewSummary,
  DeficitEntry,
  DiningRequest,
  GraceExtension,
  MessSettings,
  PaymentSlip,
  Student
} from '@/types';
import { DataService } from '@/lib/dataService';
import { AccountState, isDiningActive, simulateAccount } from '@/lib/diningEngine';
import { toDateKey } from '../student/studentUtils';

interface AdminDataValue {
  loaded: boolean;
  todayKey: string;
  students: Student[];
  requests: DiningRequest[];
  slips: PaymentSlip[];
  entries: DeficitEntry[];
  extensions: GraceExtension[];
  settings: MessSettings | null;
  todayReview: DailyReviewSummary | null;
  /** Dining balance, deficit and status of every student, worked out by the dining engine. */
  accounts: Map<string, AccountState>;
  /** Everyone's unpaid deficit added together. */
  totalPending: number;
  /** Every deposit received, added together. */
  totalReceived: number;
  /** Students whose dining is running today. */
  activeCount: number;
  reload: () => Promise<void>;
}

const Ctx = createContext<AdminDataValue | null>(null);

export const useAdminData = (): AdminDataValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdminData must be used inside <AdminDataProvider>');
  return v;
};

const groupBy = <T extends { student_id: string }>(list: T[]): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  list.forEach((item) => {
    const bucket = map.get(item.student_id);
    if (bucket) bucket.push(item);
    else map.set(item.student_id, [item]);
  });
  return map;
};

export const AdminDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [loaded, setLoaded] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<DiningRequest[]>([]);
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [entries, setEntries] = useState<DeficitEntry[]>([]);
  const [extensions, setExtensions] = useState<GraceExtension[]>([]);
  const [settings, setSettings] = useState<MessSettings | null>(null);
  const [todayReview, setTodayReview] = useState<DailyReviewSummary | null>(null);

  const reload = useCallback(async () => {
    const [st, rq, sl, en, ex, stg, review] = await Promise.all([
      DataService.getStudents(),
      DataService.getDiningRequests(),
      DataService.getPaymentSlips(),
      DataService.getDeficitEntries(),
      DataService.getGraceExtensions(),
      DataService.getSettings(),
      DataService.getDailyReviewSummary(toDateKey(new Date()))
    ]);
    setStudents(st);
    setRequests(rq);
    setSlips(sl);
    setEntries(en);
    setExtensions(ex);
    setSettings(stg);
    setTodayReview(review);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const { accounts, totalPending, totalReceived, activeCount } = useMemo(() => {
    const rq = groupBy(requests);
    const sl = groupBy(slips);
    const en = groupBy(entries);
    const ex = groupBy(extensions);

    const map = new Map<string, AccountState>();
    let pending = 0;
    let active = 0;
    students.forEach((s) => {
      const state = simulateAccount({
        student: s,
        requests: rq.get(s.id) ?? [],
        slips: sl.get(s.id) ?? [],
        extensions: ex.get(s.id) ?? [],
        entries: en.get(s.id) ?? [],
        todayKey
      });
      map.set(s.id, state);
      pending += state.pendingAmount;
      if (s.status === 'active' && isDiningActive(state)) active += 1;
    });
    return {
      accounts: map,
      totalPending: pending,
      totalReceived: slips.reduce((a, s) => a + (s.amount || 0), 0),
      activeCount: active
    };
  }, [students, requests, slips, entries, extensions, todayKey]);

  const value = useMemo<AdminDataValue>(
    () => ({
      loaded,
      todayKey,
      students,
      requests,
      slips,
      entries,
      extensions,
      settings,
      todayReview,
      accounts,
      totalPending,
      totalReceived,
      activeCount,
      reload
    }),
    [loaded, todayKey, students, requests, slips, entries, extensions, settings, todayReview, accounts, totalPending, totalReceived, activeCount, reload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
