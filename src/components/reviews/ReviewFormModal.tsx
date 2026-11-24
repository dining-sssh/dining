'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, MessageSquare, Utensils, Building2, Calendar, Clock } from 'lucide-react';
import { RatingScale, HostelHouseCode, HOSTEL_HOUSES, FoodReview, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { getReviewWindowStatus, toDateKey } from '../student/studentUtils';

interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  onReviewSubmitted: (review: FoodReview) => void;
  activeStudent?: Student | null;
  ratedToday?: boolean;
}

type CriterionKey = 'quality' | 'quantity' | 'taste' | 'cleanliness';

const CRITERIA: Array<{ key: CriterionKey; title: string; subtitle: string }> = [
  {
    key: 'quality',
    title: 'Quality of the food',
    subtitle: 'Freshness of ingredients, oil quality, hygienic preparation'
  },
  {
    key: 'quantity',
    title: 'Quantity & portion size',
    subtitle: 'Adequate servings, roti and rice portions'
  },
  {
    key: 'taste',
    title: 'Taste & flavour',
    subtitle: 'Seasoning, salt balance, overall satisfaction'
  },
  {
    key: 'cleanliness',
    title: 'Cleanliness & hygiene (house-wise)',
    subtitle: 'Tables, plates and dining area cleanliness'
  }
];

const RATINGS: Array<{ rating: RatingScale; label: string }> = [
  { rating: 1, label: 'Very poor' },
  { rating: 2, label: 'Poor' },
  { rating: 3, label: 'Neutral' },
  { rating: 4, label: 'Good' },
  { rating: 5, label: 'Excellent' }
];

const sentimentFor = (score: number) => {
  if (score >= 4.5) return { text: 'Exceptional', color: 'text-emerald-700 bg-emerald-100' };
  if (score >= 3.8) return { text: 'Good', color: 'text-teal-700 bg-teal-100' };
  if (score >= 2.8) return { text: 'Average', color: 'text-amber-700 bg-amber-100' };
  return { text: 'Needs attention', color: 'text-rose-700 bg-rose-100' };
};

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  open,
  onClose,
  onReviewSubmitted,
  activeStudent,
  ratedToday = false
}) => {
  const mealType = 'dinner';
  const [ratings, setRatings] = useState<Record<CriterionKey, RatingScale>>({
    quality: 4,
    quantity: 4,
    taste: 4,
    cleanliness: 4
  });
  const [selectedHouse, setSelectedHouse] = useState<HostelHouseCode>(activeStudent?.house || 'HM');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh form each time it opens.
  useEffect(() => {
    if (open) {
      setRatings({ quality: 4, quantity: 4, taste: 4, cleanliness: 4 });
      setSelectedHouse(activeStudent?.house || 'HM');
      setComments('');
      setIsSubmitting(false);
      setSubmittedSuccess(false);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, activeStudent?.house]);

  if (!open) return null;

  const now = new Date();
  const dateKey = toDateKey(now);
  const formattedToday = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const windowStatus = getReviewWindowStatus(now);

  const computedOverall = Number(
    ((ratings.quality + ratings.quantity + ratings.taste + ratings.cleanliness) / 4).toFixed(1)
  );
  const sentiment = sentimentFor(computedOverall);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const created = await DataService.addFoodReview({
        student_id: activeStudent?.id || 's-1',
        student_name: activeStudent?.name || 'Anonymous Student',
        enrollment_no: activeStudent?.enrollment_no || 'AMU-RESIDENT',
        date: dateKey,
        meal_type: mealType,
        quality_rating: ratings.quality,
        quantity_rating: ratings.quantity,
        taste_rating: ratings.taste,
        cleanliness_rating: ratings.cleanliness,
        cleanliness_house: selectedHouse,
        comments: comments.trim() ? comments.trim() : undefined
      });

      setSubmittedSuccess(true);
      timer.current = setTimeout(() => {
        onReviewSubmitted(created);
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
    >
      <div className="sheet-enter flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 px-4 py-4 text-white sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press absolute right-3 top-3 rounded-full p-2 text-emerald-200 active:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-lg bg-amber-400 p-1.5 text-emerald-950">
              <Utensils className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">Daily dining feedback</span>
          </div>
          <h2 id="review-title" className="pr-10 text-lg font-black sm:text-2xl">
            Meal & Cleanliness Review
          </h2>
        </div>

        {submittedSuccess ? (
          <div className="space-y-3 p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Review submitted</h3>
            <p className="mx-auto max-w-sm text-sm text-slate-600">
              Thank you. Your ratings now count in the hall&apos;s daily score and the house cleanliness ranking.
            </p>
          </div>
        ) : ratedToday ? (
          <div className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Already reviewed today</h3>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-600">
              You have already submitted your review for today ({formattedToday}). Reviews are limited to once per resident each night.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="press rounded-full bg-emerald-900 px-6 py-2.5 text-xs font-bold text-white shadow"
            >
              Close
            </button>
          </div>
        ) : !windowStatus.isOpen ? (
          <div className="space-y-4 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <Clock className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Review window is closed</h3>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-600">
              Residents can submit reviews for today&apos;s meal and cleanliness from 12:00 PM afternoon until 11:59 PM at night.
            </p>
            <div className="mx-auto inline-block rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-950">
              {windowStatus.message}
            </div>
            <div>
              <button
                type="button"
                onClick={onClose}
                className="press mt-3 rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              {/* Date & meal banner (fixed to today's date, not option type) */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Calendar className="h-4 w-4 text-emerald-700" />
                    Today ({formattedToday})
                  </span>
                  <span className="truncate font-semibold text-slate-600">
                    {activeStudent ? `${activeStudent.name} (${activeStudent.house})` : 'Student resident'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2 text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Utensils className="h-4 w-4 text-emerald-800" />
                    Dinner & Hall Cleanliness
                  </div>
                  <span className="rounded-full bg-emerald-200/90 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900">
                    Open till 11:59 PM
                  </span>
                </div>
              </div>

              {/* Criteria */}
              {CRITERIA.map((c) => (
                <fieldset key={c.key}>
                  <legend className="text-sm font-bold leading-snug text-slate-800">{c.title}</legend>
                  <p className="mb-2 text-[11px] leading-tight text-slate-400">{c.subtitle}</p>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {RATINGS.map((r) => {
                      const selected = ratings[c.key] === r.rating;
                      return (
                        <button
                          key={r.rating}
                          type="button"
                          onClick={() => setRatings((prev) => ({ ...prev, [c.key]: r.rating }))}
                          aria-pressed={selected}
                          aria-label={`${c.title}: ${r.label}`}
                          className={`press flex flex-col items-center justify-center rounded-xl border-2 px-0.5 py-2 transition-colors ${
                            selected
                              ? 'border-emerald-700 bg-emerald-700 text-white shadow'
                              : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'
                          }`}
                        >
                          <span className="text-base font-extrabold leading-none">{r.rating}</span>
                          <span
                            className={`mt-1 truncate text-[9px] font-medium leading-none sm:text-[11px] ${
                              selected ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {r.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {c.key === 'cleanliness' && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <Building2 className="h-4 w-4 text-emerald-800" />
                        Which house are you rating?
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((code) => {
                          const on = selectedHouse === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setSelectedHouse(code)}
                              aria-pressed={on}
                              title={HOSTEL_HOUSES[code].name}
                              className={`press rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                                on
                                  ? 'border-emerald-900 bg-emerald-800 text-white'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              {code}
                              <span className="hidden sm:inline"> - {HOSTEL_HOUSES[code].shortName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </fieldset>
              ))}

              {/* Overall */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold text-slate-600">Overall score</span>
                <span className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900">{computedOverall} / 5</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sentiment.color}`}>{sentiment.text}</span>
                </span>
              </div>

              {/* Comments */}
              <div>
                <label htmlFor="review-comments" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                  Remarks (optional)
                </label>
                <textarea
                  id="review-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Rice was well cooked, but the vegetable needed more salt."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-600 sm:text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white p-3 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="press rounded-full px-5 py-2.5 text-xs font-bold text-slate-600 active:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="press flex-1 rounded-full bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-3 text-xs font-bold text-white shadow-md disabled:opacity-50 sm:flex-none"
              >
                {isSubmitting ? 'Submitting…' : 'Submit review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
