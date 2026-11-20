'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Users, 
  Utensils, 
  Coffee, 
  Moon, 
  Search, 
  Filter, 
  Grid, 
  List,
  Download,
  AlertCircle,
  Star
} from 'lucide-react';
import { Student, DiningDailyRecord, HOSTEL_HOUSES, HostelHouseCode } from '@/types';
import { DataService } from '@/lib/dataService';
import { DailyReviewReport } from '../reviews/DailyReviewReport';

export const MunshiDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [allRecords, setAllRecords] = useState<DiningDailyRecord[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('2026-11-20');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [viewMode, setViewMode] = useState<'daily' | 'matrix' | 'reviews'>('daily');

  const [houseFilter, setHouseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Day records map: student_id -> record
  const [dailyRecordsMap, setDailyRecordsMap] = useState<Record<string, DiningDailyRecord>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDayRecords(currentDate);
  }, [currentDate, students]);

  const loadData = async () => {
    const [st, allR] = await Promise.all([
      DataService.getStudents(),
      DataService.getAllDailyRecords()
    ]);
    setStudents(st);
    setAllRecords(allR);
  };

  const loadDayRecords = async (dateStr: string) => {
    const dayRecords = await DataService.getDailyRecordsForDate(dateStr);
    const map: Record<string, DiningDailyRecord> = {};

    students.forEach(s => {
      const found = dayRecords.find(r => r.student_id === s.id);
      if (found) {
        map[s.id] = { ...found };
      } else {
        map[s.id] = {
          id: `rec-${s.id}-${dateStr}`,
          student_id: s.id,
          enrollment_no: s.enrollment_no,
          date: dateStr,
          eaten: true,
          lunch: true,
          dinner: true,
          is_rebate: false,
          guest_diets: 0,
          marked_by: 'Munshi'
        };
      }
    });

    setDailyRecordsMap(map);
  };

  // Toggle whole day eaten status
  const toggleEaten = (studentId: string) => {
    setDailyRecordsMap(prev => {
      const cur = prev[studentId];
      if (!cur) return prev;
      const curEaten = cur.eaten ?? (cur.lunch || cur.dinner);
      const nextEaten = !curEaten;
      return {
        ...prev,
        [studentId]: {
          ...cur,
          eaten: nextEaten,
          lunch: nextEaten,
          dinner: nextEaten,
          is_rebate: false // unmark rebate if manually toggling
        }
      };
    });
  };

  const toggleRebate = (studentId: string) => {
    setDailyRecordsMap(prev => {
      const cur = prev[studentId];
      if (!cur) return prev;
      const willBeRebate = !cur.is_rebate;
      return {
        ...prev,
        [studentId]: {
          ...cur,
          is_rebate: willBeRebate,
          eaten: willBeRebate ? false : true,
          lunch: willBeRebate ? false : true,
          dinner: willBeRebate ? false : true,
          rebate_reason: willBeRebate ? 'Official Mess Off / Rebate' : undefined
        }
      };
    });
  };

  const changeGuestDiets = (studentId: string, delta: number) => {
    setDailyRecordsMap(prev => {
      const cur = prev[studentId];
      if (!cur) return prev;
      const count = Math.max(0, (cur.guest_diets || 0) + delta);
      return {
        ...prev,
        [studentId]: {
          ...cur,
          guest_diets: count
        }
      };
    });
  };

  // Bulk actions for today
  const markAllEatenStatus = (status: boolean) => {
    setDailyRecordsMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(sid => {
        if (!next[sid].is_rebate) {
          next[sid] = { 
            ...next[sid], 
            eaten: status,
            lunch: status, 
            dinner: status 
          };
        }
      });
      return next;
    });
  };

  const markAllPresent = () => {
    setDailyRecordsMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(sid => {
        next[sid] = {
          ...next[sid],
          eaten: true,
          lunch: true,
          dinner: true,
          is_rebate: false
        };
      });
      return next;
    });
  };

  const handleSaveRegister = async () => {
    setIsSaving(true);
    const recordsToSave = Object.values(dailyRecordsMap);
    await DataService.updateDailyRecords(recordsToSave);
    await loadData();
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Day navigation
  const navigateDay = (offset: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    const iso = d.toISOString().split('T')[0];
    setCurrentDate(iso);
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHouse = houseFilter === 'ALL' || s.house === houseFilter;
    return matchesSearch && matchesHouse;
  });

  // Calculate day stats
  const activeRecords = Object.values(dailyRecordsMap);
  const eatenCount = activeRecords.filter(r => !r.is_rebate && (r.eaten ?? (r.lunch || r.dinner))).length;
  const notEatenCount = activeRecords.filter(r => !r.is_rebate && !(r.eaten ?? (r.lunch || r.dinner))).length;
  const rebateCount = activeRecords.filter(r => r.is_rebate).length;
  const totalGuestDiets = activeRecords.reduce((acc, r) => acc + (r.guest_diets || 0), 0);

  // For Month Matrix
  const daysInMonth = 30; // November
  const monthDayIndices = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                <ClipboardList className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Munshi Day-Wise Dining Register</h2>
                <p className="text-xs text-slate-500">
                  Daily Attendance Log • Eaten / Not Eaten • Guest Diets • Rebate Verification
                </p>
              </div>
            </div>
          </div>

          {/* View Mode Switcher: Daily Register vs Full Month Matrix vs Food Reviews */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'daily'
                    ? 'bg-white text-emerald-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
                Daily Register
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'matrix'
                    ? 'bg-white text-emerald-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                30-Day Matrix
              </button>
              <button
                onClick={() => setViewMode('reviews')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'reviews'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-4 h-4" />
                Food & Cleanliness
              </button>
            </div>

            {viewMode !== 'reviews' && (
              <button
                onClick={handleSaveRegister}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Register'}
              </button>
            )}
          </div>
        </div>

        {/* Date Selector & Day Navigation */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition text-slate-700"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-xl bg-slate-50">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <button
              onClick={() => navigateDay(1)}
              className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition text-slate-700"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentDate('2026-11-20')}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
            >
              Jump to Today
            </button>
          </div>

          {/* Quick Bulk Marking Toolbar */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-semibold mr-1">Quick Mark:</span>
            <button
              onClick={() => markAllEatenStatus(true)}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg font-bold transition flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Eaten
            </button>
            <button
              onClick={() => markAllEatenStatus(false)}
              className="px-3 py-1.5 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-lg font-bold transition flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Mark All Not Eaten
            </button>
          </div>
        </div>

        {/* Day Summary Cards without daily cost */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center justify-between">
              <span>Eaten Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-950 mt-1">{eatenCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">{Math.round((eatenCount / students.length) * 100 || 0)}% of residents</div>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-rose-800 uppercase flex items-center justify-between">
              <span>Not Eaten Today</span>
              <X className="w-4 h-4 text-rose-700" />
            </div>
            <div className="text-2xl font-extrabold text-rose-950 mt-1">{notEatenCount}</div>
            <div className="text-[10px] text-rose-700 mt-0.5">Absent from dining hall</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-amber-800 uppercase flex items-center justify-between">
              <span>On Rebate / Off</span>
              <AlertCircle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-extrabold text-amber-950 mt-1">{rebateCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Official approved leave</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-[11px] font-bold text-slate-700 uppercase flex items-center justify-between">
              <span>Guest Diets</span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalGuestDiets}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Extra guest meals booked</div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-green-100 border border-green-300 text-green-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-700" />
          Daily Register for {currentDate} successfully recorded into database!
        </div>
      )}

      {/* VIEW 1: DAILY INTERACTIVE REGISTER */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          {/* Filter Bar with Dedicated Enrollment Number Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search Enrollment Number (e.g. GJ1021) or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
                >
                  <option value="ALL">All Houses (HM, BH, QH, KH, AK, MB)</option>
                  {Object.values(HOSTEL_HOUSES).map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} – {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Enrollment Chips for Munshi */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-slate-400 font-semibold">Quick Enrollment Lookup:</span>
              {students.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSearchQuery(s.enrollment_no)}
                  className={`px-2 py-0.5 rounded-lg border font-mono font-bold transition ${
                    searchQuery.toUpperCase() === s.enrollment_no.toUpperCase()
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.enrollment_no}
                </button>
              ))}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-emerald-700 hover:underline font-semibold ml-1"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Daily Roster Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Room</th>
                    <th className="p-3">House</th>
                    <th className="p-3">Enrollment No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3 text-center">Dining Status (Whole Day)</th>
                    <th className="p-3 text-center">Rebate / Off</th>
                    <th className="p-3 text-center">Guest Diets</th>
                    <th className="p-3 text-center">Day Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((student) => {
                    const record = dailyRecordsMap[student.id] || {
                      eaten: true,
                      lunch: true,
                      dinner: true,
                      is_rebate: false,
                      guest_diets: 0
                    };
                    const houseInfo = HOSTEL_HOUSES[student.house];
                    const isEaten = !record.is_rebate && Boolean(record.eaten ?? (record.lunch || record.dinner));

                    return (
                      <tr key={student.id} className={record.is_rebate ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                        {/* Room */}
                        <td className="p-3 font-bold text-slate-900 text-sm">
                          {student.room_no}
                          {student.previous_room && student.previous_room !== 'N/A' && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Prev: {student.previous_room}
                            </span>
                          )}
                        </td>

                        {/* House */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${houseInfo?.color || 'bg-slate-100'}`}>
                            {student.house}
                          </span>
                        </td>

                        {/* Enrollment */}
                        <td className="p-3 font-mono font-bold text-slate-900">{student.enrollment_no}</td>

                        {/* Student Name */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{student.name}</div>
                          <div className="text-[10px] text-slate-400">{student.course}</div>
                        </td>

                        {/* Whole Day Eaten Toggle */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            disabled={record.is_rebate}
                            onClick={() => toggleEaten(student.id)}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 shadow-sm ${
                              record.is_rebate
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : isEaten
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                            }`}
                          >
                            {isEaten ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {isEaten ? 'Eaten' : 'Not Eaten'}
                          </button>
                        </td>

                        {/* Rebate Toggle */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRebate(student.id)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition inline-flex items-center gap-1 ${
                              record.is_rebate
                                ? 'bg-amber-500 text-emerald-950 font-extrabold shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-900'
                            }`}
                          >
                            {record.is_rebate ? 'Mess Off' : 'No Rebate'}
                          </button>
                        </td>

                        {/* Guest Diets */}
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => changeGuestDiets(student.id, -1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold text-slate-900 min-w-6 text-center">
                              {record.guest_diets || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeGuestDiets(student.id, 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Day Status */}
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-extrabold text-xs ${
                            record.is_rebate
                              ? 'bg-amber-100 text-amber-900'
                              : isEaten
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}>
                            {record.is_rebate ? 'Off' : isEaten ? 'Eaten' : 'Not Eaten'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 30-DAY ATTENDANCE MATRIX REGISTER */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                November 2026 Dining Attendance Register (Matrix Grid)
              </h3>
              <p className="text-xs text-slate-500">
                Full month overview showing daily meal marks per student (E: Eaten, NE: Not Eaten, R: Rebate)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                Print / Export
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700">Legend:</span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <span className="w-5 h-5 bg-emerald-600 text-white rounded flex items-center justify-center font-mono text-[10px] font-bold">E</span>
              Eaten
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-800">
              <span className="w-5 h-5 bg-rose-200 text-rose-900 rounded flex items-center justify-center font-mono text-[10px] font-bold">NE</span>
              Not Eaten
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-800">
              <span className="w-5 h-5 bg-amber-500 text-emerald-950 rounded flex items-center justify-center font-mono text-[10px] font-bold">R</span>
              Rebate (Mess Off)
            </span>
          </div>

          {/* Grid Container */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0">
                <tr>
                  <th className="p-2 text-left border-r border-slate-200 min-w-36">Student</th>
                  <th className="p-2 border-r border-slate-200 min-w-16">House/Rm</th>
                  {monthDayIndices.map(d => (
                    <th key={d} className="p-1 border-r border-slate-200 min-w-8 text-[11px]">
                      {d}
                    </th>
                  ))}
                  <th className="p-2 border-l border-slate-300 min-w-24 bg-emerald-50 text-emerald-950">
                    Days Eaten
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredStudents.map(student => {
                  let studentMonthTotal = 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80">
                      {/* Name & Enrollment */}
                      <td className="p-2 text-left border-r border-slate-200">
                        <div className="font-bold text-slate-900 truncate max-w-32">{student.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{student.enrollment_no}</div>
                      </td>

                      {/* House & Room */}
                      <td className="p-2 border-r border-slate-200 font-semibold">
                        <span className="text-emerald-800 font-bold">{student.house}</span>-{student.room_no}
                      </td>

                      {/* 30 Days */}
                      {monthDayIndices.map(d => {
                        const dayStr = d < 10 ? `0${d}` : `${d}`;
                        const dateStr = `2026-11-${dayStr}`;
                        const rec = allRecords.find(r => r.student_id === student.id && r.date === dateStr);

                        let code = 'E';
                        let bg = 'bg-emerald-600 text-white';

                        if (rec) {
                          if (rec.is_rebate) {
                            code = 'R';
                            bg = 'bg-amber-500 text-emerald-950 font-bold';
                          } else if (rec.eaten ?? (rec.lunch || rec.dinner)) {
                            code = 'E';
                            bg = 'bg-emerald-600 text-white';
                            studentMonthTotal += 1;
                          } else {
                            code = 'NE';
                            bg = 'bg-rose-100 text-rose-800';
                          }
                        } else if (d > 20) {
                          // Days after 20th are projected / upcoming
                          code = '·';
                          bg = 'bg-slate-100 text-slate-400';
                        } else {
                          code = 'E';
                          bg = 'bg-emerald-600 text-white';
                          studentMonthTotal += 1;
                        }

                        return (
                          <td key={d} className="p-1 border-r border-slate-200">
                            <span className={`inline-block w-6 h-6 leading-6 rounded font-mono text-[10px] font-bold ${bg}`}>
                              {code}
                            </span>
                          </td>
                        );
                      })}

                      {/* Month Total Days Eaten */}
                      <td className="p-2 font-mono font-extrabold text-sm border-l border-slate-300 bg-emerald-50 text-emerald-950">
                        {studentMonthTotal} Days
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: FOOD REVIEWS & HOUSE CLEANLINESS REPORT */}
      {viewMode === 'reviews' && (
        <DailyReviewReport userRole="munshi" />
      )}
    </div>
  );
};
