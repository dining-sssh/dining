'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, ChevronRight, Send, ShieldAlert, Receipt, Star, Utensils } from 'lucide-react';
import { Student, DiningDailyRecord, MonthlyBill, RebateRequest } from '@/types';
import { DataService } from '@/lib/dataService';
import { StudentHeader, BottomNav, StudentTab } from './StudentChrome';
import { HeroBanner, DiningInfoStrip } from './HeroBanner';
import { DiningCalendar } from './DiningCalendar';
import { LogView } from './LogView';
import { BillsView } from './BillsView';
import { ProfileView } from './ProfileView';
import { RebateModal, RebateFormValues } from './RebateModal';
import { DailyReviewReport } from '../reviews/DailyReviewReport';
import { ReviewFormModal } from '../reviews/ReviewFormModal';
import { computeHeroState, createDayResolver, toDateKey } from './studentUtils';

interface StudentPortalProps {
  /** Set when a student is logged in. Locks the portal to that student. */
  enforcedStudentId?: string;
  /** Shown on the Profile tab (student sessions only). */
  onLogout?: () => void;
}

const DEFAULT_SESSION = '2026-2027';

export const StudentPortal: React.FC<StudentPortalProps> = ({ enforcedStudentId, onLogout }) => {
  const isStudentSession = Boolean(enforcedStudentId);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const [tab, setTab] = useState<StudentTab>('home');
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [session, setSession] = useState(DEFAULT_SESSION);

  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [records, setRecords] = useState<DiningDailyRecord[]>([]);
  const [rebates, setRebates] = useState<RebateRequest[]>([]);
  const [isRebateOpen, setIsRebateOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  /* ---------------------------- data loading ---------------------------- */

  useEffect(() => {
    let cancelled = false;
    DataService.getStudents().then((list) => {
      if (cancelled) return;
      setStudents(list);
      setStudentsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentsLoaded) return;
    if (enforcedStudentId) {
      // A student session must only ever see its own record: no fallback to another student.
      setActiveStudent(students.find((s) => s.id === enforcedStudentId) ?? null);
      return;
    }
    setActiveStudent((prev) => (prev && students.some((s) => s.id === prev.id) ? prev : students[0] ?? null));
  }, [students, studentsLoaded, enforcedStudentId]);

  const loadRecordsAndRebates = useCallback(async (student: Student) => {
    const [allDaily, allRebates] = await Promise.all([
      DataService.getAllDailyRecords(),
      DataService.getRebateRequests()
    ]);
    setRecords(allDaily.filter((r) => r.student_id === student.id));
    setRebates(
      allRebates.filter((r) => r.student_id === student.id || r.enrollment_no === student.enrollment_no)
    );
  }, []);

  useEffect(() => {
    if (activeStudent) loadRecordsAndRebates(activeStudent);
  }, [activeStudent, loadRecordsAndRebates]);

  useEffect(() => {
    if (!activeStudent) return;
    let cancelled = false;
    DataService.getBillsForStudent(activeStudent.enrollment_no, session).then((b) => {
      if (!cancelled) setBills(b);
    });
    return () => {
      cancelled = true;
    };
  }, [activeStudent, session]);

  /* ------------------------------ derived ------------------------------- */

  const resolve = useMemo(() => createDayResolver(records, rebates, todayKey), [records, rebates, todayKey]);
  const hero = useMemo(() => computeHeroState(resolve, todayKey), [resolve, todayKey]);

  const outstanding = useMemo(
    () => bills.filter((b) => b.status !== 'paid').reduce((acc, b) => acc + (b.total_amount || 0), 0),
    [bills]
  );
  const hasPendingRebate = rebates.some((r) => r.status === 'pending');

  /* ------------------------------ handlers ------------------------------ */

  const handleSubmitRebate = async ({ start, end, reason }: RebateFormValues) => {
    if (!activeStudent) return;
    await DataService.addRebateRequest({
      student_id: activeStudent.id,
      enrollment_no: activeStudent.enrollment_no,
      student_name: activeStudent.name,
      start_date: start,
      end_date: end,
      reason
    });
    await loadRecordsAndRebates(activeStudent);
  };

  const handleMonthChange = (key: string) => {
    setMonthKey(key);
    setSelectedDate(null);
  };

  /* ------------------------------- states ------------------------------- */

  if (!studentsLoaded) {
    return (
      <div className="rounded-3xl bg-white/90 p-10 text-center shadow-sm">
        <Clock className="mx-auto mb-2 h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm font-semibold text-slate-600">Loading your dining dashboard…</p>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-rose-500" />
        <p className="text-sm font-bold text-slate-900">
          {isStudentSession ? 'Student record not found' : 'No students available'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {isStudentSession
            ? 'Your account is not linked to a resident record. Please contact the Munshi.'
            : 'Add students from the Provost panel to inspect them here.'}
        </p>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 rounded-full bg-emerald-900 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-950"
          >
            Back to login
          </button>
        )}
      </div>
    );
  }

  /* -------------------------------- render ------------------------------ */

  return (
    <div
      className={`relative overflow-hidden ${
        isStudentSession
          ? 'min-h-screen bg-gradient-to-b from-[#f4f9f6] via-[#eef5f1] to-[#e5efe9]'
          : 'rounded-3xl bg-gradient-to-b from-[#f4f9f6] to-[#e5efe9]'
      }`}
    >
      {/* Decorative corner shapes */}
      <div className="no-print pointer-events-none absolute -right-20 -top-24 h-64 w-64 rotate-45 rounded-[3rem] bg-gradient-to-br from-emerald-700/35 to-emerald-900/10" />
      <div className="no-print pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rotate-12 rounded-[3rem] bg-gradient-to-tr from-emerald-700/25 to-transparent" />

      <div className="relative mx-auto w-full max-w-5xl space-y-4 px-4 pb-32 pt-4">
        {isStudentSession ? (
          <StudentHeader hasAlerts={hasPendingRebate} onBellClick={() => setTab('profile')} />
        ) : (
          <div className="no-print flex flex-col gap-2 rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
            <label htmlFor="resident-select" className="text-xs font-semibold text-slate-500">
              Inspect resident
            </label>
            <select
              id="resident-select"
              value={activeStudent.id}
              onChange={(e) => {
                const found = students.find((s) => s.id === e.target.value);
                if (found) {
                  setActiveStudent(found);
                  setSelectedDate(null);
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:w-80"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.enrollment_no} - {s.house} #{s.room_no})
                </option>
              ))}
            </select>
          </div>
        )}

        {tab === 'home' && (
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <HeroBanner hero={hero} />
              <DiningInfoStrip hero={hero} />

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-emerald-50/70 p-3.5 text-left shadow-sm transition hover:shadow-md hover:bg-white"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-emerald-950 shadow-sm">
                  <Star className="h-5 w-5 fill-emerald-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                      Food & Cleanliness Review
                    </p>
                    <span className="text-[9px] bg-emerald-800 text-white font-extrabold px-1.5 py-0.2 rounded">
                      House Wise
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Rate today's taste, quality, quantity & hostel cleanliness
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setTab('bills')}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3.5 text-left shadow-sm transition hover:bg-white"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    outstanding > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-500">
                    {outstanding > 0 ? 'Outstanding dues' : 'Dues'}
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN')}` : 'All cleared'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setIsRebateOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-amber-500"
              >
                <Send className="h-4 w-4" />
                Apply for Mess Off
              </button>
            </div>

            <DiningCalendar
              monthKey={monthKey}
              todayKey={todayKey}
              resolve={resolve}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onMonthChange={handleMonthChange}
            />
          </div>
        )}

        {tab === 'log' && (
          <LogView
            records={records}
            monthKey={monthKey}
            todayKey={todayKey}
            resolve={resolve}
            onMonthChange={handleMonthChange}
          />
        )}

        {tab === 'reviews' && (
          <DailyReviewReport
            userRole="student"
            activeStudent={activeStudent}
            onOpenReviewModal={() => setIsReviewModalOpen(true)}
          />
        )}

        {tab === 'bills' && (
          <BillsView
            student={activeStudent}
            bills={bills}
            session={session}
            onSessionChange={setSession}
            initialMonthKey={monthKey}
          />
        )}

        {tab === 'profile' && (
          <ProfileView
            student={activeStudent}
            rebates={rebates}
            onApplyRebate={() => setIsRebateOpen(true)}
            onLogout={isStudentSession ? onLogout : undefined}
          />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <RebateModal open={isRebateOpen} onClose={() => setIsRebateOpen(false)} onSubmit={handleSubmitRebate} />

      <ReviewFormModal
        open={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSubmitted={() => {
          // Refresh if in reviews tab
        }}
        activeStudent={activeStudent}
      />
    </div>
  );
};
