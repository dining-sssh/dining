'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  GraduationCap, 
  ClipboardList, 
  Award, 
  ArrowRight, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Building,
  UserCheck
} from 'lucide-react';
import { AuthSession, Student, UserRole } from '@/types';
import { DataService } from '@/lib/dataService';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface AuthLandingProps {
  onLogin: (session: AuthSession) => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLogin }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [gmailInput, setGmailInput] = useState('');
  const [selectedPanel, setSelectedPanel] = useState<UserRole>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    DataService.getStudents().then((st) => {
      setStudents(st);
      if (st.length > 0) {
        setSelectedStudentId(st[0].id);
      }
    });
  }, []);

  const handleGmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    let email = gmailInput.trim();
    if (!email) {
      // Default to demo email based on role if blank
      if (selectedPanel === 'student') {
        const activeSt = students.find(s => s.id === selectedStudentId) || students[0];
        email = activeSt ? activeSt.email : 'student.amu@gmail.com';
      } else if (selectedPanel === 'provost') {
        email = 'provost.amu@gmail.com';
      } else {
        email = 'munshi.amu@gmail.com';
      }
    }

    if (!email.includes('@')) {
      setError('Please enter a valid Gmail address (e.g. name@gmail.com).');
      return;
    }

    setIsLoading(true);

    // If live Supabase OAuth is configured, initiate sign in with Google
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
      } catch (err: any) {
        console.warn('Supabase OAuth notice:', err);
      }
    }

    // Process role-based session
    if (selectedPanel === 'student') {
      // Find matching student by email or selected student
      let matchedStudent = students.find(s => s.email.toLowerCase() === email.toLowerCase());
      if (!matchedStudent) {
        matchedStudent = students.find(s => s.id === selectedStudentId) || students[0];
      }

      onLogin({
        role: 'student',
        selectedPanel: 'student',
        email,
        studentId: matchedStudent.id,
        studentEnrollment: matchedStudent.enrollment_no,
        studentName: matchedStudent.name
      });
    } else {
      onLogin({
        role: 'admin',
        selectedPanel,
        email,
        adminType: selectedPanel as 'provost' | 'munshi'
      });
    }

    setIsLoading(false);
  };

  const handleQuickPreset = (presetPanel: UserRole, presetEmail: string, studentObj?: Student) => {
    setSelectedPanel(presetPanel);
    setGmailInput(presetEmail);
    if (studentObj) {
      setSelectedStudentId(studentObj.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Top University Branding Header */}
      <div className="max-w-4xl mx-auto w-full text-center pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-inner">
          <Award className="w-4 h-4 text-amber-400" />
          Aligarh Muslim University • Sir Syed Hall (South)
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
          AMU DINING PORTAL
        </h1>
        <p className="mt-2 text-sm sm:text-base text-emerald-200 max-w-xl mx-auto">
          Sign in using your Gmail account and choose which dining panel to access.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          
          {/* Header */}
          <div className="text-center pb-5 border-b border-slate-100">
            <h2 className="text-2xl font-extrabold text-slate-900">Sign In to Dining Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your authorization level and log in with Gmail
            </p>
          </div>

          <form onSubmit={handleGmailLogin} className="mt-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: CHOOSE WHICH PANEL TO ACCESS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Which Panel Do You Want To Access? <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Option 1: Student */}
                <button
                  type="button"
                  onClick={() => setSelectedPanel('student')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedPanel === 'student'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <GraduationCap className={`w-5 h-5 ${selectedPanel === 'student' ? 'text-emerald-700' : 'text-slate-500'}`} />
                    {selectedPanel === 'student' && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">Student Panel</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Personal Log & Bills</div>
                  </div>
                </button>

                {/* Option 2: Provost */}
                <button
                  type="button"
                  onClick={() => setSelectedPanel('provost')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedPanel === 'provost'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <ShieldCheck className={`w-5 h-5 ${selectedPanel === 'provost' ? 'text-emerald-700' : 'text-slate-500'}`} />
                    {selectedPanel === 'provost' && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">Provost Panel</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Admin Level 1 (Oversight)</div>
                  </div>
                </button>

                {/* Option 3: Munshi */}
                <button
                  type="button"
                  onClick={() => setSelectedPanel('munshi')}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedPanel === 'munshi'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-500 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <ClipboardList className={`w-5 h-5 ${selectedPanel === 'munshi' ? 'text-amber-700' : 'text-slate-500'}`} />
                    {selectedPanel === 'munshi' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">Munshi Panel</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Admin Level 2 (Registers)</div>
                  </div>
                </button>
              </div>

              {/* Panel Privilege Note */}
              <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {selectedPanel === 'student' && (
                  <span className="text-emerald-800 font-medium">
                    🔒 <strong>Student Mode:</strong> You will only be granted access to your own room details, dining attendance, and monthly bills.
                  </span>
                )}
                {selectedPanel === 'provost' && (
                  <span className="text-slate-700 font-medium">
                    🛡️ <strong>Provost Mode:</strong> Full administrative oversight, rate controls, CSV student registration, and ability to audit any student records.
                  </span>
                )}
                {selectedPanel === 'munshi' && (
                  <span className="text-amber-900 font-medium">
                    📋 <strong>Munshi Mode:</strong> Daily meal attendance registers (Eaten / Not Eaten), 30-day matrix, and resident lookup.
                  </span>
                )}
              </div>
            </div>

            {/* If Student Panel: Select Resident Identity */}
            {selectedPanel === 'student' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link Student Resident Record:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    const found = students.find(s => s.id === e.target.value);
                    if (found) setGmailInput(found.email);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white text-slate-800"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.enrollment_no} • {s.house} #{s.room_no}) — {s.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* STEP 2: GMAIL ACCOUNT INPUT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                2. Enter Gmail Account:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  placeholder="e.g. farman.student@gmail.com"
                  value={gmailInput}
                  onChange={(e) => setGmailInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* PROMINENT GMAIL LOGIN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-800 font-bold rounded-2xl text-sm transition shadow-sm flex items-center justify-center gap-3 group active:scale-[0.99]"
            >
              {/* Official Google G Logo */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>
                {isLoading ? 'Signing In...' : `Login using Gmail to ${
                  selectedPanel === 'student' 
                    ? 'Student Panel' 
                    : selectedPanel === 'provost' 
                    ? 'Provost Panel' 
                    : 'Munshi Panel'
                }`}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
            </button>
          </form>

          {/* Quick Preset Chips for Easy Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Quick Test Sign-In (Click any account to fill & test):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPreset('student', 'tariq.student@gmail.com', students[0])}
                className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-left transition"
              >
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Student Demo</div>
                <div className="text-xs font-semibold text-slate-800 truncate">tariq.student@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset('provost', 'provost.amu@gmail.com')}
                className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-left transition"
              >
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Provost Admin</div>
                <div className="text-xs font-semibold text-slate-800 truncate">provost.amu@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset('munshi', 'munshi.amu@gmail.com')}
                className="p-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl text-left transition"
              >
                <div className="text-[10px] font-bold text-amber-800 uppercase">Munshi Admin</div>
                <div className="text-xs font-semibold text-slate-800 truncate">munshi.amu@gmail.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 pt-6">
        Sir Syed Hall Dining Management System • Aligarh Muslim University • Google Authentication & Supabase
      </div>
    </div>
  );
};
