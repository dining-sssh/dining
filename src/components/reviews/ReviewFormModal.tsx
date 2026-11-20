'use client';

import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, MessageSquare, Utensils, Building2, Calendar } from 'lucide-react';
import { RatingScale, HostelHouseCode, HOSTEL_HOUSES, FoodReview, Student } from '@/types';
import { DataService } from '@/lib/dataService';

interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  onReviewSubmitted: (review: FoodReview) => void;
  activeStudent?: Student | null;
}

interface ParameterRow {
  key: 'quality' | 'quantity' | 'taste' | 'cleanliness';
  title: string;
  subtitle: string;
}

const PARAMETERS: ParameterRow[] = [
  {
    key: 'quality',
    title: 'The overall quality of the food',
    subtitle: 'Freshness of ingredients, oil quality, and hygienic preparation'
  },
  {
    key: 'quantity',
    title: 'The quantity & portion size',
    subtitle: 'Adequacy of servings, roti replenishment, and rice portions'
  },
  {
    key: 'taste',
    title: 'The taste & flavor of dishes',
    subtitle: 'Seasoning, authenticity, salt balance, and meal satisfaction'
  },
  {
    key: 'cleanliness',
    title: 'The cleanliness & hygiene (House-wise)',
    subtitle: 'Dining table sanitization, plate hygiene & dining area cleanliness'
  }
];

const RATING_COLUMNS: Array<{ rating: RatingScale; label: string }> = [
  { rating: 1, label: 'Very Poor' },
  { rating: 2, label: 'Poor' },
  { rating: 3, label: 'Neutral' },
  { rating: 4, label: 'Good' },
  { rating: 5, label: 'Excellent' }
];

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  open,
  onClose,
  onReviewSubmitted,
  activeStudent
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const date = todayStr;
  const [mealType, setMealType] = useState<'lunch' | 'dinner' | 'all_day'>('lunch');
  const [quality, setQuality] = useState<RatingScale>(4);
  const [quantity, setQuantity] = useState<RatingScale>(4);
  const [taste, setTaste] = useState<RatingScale>(4);
  const [cleanliness, setCleanliness] = useState<RatingScale>(4);
  const [selectedHouse, setSelectedHouse] = useState<HostelHouseCode>(activeStudent?.house || 'HM');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!open) return null;

  // Real-time overall score
  const computedOverall = Number(((quality + quantity + taste + cleanliness) / 4).toFixed(1));

  const getSentimentText = (score: number) => {
    if (score >= 4.5) return { text: 'Exceptional (5/5)', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' };
    if (score >= 3.8) return { text: 'Good (4/5)', color: 'text-teal-700 bg-teal-100 border-teal-300' };
    if (score >= 2.8) return { text: 'Average / Neutral (3/5)', color: 'text-amber-700 bg-amber-100 border-amber-300' };
    return { text: 'Needs Urgent Attention', color: 'text-rose-700 bg-rose-100 border-rose-300' };
  };

  const sentiment = getSentimentText(computedOverall);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const studentId = activeStudent?.id || 's-1';
      const studentName = activeStudent?.name || 'Anonymous Student';
      const enrollmentNo = activeStudent?.enrollment_no || 'AMU-RESIDENT';

      const created = await DataService.addFoodReview({
        student_id: studentId,
        student_name: studentName,
        enrollment_no: enrollmentNo,
        date,
        meal_type: mealType,
        quality_rating: quality,
        quantity_rating: quantity,
        taste_rating: taste,
        cleanliness_rating: cleanliness,
        cleanliness_house: selectedHouse,
        comments: comments.trim() ? comments.trim() : undefined
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmittedSuccess(false);
        onReviewSubmitted(created);
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl my-8 bg-white rounded-3xl shadow-2xl border-2 border-emerald-800/15 overflow-hidden">
        {/* Header styling inspired by AMU Sir Syed Hall colors */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-400 text-emerald-950">
              <Utensils className="w-4 h-4" />
            </span>
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300">
              Daily Dining Feedback
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">Daily Meal & Cleanliness Review</h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            Your review is monitored live on a daily basis by the Provost, Senior Munshi, and fellow students.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Review Submitted Successfully!</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Thank you for rating today’s food and cleanliness. Your ratings have updated the hall’s daily aggregate score and house cleanliness ranking.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Top metadata strip: Current Date, Meal Type, and Student Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Date (Current Date)</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-xs">
                  <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Today ({formattedToday})</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1">Meal Served</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as 'lunch' | 'dinner' | 'all_day')}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="all_day">Whole Day</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-500 mb-1">Reviewer</label>
                <div className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 truncate">
                  {activeStudent ? `${activeStudent.name} (${activeStudent.house})` : 'Student Resident'}
                </div>
              </div>
            </div>

            {/* Matrix Card styled exactly like the user's uploaded reference image */}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 sm:p-6 shadow-sm">
              <div className="text-center mb-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  Please rate our dining hall based on your recent dining experience:
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your rating from Very Poor to Excellent for each criterion
                </p>
              </div>

              {/* Responsive Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-3 text-xs font-bold text-slate-600 uppercase tracking-wider w-2/5">
                        Criteria
                      </th>
                      {RATING_COLUMNS.map((col) => (
                        <th
                          key={col.rating}
                          className="text-center pb-3 text-xs font-semibold text-slate-600 px-2"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PARAMETERS.map((param) => {
                      const currentVal =
                        param.key === 'quality'
                          ? quality
                          : param.key === 'quantity'
                          ? quantity
                          : param.key === 'taste'
                          ? taste
                          : cleanliness;

                      const setter =
                        param.key === 'quality'
                          ? setQuality
                          : param.key === 'quantity'
                          ? setQuantity
                          : param.key === 'taste'
                          ? setTaste
                          : setCleanliness;

                      return (
                        <React.Fragment key={param.key}>
                          <tr className="hover:bg-slate-50/80 transition group">
                            <td className="py-4 pr-3 align-middle">
                              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                                {param.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                                {param.subtitle}
                              </p>
                            </td>

                            {RATING_COLUMNS.map((col) => {
                              const isChecked = currentVal === col.rating;
                              return (
                                <td
                                  key={col.rating}
                                  className="py-4 px-2 text-center align-middle cursor-pointer"
                                  onClick={() => setter(col.rating)}
                                >
                                  <div className="flex flex-col items-center justify-center">
                                    <div
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                        isChecked
                                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-md scale-105'
                                          : 'border-slate-300 bg-white hover:border-slate-400 group-hover:bg-white'
                                      }`}
                                    >
                                      {isChecked ? (
                                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                      ) : null}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 font-medium sm:hidden">
                                      {col.rating}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>

                          {/* Specific requirement: FOR CLEANLINESS ADD OPTION TO SELECT HOSTEL (HM, QH, etc.) */}
                          {param.key === 'cleanliness' && (
                            <tr className="bg-emerald-50/60 border-t border-b border-emerald-200">
                              <td colSpan={6} className="p-3.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                                    <Building2 className="w-4 h-4 text-emerald-800" />
                                    <span>Select Hostel / House for Cleanliness Rating:</span>
                                    <span className="text-[11px] text-emerald-700 font-normal">
                                      (Defines house-wise hygiene report)
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((code) => {
                                      const isHouseSelected = selectedHouse === code;
                                      const hInfo = HOSTEL_HOUSES[code];
                                      return (
                                        <button
                                          key={code}
                                          type="button"
                                          onClick={() => setSelectedHouse(code)}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                                            isHouseSelected
                                              ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-600/30'
                                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                                          }`}
                                          title={hInfo.name}
                                        >
                                          {code} - {hInfo.shortName}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Overall Score Banner */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Calculated Overall Score:</span>
                  <span className="text-xl font-black text-slate-900">{computedOverall} / 5.0</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${sentiment.color}`}>
                    {sentiment.text}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Equal weight (25% each): Quality, Quantity, Taste, Cleanliness</span>
                </div>
              </div>
            </div>

            {/* Optional Comments */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Remarks & Specific Feedback (Optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g. Rice was well cooked, but vegetable salt was a bit low. Dining table was clean..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none text-slate-800 placeholder-slate-400 bg-white"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                {isSubmitting ? 'Recording Review...' : 'Submit Food & Cleanliness Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
