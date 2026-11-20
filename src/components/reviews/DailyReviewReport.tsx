'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  Calendar, 
  Building, 
  Utensils, 
  Users, 
  Filter, 
  MessageSquare,
  Award,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { 
  FoodReview, 
  DailyReviewSummary, 
  HostelHouseCode, 
  HOSTEL_HOUSES, 
  Student, 
  UserRole 
} from '@/types';
import { DataService } from '@/lib/dataService';
import { ReviewFormModal } from './ReviewFormModal';

interface DailyReviewReportProps {
  userRole?: UserRole; // 'student' | 'provost' | 'munshi'
  activeStudent?: Student | null;
  onOpenReviewModal?: () => void;
  showSubmitButton?: boolean;
}

export const DailyReviewReport: React.FC<DailyReviewReportProps> = ({
  userRole = 'student',
  activeStudent,
  showSubmitButton = true
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const formattedToday = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    []
  );

  const [summary, setSummary] = useState<DailyReviewSummary | null>(null);
  const [allSummaries, setAllSummaries] = useState<DailyReviewSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters for individual reviews
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('ALL');
  const [selectedMealFilter, setSelectedMealFilter] = useState<string>('ALL');

  const loadData = async (dateStr: string) => {
    setIsLoading(true);
    try {
      const [daySummary, allDays] = await Promise.all([
        DataService.getDailyReviewSummary(dateStr),
        DataService.getAllDailyReviewSummaries()
      ]);
      setSummary(daySummary);
      setAllSummaries(allDays);
    } catch (err) {
      console.error('Failed to load review data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(todayStr);
  }, [todayStr]);

  // House-wise cleanliness sorted list
  const rankedHouses = useMemo(() => {
    if (!summary) return [];
    const list = (Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((code) => {
      const item = summary.house_cleanliness[code];
      const hInfo = HOSTEL_HOUSES[code];
      return {
        code,
        name: hInfo.name,
        shortName: hInfo.shortName,
        color: hInfo.color,
        score: item?.averageScore || 0,
        count: item?.reviewCount || 0
      };
    });

    // Sort by cleanliness score desc
    return list.sort((a, b) => b.score - a.score);
  }, [summary]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (!summary?.reviews) return [];
    return summary.reviews.filter((r) => {
      const matchHouse =
        selectedHouseFilter === 'ALL' || r.cleanliness_house === selectedHouseFilter;
      const matchMeal =
        selectedMealFilter === 'ALL' || r.meal_type === selectedMealFilter;
      return matchHouse && matchMeal;
    });
  }, [summary, selectedHouseFilter, selectedMealFilter]);

  const getScoreBadge = (score: number) => {
    if (score >= 4.5) {
      return { text: 'Excellent', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (score >= 3.8) {
      return { text: 'Good', bg: 'bg-teal-100 text-teal-800 border-teal-300' };
    }
    if (score >= 2.8) {
      return { text: 'Average', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { text: 'Needs Improvement', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const handleReviewCreated = async () => {
    await loadData(todayStr);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Current Date & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Utensils className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800">
                Daily Dining & Hygiene Audit
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Daily Food Reviews & House Cleanliness Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Shared transparency report visible to Provost, Munshi, and all resident students.
            </p>
          </div>

          {/* Current Date Badge & Submit Action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-950 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-xs">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Current Date: {formattedToday}</span>
            </div>

            {showSubmitButton && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Rate Food & Cleanliness</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Core Metric Cards: Overall Score + 4 Parameters */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
          {/* Daily Overall Score */}
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-4.5 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-200">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Daily Overall Score</span>
                <Award className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-3xl font-black mt-2 text-white">
                {summary && summary.total_reviews > 0 ? `${summary.overall_score}` : 'N/A'}
                <span className="text-sm font-normal text-emerald-200"> / 5.0</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-emerald-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] text-emerald-200">
                {summary ? `${summary.total_reviews} reviews` : '0 reviews'}
              </span>
              {summary && summary.total_reviews > 0 && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${getScoreBadge(summary.overall_score).bg}`}>
                  {getScoreBadge(summary.overall_score).text}
                </span>
              )}
            </div>
          </div>

          {/* 1. Quality */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Food Quality
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary && summary.total_reviews > 0 ? summary.quality_score : '--'}
                <span className="text-xs text-slate-400 font-medium"> / 5</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((summary?.quality_score || 0) / 5) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Ingredients & hygiene</div>
            </div>
          </div>

          {/* 2. Quantity */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Serving Quantity
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary && summary.total_reviews > 0 ? summary.quantity_score : '--'}
                <span className="text-xs text-slate-400 font-medium"> / 5</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((summary?.quantity_score || 0) / 5) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Portion size adequacy</div>
            </div>
          </div>

          {/* 3. Taste */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Dish Taste
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary && summary.total_reviews > 0 ? summary.taste_score : '--'}
                <span className="text-xs text-slate-400 font-medium"> / 5</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((summary?.taste_score || 0) / 5) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Seasoning & culinary flavor</div>
            </div>
          </div>

          {/* 4. Cleanliness */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Cleanliness (Overall)
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {summary && summary.total_reviews > 0 ? summary.cleanliness_score : '--'}
                <span className="text-xs text-slate-400 font-medium"> / 5</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((summary?.cleanliness_score || 0) / 5) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Hostel-wide dining hygiene</div>
            </div>
          </div>
        </div>
      </div>

      {/* House-wise Cleanliness Section (Special requirement) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-800" />
              <h3 className="text-lg font-bold text-slate-900">
                Hostel House-Wise Cleanliness Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific cleanliness ratings submitted by residents for HM, QH, BH, KH, AK, and MB wings.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
            Today's Inspection Date: <span className="font-bold text-slate-800">{formattedToday}</span>
          </div>
        </div>

        {/* House Cleanliness Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {rankedHouses.map((item, index) => {
            const hasData = item.count > 0;
            const badge = getScoreBadge(item.score);
            return (
              <div
                key={item.code}
                className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${item.color}`}>
                          {item.code}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{item.shortName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" title={item.name}>
                        {item.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">
                      {hasData ? `${item.score}` : '--'}
                      <span className="text-[11px] font-normal text-slate-400">/5</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {hasData ? `${item.count} ratings` : 'No reviews'}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        item.score >= 4.0
                          ? 'bg-emerald-600'
                          : item.score >= 3.0
                          ? 'bg-teal-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${hasData ? (item.score / 5) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Cleanliness Status:</span>
                  {hasData ? (
                    <span className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${badge.bg}`}>
                      {badge.text}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Pending inspection</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Reviews Feed & Feedback Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-800" />
              <h3 className="text-lg font-bold text-slate-900">
                Individual Student Feedback & Ratings
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live submissions from residents for today ({formattedToday})
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filter by House */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">House:</span>
              <select
                value={selectedHouseFilter}
                onChange={(e) => setSelectedHouseFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="ALL">All Houses</option>
                {(Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((code) => (
                  <option key={code} value={code}>
                    {code} - {HOSTEL_HOUSES[code].shortName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Meal */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Meal:</span>
              <select
                value={selectedMealFilter}
                onChange={(e) => setSelectedMealFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="ALL">All Meals</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="all_day">Whole Day</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Utensils className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No reviews recorded for today ({formattedToday})</p>
            <p className="text-xs text-slate-400 mt-1">
              Be the first resident to rate today’s dining food and cleanliness!
            </p>
            {showSubmitButton && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Submit Review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 mt-5">
            {filteredReviews.map((rev) => {
              const hInfo = HOSTEL_HOUSES[rev.cleanliness_house];
              const overallBadge = getScoreBadge(rev.overall_rating);

              return (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white hover:border-slate-300 transition shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                        {rev.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {rev.student_name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            ({rev.enrollment_no})
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {rev.meal_type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Reviewed: {new Date(rev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {rev.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Overall Score:</span>
                      <span className="text-base font-black text-slate-900">
                        {rev.overall_rating} / 5
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${overallBadge.bg}`}>
                        {overallBadge.text}
                      </span>
                    </div>
                  </div>

                  {/* 4 Score Badges Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-1">
                    <div className="bg-slate-50 rounded-xl p-2 text-xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Quality</span>
                      <div className="flex items-center gap-1 font-bold text-slate-800 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{rev.quality_rating} / 5</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2 text-xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Quantity</span>
                      <div className="flex items-center gap-1 font-bold text-slate-800 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{rev.quantity_rating} / 5</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2 text-xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Taste</span>
                      <div className="flex items-center gap-1 font-bold text-slate-800 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{rev.taste_rating} / 5</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2 text-xs">
                      <span className="text-[10px] text-emerald-800 font-semibold block">
                        Cleanliness ({rev.cleanliness_house})
                      </span>
                      <div className="flex items-center gap-1 font-bold text-emerald-950 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        <span>{rev.cleanliness_rating} / 5</span>
                        <span className="text-[10px] font-normal text-emerald-700 truncate">
                          ({hInfo?.shortName || rev.cleanliness_house})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  {rev.comments && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 italic border-l-3 border-emerald-600">
                      "{rev.comments}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      <ReviewFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReviewSubmitted={handleReviewCreated}
        activeStudent={activeStudent}
      />
    </div>
  );
};
