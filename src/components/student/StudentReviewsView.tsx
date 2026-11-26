'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Calendar, CheckCircle2, Clock, MessageSquare, Plus, Star } from 'lucide-react';
import { FoodReview, HOSTEL_HOUSES, Student } from '@/types';
import { aggregateReviews, HOUSE_CODES, scoreBadge } from '@/lib/reviewStats';
import { formatLongDate, getReviewWindowStatus } from './studentUtils';

interface StudentReviewsViewProps {
  student: Student;
  reviews: FoodReview[];
  todayKey: string;
  onRate: () => void;
}

const MEAL_LABEL: Record<FoodReview['meal_type'], string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
  all_day: 'Whole day'
};

const MY_RECENT_LIMIT = 5;

export const StudentReviewsView: React.FC<StudentReviewsViewProps> = ({ student, reviews, todayKey, onRate }) => {
  const [windowStatus, setWindowStatus] = useState(() => getReviewWindowStatus());

  useEffect(() => {
    const timer = setInterval(() => setWindowStatus(getReviewWindowStatus()), 15000);
    return () => clearInterval(timer);
  }, []);

  const mine = useMemo(
    () =>
      reviews
        .filter((r) => r.student_id === student.id || r.enrollment_no === student.enrollment_no)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [reviews, student.id, student.enrollment_no]
  );
  const myAggregate = useMemo(() => aggregateReviews(mine), [mine]);
  const ratedToday = mine.some((r) => r.date === todayKey);

  const todayReviews = useMemo(() => reviews.filter((r) => r.date === todayKey), [reviews, todayKey]);
  const overall = useMemo(() => aggregateReviews(todayReviews), [todayReviews]);
  const badge = scoreBadge(overall.overall);

  const params = [
    { label: 'Quality', value: overall.quality, bar: 'bg-emerald-600' },
    { label: 'Quantity', value: overall.quantity, bar: 'bg-teal-600' },
    { label: 'Taste', value: overall.taste, bar: 'bg-amber-500' },
    { label: 'Cleanliness', value: overall.cleanliness, bar: 'bg-sky-600' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Food & Cleanliness</h2>
          <p className="text-xs text-slate-500">Your ratings and today&apos;s hall feedback</p>
        </div>
        {ratedToday ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            Rated today
          </span>
        ) : windowStatus.isOpen ? (
          <button
            type="button"
            onClick={onRate}
            className="press flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow ring-2 ring-emerald-700/40"
          >
            <Plus className="h-4 w-4" />
            Rate today
          </button>
        ) : (
          <button
            type="button"
            onClick={onRate}
            className="press flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
          >
            <Clock className="h-3.5 w-3.5" />
            {windowStatus.windowLabel}
          </button>
        )}
      </div>

      {/* Review window status banner */}
      <div
        className={`rounded-2xl border p-3.5 text-xs ${
          ratedToday
            ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
            : windowStatus.isOpen
            ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-400/40'
            : 'border-amber-200 bg-amber-50 text-amber-950'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {ratedToday ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            ) : (
              <Clock
                className={`h-4 w-4 shrink-0 ${
                  windowStatus.isOpen ? 'animate-pulse text-emerald-700' : 'text-amber-700'
                }`}
              />
            )}
            <span className="font-semibold">
              {ratedToday
                ? `You have rated today's dinner (${formatLongDate(todayKey)}). Thank you!`
                : windowStatus.message}
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold shadow-2xs">
            {ratedToday ? 'Submitted' : windowStatus.countdown}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Your ratings */}
        <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Your recent ratings</h3>
            {mine.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                Your average {myAggregate.overall} / 5 · {mine.length} {mine.length === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </div>

          {!ratedToday && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
              You have not rated today yet.
            </p>
          )}

          {mine.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">You have not rated any meal yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {mine.slice(0, MY_RECENT_LIMIT).map((r) => (
                <MyReviewCard key={r.id} review={r} />
              ))}
            </ul>
          )}
        </section>

        {/* Today's overall rating of all students */}
        <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">Today&apos;s rating · all students</h3>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-emerald-900/10 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-950">
            <span className="flex items-center gap-2 font-bold">
              <Calendar className="h-4 w-4 text-emerald-800" />
              {formatLongDate(todayKey)}
            </span>
            <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-900">
              Today&apos;s Score
            </span>
          </div>

          {overall.count === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No reviews submitted yet for today.</p>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#0c5a41] to-[#052e20] p-4 text-white">
                <Award className="h-8 w-8 shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">Overall score</p>
                  <p className="text-3xl font-black leading-tight">
                    {overall.overall}
                    <span className="text-sm font-semibold text-emerald-200"> / 5</span>
                  </p>
                  <p className="text-[11px] text-emerald-100">{overall.count} reviews</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badge.className}`}>
                  {badge.text}
                </span>
              </div>

              <ul className="mt-4 space-y-3">
                {params.map((p) => (
                  <li key={p.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{p.label}</span>
                      <span className="font-bold text-slate-900">{p.value} / 5</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${p.bar}`} style={{ width: `${(p.value / 5) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>

              <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">
                House-wise cleanliness
              </h4>
              <ul className="space-y-2">
                {HOUSE_CODES.map((code) => {
                  const h = overall.houses[code];
                  const mineHouse = code === student.house;
                  return (
                    <li
                      key={code}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs ${
                        mineHouse ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'
                      }`}
                    >
                      <span className={`w-9 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-extrabold ${HOSTEL_HOUSES[code].color}`}>
                        {code}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">
                        {HOSTEL_HOUSES[code].shortName}
                        {mineHouse && <span className="ml-1 text-emerald-700">(your house)</span>}
                      </span>
                      <span className="shrink-0 font-bold text-slate-900">
                        {h.count ? `${h.average} / 5` : '--'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const MyReviewCard: React.FC<{ review: FoodReview }> = ({ review: r }) => {
  const badge = scoreBadge(r.overall_rating);
  const scores = [
    { label: 'Quality', v: r.quality_rating },
    { label: 'Quantity', v: r.quantity_rating },
    { label: 'Taste', v: r.taste_rating },
    { label: `Clean · ${r.cleanliness_house}`, v: r.cleanliness_rating }
  ];

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-900">
            {formatLongDate(r.date)} · {MEAL_LABEL[r.meal_type]}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
          <Star className="mr-0.5 inline h-3 w-3 -translate-y-px fill-current" />
          {r.overall_rating}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {scores.map((s) => (
          <div key={s.label} className="rounded-lg bg-white px-1 py-1.5 ring-1 ring-slate-200">
            <p className="text-sm font-extrabold leading-none text-slate-900">{s.v}</p>
            <p className="mt-1 truncate text-[10px] font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {r.comments && (
        <p className="mt-2 flex gap-1.5 text-[11px] italic text-slate-600">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <span className="min-w-0 break-words">{r.comments}</span>
        </p>
      )}
    </li>
  );
};
