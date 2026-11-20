'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Ban, X, AlertTriangle, CheckCircle2, Calendar, User, Clock, ArrowRight } from 'lucide-react';
import { Student, DiningDailyRecord } from '@/types';
import { DataService } from '@/lib/dataService';
import { addDays, formatLongDate, toDateKey } from '@/components/student/studentUtils';

interface CloseDiningModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  students: Student[];
  onSuccess: (updatedStudent: Student, actualStartDate: string, totalDays: number) => void;
}

export const CloseDiningModal: React.FC<CloseDiningModalProps> = ({
  isOpen,
  onClose,
  student,
  students,
  onSuccess
}) => {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const tomorrowKey = useMemo(() => addDays(todayKey, 1), [todayKey]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(student?.id || '');
  const [closureStartDate, setClosureStartDate] = useState<string>(tomorrowKey);
  const [durationMode, setDurationMode] = useState<'indefinite' | 'fixed'>('indefinite');
  const [closureEndDate, setClosureEndDate] = useState<string>(addDays(tomorrowKey, 60));
  const [reason, setReason] = useState<string>('Official Leave / Going Home');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState<DiningDailyRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Sync selected student when prop changes or modal opens
  useEffect(() => {
    if (student) {
      setSelectedStudentId(student.id);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [student, students]);

  const currentStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || student || null,
    [students, selectedStudentId, student]
  );

  // Check if current student has eaten meals today
  useEffect(() => {
    if (!currentStudent || !isOpen) return;

    setLoadingRecord(true);
    DataService.getDailyRecordsForDate(todayKey).then((records) => {
      const rec = records.find((r) => r.student_id === currentStudent.id);
      setTodayRecord(rec || null);
      setLoadingRecord(false);

      // If already eaten lunch/meals today, enforce that closure must be tomorrow or later
      const hasEaten = rec && (rec.lunch || rec.dinner || rec.eaten) && !rec.is_rebate;
      if (hasEaten) {
        setClosureStartDate((prev) => (prev <= todayKey ? tomorrowKey : prev));
      }
    });
  }, [currentStudent, todayKey, tomorrowKey, isOpen]);

  if (!isOpen) return null;

  const hasEatenToday = Boolean(
    todayRecord && (todayRecord.lunch || todayRecord.dinner || todayRecord.eaten) && !todayRecord.is_rebate
  );

  // Minimum allowed start date:
  // If eaten today, min date is tomorrow.
  const minAllowedDate = hasEatenToday ? tomorrowKey : todayKey;

  const handleStartDateChange = (val: string) => {
    if (hasEatenToday && val < tomorrowKey) {
      alert(
        `Cannot close dining for today: Resident ${currentStudent?.name} has already eaten lunch/meals today. As per dining rules, dining must close from tomorrow (${formatLongDate(tomorrowKey)}).`
      );
      setClosureStartDate(tomorrowKey);
      return;
    }
    setClosureStartDate(val);
    if (closureEndDate < val) {
      setClosureEndDate(addDays(val, 30));
    }
  };

  const finalReason = customReason.trim() ? customReason.trim() : reason;
  const effectiveEndDate = durationMode === 'indefinite' ? addDays(closureStartDate, 90) : closureEndDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    if (hasEatenToday && closureStartDate <= todayKey) {
      alert('Lunch has already been taken today. Dining cannot be closed for today.');
      setClosureStartDate(tomorrowKey);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await DataService.closeDiningForStudent({
        studentId: currentStudent.id,
        enrollmentNo: currentStudent.enrollment_no,
        studentName: currentStudent.name,
        effectiveDate: closureStartDate,
        endDate: effectiveEndDate,
        reason: finalReason,
        markedBy: 'Munshi'
      });

      onSuccess(currentStudent, result.actualStartDate, result.affectedDays);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to close dining. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden fade-enter my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 to-rose-800 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-700/80 border border-rose-500/40 flex items-center justify-center text-white shadow-inner">
              <Ban className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">
                Close Resident Dining
              </h2>
              <p className="text-xs text-rose-200">
                Mark mess off / stop meals in accordance with dining hall rules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-rose-700/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700 font-sans">
          
          {/* 1. Student Selection / Summary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Select Resident:
            </label>
            <div className="relative">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.enrollment_no} - {s.name} ({s.house} {s.room_no}) · {s.course}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Real-Time Today's Dining Status Check (Crucial Rule) */}
          <div className="p-3.5 rounded-xl border transition-colors space-y-2 bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Today&apos;s Meal Status ({formatLongDate(todayKey)}):
              </span>
              {loadingRecord ? (
                <span className="text-[11px] text-slate-400">Checking…</span>
              ) : hasEatenToday ? (
                <span className="font-mono font-bold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded text-[11px]">
                  Lunch Consumed
                </span>
              ) : (
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                  No Meals Consumed Yet
                </span>
              )}
            </div>

            {hasEatenToday ? (
              <div className="p-2.5 bg-amber-50/90 border border-amber-300 text-amber-950 rounded-lg text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Rule Applied:</strong> Because lunch/meals have already been eaten today, 
                  dining <u>cannot</u> be closed for today. Dining will close starting from 
                  <strong> tomorrow ({formatLongDate(tomorrowKey)})</strong>.
                </div>
              </div>
            ) : (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No meals recorded yet today. Dining can be closed starting from tomorrow (standard) or today.</span>
              </div>
            )}
          </div>

          {/* 3. Closure Start Date */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-700" />
                <span>Close Dining From Date:</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStartDateChange(tomorrowKey)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                    closureStartDate === tomorrowKey
                      ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Tomorrow (Next Day)
                </button>
                {!hasEatenToday && (
                  <button
                    type="button"
                    onClick={() => handleStartDateChange(todayKey)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      closureStartDate === todayKey
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            <input
              type="date"
              min={minAllowedDate}
              value={closureStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            <p className="text-[11px] text-slate-500">
              Effective date: <strong>{formatLongDate(closureStartDate)}</strong>
            </p>
          </div>

          {/* 4. Duration / End Date */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Duration of Closure:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDurationMode('indefinite')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  durationMode === 'indefinite'
                    ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold ring-1 ring-rose-400'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="font-bold text-xs">Until Further Notice</div>
                <div className="text-[10px] text-slate-500">Reopens when student reports back</div>
              </button>

              <button
                type="button"
                onClick={() => setDurationMode('fixed')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  durationMode === 'fixed'
                    ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold ring-1 ring-rose-400'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="font-bold text-xs">Fixed Date Range</div>
                <div className="text-[10px] text-slate-500">Set specific reopening date</div>
              </button>
            </div>

            {durationMode === 'fixed' && (
              <div className="pt-1.5 space-y-1">
                <span className="text-[11px] font-bold text-slate-700">Closed Until Date:</span>
                <input
                  type="date"
                  min={closureStartDate}
                  value={closureEndDate}
                  onChange={(e) => setClosureEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            )}
          </div>

          {/* 5. Reason for Closure */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Reason for Dining Closure:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Going Home / Vacation',
                'Official Mess Off',
                'Medical Leave',
                'Semester Break',
                'Resident Request'
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setReason(r);
                    setCustomReason('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    reason === r && !customReason
                      ? 'bg-rose-100 text-rose-900 border-rose-400'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Or write custom reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              <span>{isSubmitting ? 'Closing Dining…' : 'Confirm & Close Dining'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
