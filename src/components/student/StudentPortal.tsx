'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, ChevronRight, Send, ShieldAlert, Receipt, Star } from 'lucide-react';
import { Student, DiningDailyRecord, MonthlyBill, PaymentSlip, RebateRequest, FoodReview } from '@/types';
import { DataService } from '@/lib/dataService';
import { formatMoney, summarizeAccount } from '@/lib/billingUtils';
import { StudentHeader, BottomNav, StudentTab } from './StudentChrome';
import { HeroBanner, DiningInfoStrip } from './HeroBanner';
import { DiningCalendar } from './DiningCalendar';
import { LogView } from './LogView';
import { BillsView } from './BillsView';
import { ProfileView } from './ProfileView';
import { StudentReviewsView } from './StudentReviewsView';
import { RebateModal, RebateFormValues } from './RebateModal';
import { ReviewFormModal } from '../reviews/ReviewFormModal';
import { computeHeroState, createDayResolver, sessionOfDate, toDateKey } from './studentUtils';

interface StudentPortalProps {
  /** Set when a student is logged in. Locks the portal to that student. */
  enforcedStudentId?: string;
  /** Shown on the Profile tab (student sessions only). */
  onLogout?: () => void;
  /** Admin inspector only: which resident to open first. */
  initialStudentId?: string;
}

// One background layer instead of several blurred or rotated elements: cheaper to paint while scrolling.
const PAGE_BACKGROUND =
  'radial-gradient(circle at 100% 0%, rgba(4,120,87,0.26) 0, transparent 36%), ' +
  'radial-gradient(circle at 0% 100%, rgba(4,120,87,0.16) 0, transparent 40%), ' +
  'linear-gradient(to bottom, #f4f9f6, #e5efe9)';

export const StudentPortal: React.FC<StudentPortalProps> = ({ enforcedStudentId, onLogout, initialStudentId }) => {
  const isStudentSession = Boolean(enforcedStudentId);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const currentSession = useMemo(() => sessionOfDate(todayKey), [todayKey]);

  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const [tab, setTab] = useState<StudentTab>('home');
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [records, setRecords] = useState<DiningDailyRecord[]>([]);
  const [rebates, setRebates] = useState<RebateRequest[]>([]);
  const [reviews, setReviews] = useState<FoodReview[]>([]);
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
    setActiveStudent((prev) =>
      prev && students.some((s) => s.id === prev.id)
        ? prev
        : students.find((s) => s.id === initialStudentId) ?? students[0] ?? null
    );
  }, [students, studentsLoaded, enforcedStudentId, initialStudentId]);

  // Everything for one student is loaded in a single round, so switching tabs never waits on data.
  const latestLoad = useRef(0);
  const loadStudentData = useCallback(async (student: Student) => {
    const token = ++latestLoad.current;
    const [allDaily, allRebates, studentBills, studentSlips, allReviews] = await Promise.all([
      DataService.getAllDailyRecords({ studentId: student.id }),
      DataService.getRebateRequests(),
      DataService.getBillsForStudent(student.enrollment_no),
      DataService.getPaymentSlipsForStudent(student.enrollment_no),
      DataService.getFoodReviews()
    ]);
    if (token !== latestLoad.current) return; // a newer load started (student switched)

    setRecords(allDaily);
    setRebates(allRebates.filter((r) => r.student_id === student.id || r.enrollment_no === student.enrollment_no));
    setBills(studentBills);
    setSlips(studentSlips);
    setReviews(allReviews);
  }, []);

  useEffect(() => {
    if (activeStudent) loadStudentData(activeStudent);
  }, [activeStudent, loadStudentData]);

  /* ------------------------------ derived ------------------------------- */

  const resolve = useMemo(() => createDayResolver(records, rebates, todayKey), [records, rebates, todayKey]);
  const hero = useMemo(() => computeHeroState(resolve, todayKey), [resolve, todayKey]);
  const account = useMemo(() => summarizeAccount(bills, slips), [bills, slips]);
  const hasPendingRebate = rebates.some((r) => r.status === 'pending');

  /* ------------------------------ handlers ------------------------------ */

  const handleSubmitRebate = useCallback(
    async ({ start, end, reason }: RebateFormValues) => {
      if (!activeStudent) return;
      await DataService.addRebateRequest({
        student_id: activeStudent.id,
        enrollment_no: activeStudent.enrollment_no,
        student_name: activeStudent.name,
        start_date: start,
        end_date: end,
        reason
      });
      await loadStudentData(activeStudent);
    },
    [activeStudent, loadStudentData]
  );

  const handleMonthChange = useCallback((key: string) => {
    setMonthKey(key);
    setSelectedDate(null);
  }, []);

  const openBills = useCallback(() => setTab('bills'), []);
  const openProfile = useCallback(() => setTab('profile'), []);
  const openRebate = useCallback(() => setIsRebateOpen(true), []);
  const closeRebate = useCallback(() => setIsRebateOpen(false), []);
  const openReview = useCallback(() => setIsReviewModalOpen(true), []);
  const closeReview = useCallback(() => setIsReviewModalOpen(false), []);
  const handleReviewSubmitted = useCallback(() => {
    if (activeStudent) loadStudentData(activeStudent);
  }, [activeStudent, loadStudentData]);

  /* ------------------------------- states ------------------------------- */

  if (!studentsLoaded) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
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
            className="press mt-4 rounded-full bg-emerald-900 px-5 py-2 text-xs font-bold text-white"
          >
            Back to login
          </button>
        )}
      </div>
    );
  }

  /* -------------------------------- render ------------------------------ */

  const pendingDeficit = Math.max(account.balance, 0);

  return (
    <div
      className={isStudentSession ? 'min-h-[100dvh]' : 'overflow-hidden rounded-3xl'}
      style={{ backgroundImage: PAGE_BACKGROUND }}
    >
      <div className="relative mx-auto w-full max-w-5xl space-y-4 px-4 pb-32 pt-4">
        {isStudentSession ? (
          <StudentHeader hasAlerts={hasPendingRebate} onBellClick={openProfile} />
        ) : (
          <div className="no-print flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center">
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
                  {s.name} ({s.enrollment_no} - {s.house} #{s.room_no} | Prev: {s.previous_room || 'New Allotment'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* key = tab, so each tab fades/slides in using transform + opacity only */}
        <div key={tab} className="tab-enter">
          {tab === 'home' && (
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className="space-y-4">
                <HeroBanner hero={hero} />
                <DiningInfoStrip hero={hero} />

                <button
                  type="button"
                  onClick={openReview}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 p-3.5 text-left shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-emerald-950 shadow-sm">
                    <Star className="h-5 w-5 fill-emerald-950" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                      Food & Cleanliness Review
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                      Rate today&apos;s taste, quality, quantity & cleanliness
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={openBills}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-white bg-white p-3.5 text-left shadow-sm"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      pendingDeficit > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-slate-500">
                      {pendingDeficit > 0 ? 'Pending deficit' : account.balance < 0 ? 'Advance balance' : 'Dues'}
                    </p>
                    <p className="text-sm font-extrabold text-slate-900">
                      {pendingDeficit > 0
                        ? formatMoney(pendingDeficit)
                        : account.balance < 0
                        ? formatMoney(-account.balance)
                        : 'All cleared'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={openRebate}
                  className="press flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-sm font-bold text-emerald-950 shadow-sm"
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
            <LogView records={records} todayKey={todayKey} resolve={resolve} defaultSession={currentSession} />
          )}

          {tab === 'reviews' && (
            <StudentReviewsView student={activeStudent} reviews={reviews} todayKey={todayKey} onRate={openReview} />
          )}

          {tab === 'bills' && <BillsView student={activeStudent} bills={bills} slips={slips} todayKey={todayKey} />}

          {tab === 'profile' && (
            <ProfileView
              student={activeStudent}
              rebates={rebates}
              onApplyRebate={openRebate}
              onLogout={isStudentSession ? onLogout : undefined}
            />
          )}
        </div>
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <RebateModal open={isRebateOpen} onClose={closeRebate} onSubmit={handleSubmitRebate} />

      <ReviewFormModal
        open={isReviewModalOpen}
        onClose={closeReview}
        onReviewSubmitted={handleReviewSubmitted}
        activeStudent={activeStudent}
      />
    </div>
  );
};
