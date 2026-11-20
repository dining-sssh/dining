'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Upload, 
  UserPlus, 
  Search, 
  Filter, 
  Trash2, 
  CreditCard, 
  Settings, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet,
  Building,
  TrendingUp,
  DollarSign,
  Utensils,
  Star
} from 'lucide-react';
import { Student, HostelHouseCode, HOSTEL_HOUSES, MonthlyBill, RebateRequest, MessSettings, DailyReviewSummary } from '@/types';
import { DataService } from '@/lib/dataService';
import { CsvUploadModal } from '../csv/CsvUploadModal';
import { AddStudentModal } from './AddStudentModal';
import { DailyReviewReport } from '../reviews/DailyReviewReport';

export const ProvostDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [rebates, setRebates] = useState<RebateRequest[]>([]);
  const [settings, setSettings] = useState<MessSettings | null>(null);
  const [todayReviewSummary, setTodayReviewSummary] = useState<DailyReviewSummary | null>(null);

  const [activeTab, setActiveTab] = useState<'students' | 'rates' | 'billing' | 'rebates' | 'reviews'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('ALL');

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState<MessSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [st, bl, rb, stg, revSummary] = await Promise.all([
      DataService.getStudents(),
      DataService.getMonthlyBills(),
      DataService.getRebateRequests(),
      DataService.getSettings(),
      DataService.getDailyReviewSummary(todayStr)
    ]);
    setStudents(st);
    setBills(bl);
    setRebates(rb);
    setSettings(stg);
    setRateForm(stg);
    setTodayReviewSummary(revSummary);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the dining roster?`)) {
      await DataService.deleteStudent(id);
      loadAllData();
    }
  };

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateForm) return;
    await DataService.updateSettings(rateForm);
    setSettings(rateForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRebateAction = async (id: string, action: 'approved' | 'rejected') => {
    await DataService.updateRebateStatus(id, action);
    loadAllData();
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollment_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.previous_room && s.previous_room.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.course.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHouse = selectedHouseFilter === 'ALL' || s.house === selectedHouseFilter;
    return matchesSearch && matchesHouse;
  });

  // Calculate high-level stats
  const totalStudents = students.length;
  const totalDietsServed = bills.reduce((acc, b) => acc + (b.total_diets || 0), 0);
  const totalRevenue = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const totalPendingDues = bills.filter(b => b.status !== 'paid').reduce((acc, b) => acc + (b.total_amount || 0), 0);

  // House-wise stats
  const houseCounts: Record<HostelHouseCode, number> = {
    HM: 0, BH: 0, QH: 0, KH: 0, AK: 0, MB: 0
  };
  students.forEach(s => {
    if (houseCounts[s.house] !== undefined) {
      houseCounts[s.house]++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Provost Administrative Control</h2>
                <p className="text-xs text-slate-500">
                  Hall Oversight • Student Allotments • Diet Rates • Financial Auditing
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Registered Diners</span>
              <Users className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalStudents}</div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium">Across all 6 Hostel Houses</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Diets Logged (Session)</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalDietsServed.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">Lunch & Dinner Meals</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Billed Amount</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-800 mt-2">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 mt-1 font-medium">Diets + Fixed + Estb.</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pending Dues</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-2">₹{totalPendingDues.toLocaleString()}</div>
            <div className="text-[11px] text-amber-600 mt-1 font-medium">To be collected by Munshi</div>
          </div>
        </div>

        {/* Hostel Houses Quick Cards */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-800" />
            Hostel House Allotment Distribution
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((code) => {
              const h = HOSTEL_HOUSES[code];
              const count = houseCounts[code] || 0;
              const isSelected = selectedHouseFilter === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedHouseFilter(isSelected ? 'ALL' : code)}
                  className={`text-left p-3 rounded-xl border transition ${
                    isSelected 
                      ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-600' 
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${h.color}`}>
                      {code}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{count}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate" title={h.name}>
                    {h.name}
                  </div>
                  <div className="text-[10px] text-slate-500">Residents</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'students'
              ? 'border-emerald-800 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Student Directory ({students.length})
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'rates'
              ? 'border-emerald-800 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Mess Rates & Policies
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'billing'
              ? 'border-emerald-800 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Billing Oversight
        </button>

        <button
          onClick={() => setActiveTab('rebates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'rebates'
              ? 'border-emerald-800 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Rebate Approvals ({rebates.filter(r => r.status === 'pending').length} Pending)
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'reviews'
              ? 'border-emerald-800 text-emerald-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Utensils className="w-4 h-4 text-amber-600" />
          Food & Cleanliness Audit {todayReviewSummary && todayReviewSummary.total_reviews > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-amber-300">
              ★ {todayReviewSummary.overall_score}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Student Directory */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          {/* Search by Enrollment Number & House Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Enrollment Number Search */}
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by Enrollment Number (e.g. GJ1021) or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm"
                />
              </div>

              {/* Filter by House & Export */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedHouseFilter}
                  onChange={(e) => setSelectedHouseFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
                >
                  <option value="ALL">All Hostel Houses</option>
                  {Object.values(HOSTEL_HOUSES).map((h) => (
                    <option key={h.code} value={h.code}>
                      {h.code} – {h.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const csvData = students.map(s => `${s.enrollment_no},${s.name},${s.house},${s.room_no},${s.course},${s.email},${s.previous_room || 'New Allotment'}`).join('\n');
                    const blob = new Blob(['Enrollment Number,Name,House,Room Number,Course,Email,Previous room\n' + csvData], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `amu_dining_students_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Quick Enrollment Number Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-slate-400 font-semibold">Quick Enrollment Search:</span>
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

          {/* Student Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Enrollment No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Hostel House</th>
                    <th className="p-3">Room No</th>
                    <th className="p-3">Deficit Due</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Previous Room</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        No students match the enrollment number or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const houseInfo = HOSTEL_HOUSES[student.house];
                      const studentDeficit = bills
                        .filter(b => b.student_id === student.id && b.status !== 'paid')
                        .reduce((acc, b) => acc + (b.total_amount || 0), 0);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono font-bold text-emerald-900 bg-emerald-50/40">
                            {student.enrollment_no}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{student.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${houseInfo?.color || 'bg-slate-100'}`}>
                              {student.house} – {houseInfo?.name}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{student.room_no}</td>
                          
                          {/* Deficit Due */}
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                              studentDeficit > 0 
                                ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              ₹{studentDeficit.toLocaleString()} {studentDeficit > 0 ? 'Deficit' : 'Cleared'}
                            </span>
                          </td>

                          <td className="p-3 text-slate-600">{student.course}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{student.email}</td>
                          <td className="p-3 text-slate-500">{student.previous_room || 'New Allotment'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Remove Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rates & Policies */}
      {activeTab === 'rates' && rateForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h3 className="text-base font-bold text-slate-900">Dining Rates & Hall Governance</h3>
            <p className="text-xs text-slate-500">
              Approved rates apply to daily diet billing and monthly establishment fee generation
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Dining rates and governance settings successfully updated!
            </div>
          )}

          <form onSubmit={handleUpdateRates} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Daily Diet Rate (₹ per diet)
                </label>
                <input
                  type="number"
                  min="10"
                  step="0.5"
                  value={rateForm.diet_rate}
                  onChange={(e) => setRateForm({ ...rateForm, diet_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Active Session
                </label>
                <input
                  type="text"
                  value={rateForm.session}
                  onChange={(e) => setRateForm({ ...rateForm, session: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Fixed Charges (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rateForm.fixed_charges}
                  onChange={(e) => setRateForm({ ...rateForm, fixed_charges: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Establishment Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={rateForm.establishment_charges}
                  onChange={(e) => setRateForm({ ...rateForm, establishment_charges: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Provost Name & Title
                </label>
                <input
                  type="text"
                  value={rateForm.provost_name}
                  onChange={(e) => setRateForm({ ...rateForm, provost_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Senior Munshi In-Charge
                </label>
                <input
                  type="text"
                  value={rateForm.munshi_name}
                  onChange={(e) => setRateForm({ ...rateForm, munshi_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl transition shadow"
              >
                Save Rate Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Billing Oversight */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Hall Dining Accounts & Billing Ledger</h3>
              <p className="text-xs text-slate-500">Per-month bills generated for residents in Session 2026-2027</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3">Enrollment</th>
                  <th className="p-3">Diets Consumed</th>
                  <th className="p-3">Rebate Days</th>
                  <th className="p-3">Diet Amount</th>
                  <th className="p-3">Fixed + Estb.</th>
                  <th className="p-3">Net Bill</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Receipt Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bills.slice(0, 20).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{bill.month_name}</td>
                    <td className="p-3 font-mono font-bold">{bill.enrollment_no}</td>
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

      {/* Tab 4: Rebates */}
      {activeTab === 'rebates' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Rebate (Mess Off) Applications</h3>
              <p className="text-xs text-slate-500">Provost approval for official diet cut and leave deductions</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">Applicant</th>
                  <th className="p-3">Enrollment</th>
                  <th className="p-3">Leave Duration</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Provost Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rebates.map((reb) => (
                  <tr key={reb.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{reb.student_name}</td>
                    <td className="p-3 font-mono">{reb.enrollment_no}</td>
                    <td className="p-3 font-medium text-slate-700">
                      {reb.start_date} to {reb.end_date}
                    </td>
                    <td className="p-3 text-slate-600">{reb.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        reb.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : reb.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {reb.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {reb.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleRebateAction(reb.id, 'approved')}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRebateAction(reb.id, 'rejected')}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 font-medium">Decided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Food & Cleanliness Audit */}
      {activeTab === 'reviews' && (
        <DailyReviewReport userRole="provost" />
      )}

      {/* CSV Modal */}
      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          setIsCsvModalOpen(false);
          loadAllData();
        }}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadAllData();
        }}
      />
    </div>
  );
};
