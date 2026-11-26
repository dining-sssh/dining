'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DailyReviewSummary,
  DeficitEntry,
  DiningRequest,
  GraceExtension,
  HallClosedDay,
  MessSettings,
  PaymentSlip,
  Student
} from '@/types';
import { DataService } from '@/lib/dataService';
import { AccountState, isDiningActive, sessionOfDate, simulateAccount } from '@/lib/diningEngine';
import { toDateKey } from '../student/studentUtils';

interface AdminDataValue {
  loaded: boolean;
  todayKey: string;
  students: Student[];
  requests: DiningRequest[];
  slips: PaymentSlip[];
  entries: DeficitEntry[];
  extensions: GraceExtension[];
  closedDays: HallClosedDay[];
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
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<DiningRequest[]>([]);
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [entries, setEntries] = useState<DeficitEntry[]>([]);
  const [extensions, setExtensions] = useState<GraceExtension[]>([]);
  const [closedDays, setClosedDays] = useState<HallClosedDay[]>([]);
  const [settings, setSettings] = useState<MessSettings | null>(null);
  const [todayReview, setTodayReview] = useState<DailyReviewSummary | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const today = toDateKey(new Date());
      const sessionStartYear = Number(sessionOfDate(today).split('-')[0]);
      const fromDate = `${sessionStartYear}-06-01`;

      const [st, rq, sl, en, ex, cl, stg, review] = await Promise.all([
        DataService.getStudents({ strict: true }),
        DataService.getDiningRequests({ fromDate }),
        DataService.getPaymentSlips({ fromDate }),
        DataService.getDeficitEntries(),
        DataService.getGraceExtensions({ fromDate }),
        DataService.getClosedDays(),
        DataService.getSettings(),
        DataService.getDailyReviewSummary(today)
      ]);
      setStudents(st);
      setRequests(rq);
      setSlips(sl);
      setEntries(en);
      setExtensions(ex);
      setClosedDays(cl);
      setSettings(stg);
      setTodayReview(review);
      setLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data from database.';
      console.error('AdminData reload failed:', err);
      setError(msg);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const { accounts, totalPending, totalReceived, activeCount } = useMemo(() => {
    const rq = groupBy(requests);
    const sl = groupBy(slips);
    const en = groupBy(entries);
    const ex = groupBy(extensions);
    const closedDates = closedDays.map((c) => c.day);

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
        closedDates,
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
  }, [students, requests, slips, entries, extensions, closedDays, todayKey]);

  const value = useMemo<AdminDataValue>(
    () => ({
      loaded,
      todayKey,
      students,
      requests,
      slips,
      entries,
      extensions,
      closedDays,
      settings,
      todayReview,
      accounts,
      totalPending,
      totalReceived,
      activeCount,
      reload
    }),
    [loaded, todayKey, students, requests, slips, entries, extensions, closedDays, settings, todayReview, accounts, totalPending, totalReceived, activeCount, reload]
  );

  return (
    <Ctx.Provider value={value}>
      {error && (
        <div role="alert" className="no-print fixed bottom-4 right-4 z-50 max-w-md rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 shadow-xl">
          <p className="font-bold">Database load error</p>
          <p className="mt-1 break-words text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => reload()}
            className="mt-2 rounded-lg bg-rose-700 px-3 py-1 font-bold text-white hover:bg-rose-800"
          >
            Retry
          </button>
        </div>
      )}
      {!loaded && !error && (
        <div className="no-print fixed bottom-4 right-4 z-50 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 shadow-lg">
          Loading data from database…
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
};
