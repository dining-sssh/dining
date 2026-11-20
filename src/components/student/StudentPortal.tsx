'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  CreditCard, 
  Utensils, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Send, 
  Printer, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  Coffee, 
  Moon, 
  Award,
  ChevronDown,
  Receipt,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';
import { Student, DiningDailyRecord, MonthlyBill, RebateRequest, HOSTEL_HOUSES } from '@/types';
import { DataService } from '@/lib/dataService';

interface StudentPortalProps {
  enforcedStudentId?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ enforcedStudentId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(enforcedStudentId || '');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  // View mode requested: Per-year session, Per-month, Per-day
  const [viewTab, setViewTab] = useState<'session' | 'month' | 'day'>('day');
  
  // Session & Month selectors
  const [selectedSession, setSelectedSession] = useState<string>('2026-2027');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-11');
  const [monthCardFilterMode, setMonthCardFilterMode] = useState<'all' | 'selected-only'>('all');

  // Student data
  const [studentBills, setStudentBills] = useState<MonthlyBill[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DiningDailyRecord[]>([]);
  const [rebates, setRebates] = useState<RebateRequest[]>([]);

  // Rebate modal
  const [isRebateModalOpen, setIsRebateModalOpen] = useState(false);
  const [rebateStart, setRebateStart] = useState('');
  const [rebateEnd, setRebateEnd] = useState('');
  const [rebateReason, setRebateReason] = useState('');
  const [rebateMsg, setRebateMsg] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      if (enforcedStudentId) {
        const found = students.find(s => s.id === enforcedStudentId);
        if (found) {
          setSelectedStudentId(found.id);
          setActiveStudent(found);
          return;
        }
      }
      const initial = students[0];
      setSelectedStudentId(initial.id);
      setActiveStudent(initial);
    }
  }, [students, enforcedStudentId]);

  useEffect(() => {
    if (activeStudent) {
      loadStudentData(activeStudent);
    }
  }, [activeStudent, selectedSession, selectedMonthKey]);

  const loadStudents = async () => {
    const list = await DataService.getStudents();
    setStudents(list);
  };

  const loadStudentData = async (student: Student) => {
    const [bills, allDaily, allRebates] = await Promise.all([
      DataService.getBillsForStudent(student.enrollment_no, selectedSession),
      DataService.getAllDailyRecords(),
      DataService.getRebateRequests()
    ]);

    setStudentBills(bills);
    if (bills.length > 0 && !bills.some(b => b.month_key === selectedMonthKey)) {
      setSelectedMonthKey(bills[bills.length - 1].month_key);
    }
    setDailyRecords(allDaily.filter(r => r.student_id === student.id));
    setRebates(allRebates.filter(r => r.student_id === student.id || r.enrollment_no === student.enrollment_no));
  };

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    const found = students.find(s => s.id === id);
    if (found) {
      setActiveStudent(found);
    }
  };

  const handleApplyRebate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !rebateStart || !rebateEnd || !rebateReason) return;

    await DataService.addRebateRequest({
      student_id: activeStudent.id,
      enrollment_no: activeStudent.enrollment_no,
      student_name: activeStudent.name,
      start_date: rebateStart,
      end_date: rebateEnd,
      reason: rebateReason
    });

    setRebateMsg('Your rebate application has been submitted to the Provost and Munshi for approval.');
    setTimeout(() => {
      setIsRebateModalOpen(false);
      setRebateMsg('');
      setRebateStart('');
      setRebateEnd('');
      setRebateReason('');
      if (activeStudent) loadStudentData(activeStudent);
    }, 2000);
  };

  if (!activeStudent) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Student Portal...</p>
      </div>
    );
  }

  const houseInfo = HOSTEL_HOUSES[activeStudent.house];

  // Calculations for Per-Year Session
  const totalSessionDiets = studentBills.reduce((acc, b) => acc + (b.total_diets || 0), 0);
  const totalSessionRebates = studentBills.reduce((acc, b) => acc + (b.rebate_days || 0), 0);
  const totalSessionBilled = studentBills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const totalSessionPaid = studentBills.filter(b => b.status === 'paid').reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const outstandingBalance = totalSessionBilled - totalSessionPaid;

  // Selected Month Bill
  const currentMonthBill = studentBills.find(b => b.month_key === selectedMonthKey) || studentBills[0];

  // Records for the selected month in Day-wise panel
  const monthDailyRecords = dailyRecords
    .filter(r => r.date.startsWith(selectedMonthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Student Profile & Quick Switcher Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {activeStudent.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{activeStudent.name}</h2>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {activeStudent.enrollment_no}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {activeStudent.course} • {activeStudent.email}
              </p>
            </div>
          </div>

          {/* Student Switcher: ONLY visible to Admins who inspect student records */}
          {!enforcedStudentId ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Inspect Resident:
              </label>
              <div className="relative w-full sm:w-64">
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white text-slate-800"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.enrollment_no} - {s.house} #{s.room_no})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
              <span>🔒 Authorized Student Session</span>
            </div>
          )}
        </div>

        {/* Detailed Room & House Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 uppercase block">Hostel House</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${houseInfo?.color || 'bg-slate-100'}`}>
                {activeStudent.house}
              </span>
              <span className="text-xs font-bold text-slate-800 truncate" title={houseInfo?.name}>
                {houseInfo?.name}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 uppercase block">Allotted Room</span>
            <span className="text-sm font-extrabold text-slate-900 mt-1 block">
              Room #{activeStudent.room_no}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 uppercase block">Previous Room</span>
            <span className="text-sm font-semibold text-slate-700 mt-1 block">
              {activeStudent.previous_room || 'New Allotment'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-medium text-slate-400 uppercase block">Session Enrolled</span>
            <span className="text-sm font-bold text-emerald-800 mt-1 block">
              {activeStudent.session}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MONTHLY DEFICIT WIDGETS: LIGHT THEME (TOTAL DEFICIT & SCROLLABLE MONTH SELECTOR)
         ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        
        {/* Top Row: Total Deficit & Exact Month Selector Pill from Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0 ${
              outstandingBalance > 0 
                ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Deficit Due (End of Month)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  outstandingBalance > 0 
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {outstandingBalance > 0 ? 'Deficit Due' : 'All Cleared'}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ₹{outstandingBalance.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {outstandingBalance > 0 
                    ? 'Amount to be paid by student at end of billing cycle' 
                    : 'No pending deficit'}
                </span>
              </div>
            </div>
          </div>

          {/* Screenshot-Style Light Year/Session & Month Dropdown Pills */}
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {/* Year / Session Selector Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Session/Year:</span>
              <div className="relative inline-block">
                <select
                  value={selectedSession}
                  onChange={(e) => {
                    setSelectedSession(e.target.value);
                  }}
                  className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs pl-4 pr-8 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer"
                >
                  <option value="2026-2027">Session 2026-2027 (Current)</option>
                  <option value="2025-2026">Session 2025-2026 (Previous)</option>
                  <option value="2024-2025">Session 2024-2025 (Past)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Month Dropdown Pill (Dynamically populated from the selected year's months) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Month:</span>
              <div className="relative inline-block">
                <select
                  value={selectedMonthKey}
                  onChange={(e) => {
                    setSelectedMonthKey(e.target.value);
                    setViewTab('month');
                  }}
                  className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs pl-4 pr-8 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer"
                >
                  {studentBills.map(b => (
                    <option key={b.id} value={b.month_key}>
                      {b.month_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Scrollable Month-by-Month Deficit Strip (Light Theme) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                Scrollable Monthly Deficit Tracker (Click Month to View Bill)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Year: {selectedSession} (Other Years Hidden)
              </span>
            </div>

            {/* Card Filter Toggle: Show All Months of Selected Year vs Show Only Selected Month */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMonthCardFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                  monthCardFilterMode === 'all'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Months ({selectedSession})
              </button>
              <button
                type="button"
                onClick={() => setMonthCardFilterMode('selected-only')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                  monthCardFilterMode === 'selected-only'
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Only Selected Month
              </button>
            </div>
          </div>

          {/* Scrollable Container with Light Monthly Cards */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {(monthCardFilterMode === 'selected-only'
              ? studentBills.filter(b => b.month_key === selectedMonthKey)
              : studentBills
            ).map((bill) => {
              const isSelected = bill.month_key === selectedMonthKey;
              const hasDeficit = bill.status !== 'paid';

              return (
                <button
                  key={bill.id}
                  onClick={() => {
                    setSelectedMonthKey(bill.month_key);
                    setViewTab('month');
                  }}
                  className={`shrink-0 min-w-[160px] p-3 rounded-xl border text-left transition relative ${
                    isSelected 
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600 shadow-sm' 
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{bill.month_name}</span>
                    <span className={`w-2 h-2 rounded-full ${hasDeficit ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium">
                    Deficit to Pay:
                  </div>
                  <div className={`text-sm font-extrabold mt-0.5 ${hasDeficit ? 'text-rose-700' : 'text-emerald-700'}`}>
                    ₹{hasDeficit ? bill.total_amount.toLocaleString() : '0.00'}
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">{bill.total_diets} diets</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                      hasDeficit ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {hasDeficit ? 'Deficit' : 'Cleared'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Navigation Tabs (Per-Year Session, Per-Month, Per-Day) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab('day')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              viewTab === 'day'
                ? 'border-emerald-800 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Per-Day Panel (Day-wise Register)
          </button>

          <button
            onClick={() => setViewTab('month')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              viewTab === 'month'
                ? 'border-emerald-800 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Per-Month Statement
          </button>

          <button
            onClick={() => setViewTab('session')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
              viewTab === 'session'
                ? 'border-emerald-800 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            Per-Year Session ({selectedSession})
          </button>
        </div>

        {/* Action Button: Apply for Rebate */}
        <div className="pb-2 sm:pb-0">
          <button
            onClick={() => setIsRebateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Apply for Mess Off / Rebate
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: PER-DAY PANEL (DAY-WISE MEAL REGISTER FOR RESIDENT)
         ========================================================================= */}
      {viewTab === 'day' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Day-Wise Dining Log for {activeStudent.name}
              </h3>
              <p className="text-xs text-slate-500">
                Daily record of dining attendance (Eaten / Not Eaten) marked by the Munshi
              </p>
            </div>

            {/* Session/Year & Month Filter Pills - Screenshot pill style */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Session/Year:</span>
                <div className="relative inline-block">
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs pl-4 pr-8 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer"
                  >
                    <option value="2026-2027">Session 2026-2027 (Current)</option>
                    <option value="2025-2026">Session 2025-2026 (Previous)</option>
                    <option value="2024-2025">Session 2024-2025 (Past)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Month:</span>
                <div className="relative inline-block">
                  <select
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs pl-4 pr-8 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer"
                  >
                    {studentBills.map(b => (
                      <option key={b.id} value={b.month_key}>
                        {b.month_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Month Metrics - Styled exactly after the reference screenshot theme */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-[#ecfdf5] rounded-2xl border border-[#a7f3d0] transition hover:shadow-sm">
              <span className="text-[11px] font-extrabold text-[#047857] tracking-wider uppercase">
                DIETS LOGGED
              </span>
              <div className="text-2xl font-black text-[#064e3b] mt-1.5">
                {monthDailyRecords.reduce((acc, r) => {
                  const isEaten = !r.is_rebate && Boolean(r.eaten ?? (r.lunch || r.dinner));
                  return acc + (isEaten ? 1 : 0) + (r.guest_diets || 0);
                }, 0)}
              </div>
            </div>

            <div className="p-4 bg-[#eff6ff] rounded-2xl border border-[#bfdbfe] transition hover:shadow-sm">
              <span className="text-[11px] font-extrabold text-[#1d4ed8] tracking-wider uppercase">
                DAYS EATEN
              </span>
              <div className="text-2xl font-black text-[#1e3a8a] mt-1.5">
                {monthDailyRecords.filter(r => !r.is_rebate && (r.eaten ?? (r.lunch || r.dinner))).length} Days
              </div>
            </div>

            <div className="p-4 bg-[#faf5ff] rounded-2xl border border-[#e9d5ff] transition hover:shadow-sm">
              <span className="text-[11px] font-extrabold text-[#6b21a8] tracking-wider uppercase">
                DAYS NOT EATEN
              </span>
              <div className="text-2xl font-black text-[#3b0764] mt-1.5">
                {monthDailyRecords.filter(r => !r.is_rebate && !(r.eaten ?? (r.lunch || r.dinner))).length} Days
              </div>
            </div>

            <div className="p-4 bg-[#fefce8] rounded-2xl border border-[#fef08a] transition hover:shadow-sm">
              <span className="text-[11px] font-extrabold text-[#a16207] tracking-wider uppercase">
                REBATE (MESS OFF)
              </span>
              <div className="text-2xl font-black text-[#713f12] mt-1.5">
                {monthDailyRecords.filter(r => r.is_rebate).length} Days
              </div>
            </div>
          </div>

          {/* Daily Panel Grid / Card List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {monthDailyRecords.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No daily records logged for this month yet.
              </div>
            ) : (
              monthDailyRecords.map((record) => {
                const dayNum = parseInt(record.date.split('-')[2], 10);
                const dayDate = new Date(record.date);
                const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                const isEaten = !record.is_rebate && Boolean(record.eaten ?? (record.lunch || record.dinner));

                return (
                  <div 
                    key={record.id}
                    className={`p-4 rounded-2xl border transition ${
                      record.is_rebate
                        ? 'bg-amber-50/50 border-amber-200'
                        : isEaten
                        ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
                        : 'bg-rose-50/30 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">Day {dayNum}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5 font-medium">{dayOfWeek}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        record.is_rebate
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isEaten
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {record.is_rebate ? '🏖️ Mess Off' : isEaten ? '1 Diet' : '0 Diets'}
                      </span>
                    </div>

                    <div className="pt-3 space-y-2 text-xs">
                      {record.is_rebate ? (
                        <div className="text-amber-800 font-medium text-xs py-1">
                          🏖️ Official Rebate (Mess Off)
                          {record.rebate_reason && (
                            <div className="text-[11px] text-amber-600 mt-1 truncate">{record.rebate_reason}</div>
                          )}
                        </div>
                      ) : isEaten ? (
                        <div className="flex items-center justify-between py-1">
                          <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                            Dining Status:
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Eaten
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <span className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                            <Utensils className="w-3.5 h-3.5 text-rose-500" />
                            Dining Status:
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 text-xs bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Not Eaten
                          </span>
                        </div>
                      )}

                      {record.guest_diets > 0 && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-amber-800 text-[11px] font-semibold">
                          <span>Guest Diets:</span>
                          <span>+{record.guest_diets}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: PER-MONTH STATEMENT & MESS BILL VOUCHER
         ========================================================================= */}
      {viewTab === 'month' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Monthly Dining Invoice & Account Statement
              </h3>
              <p className="text-xs text-slate-500">
                Official billing statement generated by the Dining Hall Administration
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Session/Year:</span>
                <div className="relative inline-block">
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs pl-4 pr-8 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer"
                  >
                    <option value="2026-2027">Session 2026-2027 (Current)</option>
                    <option value="2025-2026">Session 2025-2026 (Previous)</option>
                    <option value="2024-2025">Session 2024-2025 (Past)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Month:</span>
                <div className="relative inline-block">
                  <select
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs pl-4 pr-8 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition cursor-pointer"
                  >
                    {studentBills.map(b => (
                      <option key={b.id} value={b.month_key}>
                        {b.month_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition ml-1"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Voucher
              </button>
            </div>
          </div>

          {currentMonthBill ? (
            <div className="max-w-2xl mx-auto border border-slate-300 rounded-2xl p-6 bg-slate-50/50 shadow-inner space-y-6">
              {/* Voucher Header */}
              <div className="text-center border-b border-slate-200 pb-4">
                <div className="text-sm font-bold tracking-wider text-emerald-900 uppercase">
                  Sir Syed Hall Dining Management
                </div>
                <div className="text-xs text-slate-500 font-medium">Aligarh Muslim University, Aligarh</div>
                <div className="mt-2 text-base font-extrabold text-slate-900">
                  DINING BILL — {currentMonthBill.month_name.toUpperCase()}
                </div>
              </div>

              {/* Student Metadata Box */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Name of Resident:</span>
                  <span className="font-bold text-slate-900">{activeStudent.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Enrollment Number:</span>
                  <span className="font-mono font-bold text-slate-900">{activeStudent.enrollment_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hostel House & Room:</span>
                  <span className="font-semibold text-slate-800">{activeStudent.house} — Room #{activeStudent.room_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Academic Session:</span>
                  <span className="font-semibold text-slate-800">{currentMonthBill.session}</span>
                </div>
              </div>

              {/* Charges Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Particulars / Description</th>
                      <th className="p-3 text-right">Calculation</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">Diet Consumption Charges</div>
                        <div className="text-[10px] text-slate-400">Total counted diets during the month</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {currentMonthBill.total_diets} diets × ₹{currentMonthBill.diet_rate}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        ₹{currentMonthBill.diet_amount.toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">Fixed Monthly Dining Charges</div>
                        <div className="text-[10px] text-slate-400">Kitchen fuels, cook wages, maintenance</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">Standard rate</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        ₹{currentMonthBill.fixed_charges.toFixed(2)}
                      </td>
                    </tr>

                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">Establishment Charges</div>
                        <div className="text-[10px] text-slate-400">Hall administration & cleaning charges</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">Monthly levy</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        ₹{currentMonthBill.establishment_charges.toFixed(2)}
                      </td>
                    </tr>

                    {currentMonthBill.rebate_days > 0 && (
                      <tr className="bg-amber-50/50">
                        <td className="p-3 text-amber-900">
                          <div className="font-semibold">Rebate (Diet Cut) Exemption</div>
                          <div className="text-[10px] text-amber-700">Official leave rebate deduction</div>
                        </td>
                        <td className="p-3 text-right font-mono text-amber-900">
                          {currentMonthBill.rebate_days} days exemption
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          Included
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-emerald-50 text-emerald-950 font-bold border-t-2 border-emerald-300">
                    <tr>
                      <td colSpan={2} className="p-3 text-sm">TOTAL AMOUNT PAYABLE</td>
                      <td className="p-3 text-right text-base text-emerald-900 font-extrabold">
                        ₹{currentMonthBill.total_amount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status and Signature Footer */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Payment Status:</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    currentMonthBill.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentMonthBill.status === 'paid' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {currentMonthBill.status.toUpperCase()}
                  </span>
                  {currentMonthBill.receipt_no && (
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      Ref: {currentMonthBill.receipt_no}
                    </div>
                  )}
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  <div className="font-serif italic">Verified by Senior Munshi</div>
                  <div className="font-bold text-slate-800 mt-0.5">Dining Hall Management</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No invoice found for {selectedMonthKey}.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: PER-YEAR SESSION VIEW (e.g. 2026-2027)
         ========================================================================= */}
      {viewTab === 'session' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Annual Session Breakdown — {selectedSession}
              </h3>
              <p className="text-xs text-slate-500">
                Full academic year summary of dining diets, billed amounts, and payment history
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Session:</span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white text-slate-800"
              >
                <option value="2026-2027">Session 2026-2027 (Current)</option>
                <option value="2025-2026">Session 2025-2026 (Previous)</option>
              </select>
            </div>
          </div>

          {/* 4 Annual Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-medium text-slate-500">Total Diets Consumed</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalSessionDiets}</div>
              <div className="text-[11px] text-slate-500 mt-1">Across active months</div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs font-medium text-emerald-800">Total Billed</span>
              <div className="text-2xl font-extrabold text-emerald-950 mt-2">₹{totalSessionBilled.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-700 mt-1">Diets + Fixed fees</div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <span className="text-xs font-medium text-green-800">Total Paid</span>
              <div className="text-2xl font-extrabold text-green-950 mt-2">₹{totalSessionPaid.toLocaleString()}</div>
              <div className="text-[11px] text-green-700 mt-1 font-semibold">Cleared payments</div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs font-medium text-amber-800">Outstanding Due</span>
              <div className="text-2xl font-extrabold text-amber-900 mt-2">₹{outstandingBalance.toLocaleString()}</div>
              <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                {outstandingBalance === 0 ? 'All Clear!' : 'Pending Clearance'}
              </div>
            </div>
          </div>

          {/* Month-by-Month Session Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3">Diets Consumed</th>
                  <th className="p-3">Rebate Days</th>
                  <th className="p-3">Diet Charges</th>
                  <th className="p-3">Fixed + Estb.</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Receipt Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {studentBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{bill.month_name}</td>
                    <td className="p-3">{bill.total_diets}</td>
                    <td className="p-3">{bill.rebate_days} days</td>
                    <td className="p-3">₹{bill.diet_amount}</td>
                    <td className="p-3">₹{bill.fixed_charges + bill.establishment_charges}</td>
                    <td className="p-3 font-bold text-slate-900">₹{bill.total_amount}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        bill.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {bill.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{bill.receipt_no || 'Pending Payment'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rebate Application Modal */}
      {isRebateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Apply for Mess Off / Rebate</h3>
                <p className="text-xs text-emerald-200">Submit leave deduction notice to Provost & Munshi</p>
              </div>
              <button 
                onClick={() => setIsRebateModalOpen(false)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyRebate} className="p-6 space-y-4 text-xs">
              {rebateMsg && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-900 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {rebateMsg}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
                <span className="font-bold block">Important Rule:</span>
                As per dining rules, minimum 3 consecutive days notice is required for rebate exemption.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rebateStart}
                    onChange={(e) => setRebateStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rebateEnd}
                    onChange={(e) => setRebateEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Mess Off <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Attending family function, Medical leave, Home visit..."
                  value={rebateReason}
                  onChange={(e) => setRebateReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRebateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
