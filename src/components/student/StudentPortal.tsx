'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, ChevronRight, ShieldAlert, Star, UtensilsCrossed, Send } from 'lucide-react';
import {
  Student,
  DiningRequest,
  PaymentSlip,
  DeficitEntry,
  GraceExtension,
  HallClosedDay,
  MenuItem,
  DiningTiming,
  FoodReview
} from '@/types';
import { DataService } from '@/lib/dataService';
import { dayInfoFor, simulateAccount } from '@/lib/diningEngine';
import { StudentHeader, BottomNav, StudentTab } from './StudentChrome';
import { HeroBanner, DiningInfoStrip } from './HeroBanner';
import { BalanceCard } from './BalanceCard';
import { MenuCard } from './MenuCard';
import { DiningCalendar } from './DiningCalendar';
import { LogView } from './LogView';
import { BillsView } from './BillsView';
import { ProfileView } from './ProfileView';
import { StudentReviewsView } from './StudentReviewsView';
import { DiningRequestModal, DiningRequestValues } from './DiningRequestModal';
import { NotificationsSheet } from './NotificationsSheet';
import { ReviewFormModal } from '../reviews/ReviewFormModal';
import { buildNotices, computeHero, formatLongDate, getReviewWindowStatus, sessionOfDate, toDateKey } from './studentUtils';

interface StudentPortalProps {
  /** The logged-in student. The portal only ever shows this student's own record. */
  enforcedStudentId?: string;
  onLogout?: () => void;
}

// One background layer instead of several blurred or rotated elements: cheaper to paint while scrolling.
const PAGE_BACKGROUND =
  'radial-gradient(circle at 100% 0%, rgba(4,120,87,0.26) 0, transparent 36%), ' +
  'radial-gradient(circle at 0% 100%, rgba(4,120,87,0.16) 0, transparent 40%), ' +
  'linear-gradient(to bottom, #f4f9f6, #e5efe9)';

export const StudentPortal: React.FC<StudentPortalProps> = ({ enforcedStudentId, onLogout }) => {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const currentSession = useMemo(() => sessionOfDate(todayKey), [todayKey]);

  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const [tab, setTab] = useState<StudentTab>('home');
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [requests, setRequests] = useState<DiningRequest[]>([]);
  const [slips, setSlips] = useState<PaymentSlip[]>([]);
  const [entries, setEntries] = useState<DeficitEntry[]>([]);
  const [extensions, setExtensions] = useState<GraceExtension[]>([]);
  const [closedDays, setClosedDays] = useState<HallClosedDay[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [timings, setTimings] = useState<DiningTiming[]>([]);
  const [reviews, setReviews] = useState<FoodReview[]>([]);

  const [requestKind, setRequestKind] = useState<'off' | 'on' | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);

  /* ---------------------------- data loading ---------------------------- */

  useEffect(() => {
    let cancelled = false;
    DataService.getStudents().then((list) => {
      if (cancelled) return;
      // A student session must only ever see its own record: no fallback to another student.
      setActiveStudent(list.find((s) => s.id === enforcedStudentId) ?? null);
      setStudentsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enforcedStudentId]);

  // Everything for the student is loaded in one round, so switching tabs never waits on data.
  const latestLoad = useRef(0);
  const loadStudentData = useCallback(async (student: Student) => {
    const token = ++latestLoad.current;
    const [allRequests, studentSlips, allEntries, allExtensions, closed, menuItems, timingList, allReviews] = await Promise.all([
      DataService.getDiningRequests(),
      DataService.getPaymentSlipsForStudent(student.enrollment_no),
      DataService.getDeficitEntries(),
      DataService.getGraceExtensions(),
      DataService.getClosedDays(),
      DataService.getMenu(),
      DataService.getTimings(),
      DataService.getFoodReviews()
    ]);
    if (token !== latestLoad.current) return;

    setRequests(allRequests.filter((r) => r.student_id === student.id));
    setSlips(studentSlips);
    setEntries(allEntries.filter((e) => e.student_id === student.id));
    setExtensions(allExtensions.filter((e) => e.student_id === student.id));
    setClosedDays(closed);
    setMenu(menuItems);
    setTimings(timingList);
    setReviews(allReviews);
  }, []);

  useEffect(() => {
    if (activeStudent) loadStudentData(activeStudent);
  }, [activeStudent, loadStudentData]);

  /* ------------------------------ derived ------------------------------- */

  const state = useMemo(
    () =>
      activeStudent
        ? simulateAccount({
            student: activeStudent,
            requests,
            slips,
            extensions,
            entries,
            closedDates: closedDays.map((c) => c.day),
            todayKey
          })
        : null,
    [activeStudent, requests, slips, extensions, entries, closedDays, todayKey]
  );
  const resolve = useCallback(
    (date: string) => dayInfoFor(state!, requests, date),
    [state, requests]
  );
  const hero = useMemo(() => (state ? computeHero(state, requests, todayKey) : null), [state, requests, todayKey]);
  const notices = useMemo(
    () => (state ? buildNotices(state, requests, extensions, todayKey) : []),
    [state, requests, extensions, todayKey]
  );
  const hasAlerts = notices.some((n) => n.level !== 'info');
  const pendingRequest = useMemo(
    () => requests.find((r) => r.status === 'pending') ?? null,
    [requests]
  );
  const ratedToday = useMemo(
    () =>
      reviews.some(
        (r) =>
          r.date === todayKey &&
          (r.student_id === activeStudent?.id || r.enrollment_no === activeStudent?.enrollment_no)
      ),
    [reviews, todayKey, activeStudent]
  );
  const reviewWindow = useMemo(() => getReviewWindowStatus(), []);

  /* ------------------------------ handlers ------------------------------ */

  const handleSubmitRequest = useCallback(
    async ({ startDate, reason }: DiningRequestValues) => {
      if (!activeStudent || !requestKind) return;
      await DataService.addDiningRequest({
        student_id: activeStudent.id,
        enrollment_no: activeStudent.enrollment_no,
        student_name: activeStudent.name,
        kind: requestKind,
        start_date: startDate,
        reason
      });
      await loadStudentData(activeStudent);
    },
    [activeStudent, requestKind, loadStudentData]
  );

  const handleMonthChange = useCallback((key: string) => {
    setMonthKey(key);
    setSelectedDate(null);
  }, []);

  const openBills = useCallback(() => setTab('bills'), []);
  const openNotices = useCallback(() => setIsNoticesOpen(true), []);
  const closeNotices = useCallback(() => setIsNoticesOpen(false), []);
  const openOff = useCallback(() => {
    if (!pendingRequest) setRequestKind('off');
  }, [pendingRequest]);
  const openOn = useCallback(() => {
    if (!pendingRequest) setRequestKind('on');
  }, [pendingRequest]);
  const closeRequest = useCallback(() => setRequestKind(null), []);
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

  if (!activeStudent || !state || !hero) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-rose-500" />
        <p className="text-sm font-bold text-slate-900">Student record not found</p>
        <p className="mt-1 text-xs text-slate-500">
          Your account is not linked to a resident record. Please contact the Munshi.
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

  const isOff = state.status === 'off';

  return (
    <div className="min-h-[100dvh]" style={{ backgroundImage: PAGE_BACKGROUND }}>
      <div className="relative mx-auto w-full max-w-5xl space-y-4 px-4 pb-32 pt-4">
        <StudentHeader hasAlerts={hasAlerts} onBellClick={openNotices} />

        {/* key = tab, so each tab fades/slides in using transform + opacity only */}
        <div key={tab} className="tab-enter">
          {tab === 'home' && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <div className="space-y-4">
                  <HeroBanner hero={hero} />
                  <DiningInfoStrip hero={hero} />
                  <BalanceCard state={state} onOpenBills={openBills} />

                  {pendingRequest ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-emerald-950 shadow-sm">
                          <Clock className="h-5 w-5 animate-pulse" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900">
                              {pendingRequest.kind === 'off' ? 'Dining Off Requested' : 'Open Dining Requested'}
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                              Under Review
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-700">
                            Effective from <span className="font-semibold text-slate-900">{formatLongDate(pendingRequest.start_date)}</span>
                          </p>
                          {pendingRequest.reason && (
                            <p className="mt-1 text-xs italic text-slate-600">
                              &ldquo;{pendingRequest.reason}&rdquo;
                            </p>
                          )}
                          <p className="mt-2 text-[11px] font-medium text-amber-900/80">
                            Your request is with the Munshi for approval.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isOff ? (
                    <button
                      type="button"
                      onClick={openOn}
                      className="press flex w-full items-center justify-center gap-2 rounded-full bg-emerald-900 py-3 text-sm font-bold text-white shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                      Request to open dining
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openOff}
                      className="press flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 py-3 text-sm font-bold text-emerald-950 shadow-sm"
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      Dining off
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openReview}
                    className="press flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 p-3.5 text-left shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-emerald-950 shadow-sm">
                      <Star className="h-5 w-5 fill-emerald-950" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                          Food & Cleanliness Review
                        </p>
                        {ratedToday ? (
                          <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[9px] font-extrabold text-emerald-900">
                            Rated today ✓
                          </span>
                        ) : reviewWindow.isOpen ? (
                          <span className="rounded-full bg-amber-200/90 px-2 py-0.5 text-[9px] font-extrabold text-amber-900 animate-pulse">
                            Open till 11:59 PM
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                            Opens 12:00 PM
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        {ratedToday
                          ? "You have submitted today's review. Thank you!"
                          : reviewWindow.isOpen
                          ? `Review window open until 11:59 PM tonight (${reviewWindow.countdown})`
                          : "Review opens from afternoon 12:00 PM to 11:59 PM"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <DiningCalendar
                    monthKey={monthKey}
                    todayKey={todayKey}
                    resolve={resolve}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    onMonthChange={handleMonthChange}
                  />
                </div>
              </div>

              {/* Full-width Official Dining Hall Menu Table */}
              <MenuCard menu={menu} timings={timings} todayKey={todayKey} />
            </div>
          )}

          {tab === 'log' && (
            <LogView state={state} entries={entries} todayKey={todayKey} resolve={resolve} defaultSession={currentSession} />
          )}

          {tab === 'reviews' && (
            <StudentReviewsView student={activeStudent} reviews={reviews} todayKey={todayKey} onRate={openReview} />
          )}

          {tab === 'bills' && <BillsView student={activeStudent} state={state} slips={slips} todayKey={todayKey} />}

          {tab === 'profile' && (
            <ProfileView
              student={activeStudent}
              requests={requests}
              pendingRequest={pendingRequest}
              isOff={isOff}
              onDiningOff={openOff}
              onDiningOn={openOn}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <DiningRequestModal
        open={requestKind !== null}
        kind={requestKind ?? 'off'}
        todayKey={todayKey}
        onClose={closeRequest}
        onSubmit={handleSubmitRequest}
      />

      <NotificationsSheet open={isNoticesOpen} notices={notices} onClose={closeNotices} />

      <ReviewFormModal
        open={isReviewModalOpen}
        onClose={closeReview}
        onReviewSubmitted={handleReviewSubmitted}
        activeStudent={activeStudent}
        ratedToday={ratedToday}
      />
    </div>
  );
};
