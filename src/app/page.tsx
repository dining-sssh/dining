'use client';

import React, { useState, useEffect } from 'react';
import { UserRole, AuthSession } from '@/types';
import { Header } from '@/components/Header';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { ProvostDashboard } from '@/components/provost/ProvostDashboard';
import { MunshiDashboard } from '@/components/munshi/MunshiDashboard';
import { StudentPortal } from '@/components/student/StudentPortal';
import { RotateCcw } from 'lucide-react';
import { DataService } from '@/lib/dataService';

const AUTH_STORAGE_KEY = 'amu_dining_auth_session';

export default function Home() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [role, setRole] = useState<UserRole>('munshi');
  const [isInitialized, setIsInitialized] = useState(false);
  const session = '2026-2027';

  // Load saved session on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed: AuthSession = JSON.parse(saved);
        setAuthSession(parsed);
        if (parsed.role === 'admin') {
          setRole(parsed.selectedPanel || parsed.adminType || 'provost');
        } else {
          setRole('student');
        }
      }
    } catch (e) {
      console.warn('Could not read auth session:', e);
    }
    setIsInitialized(true);
  }, []);

  const handleLogin = (sessionData: AuthSession) => {
    setAuthSession(sessionData);
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn(e);
    }

    if (sessionData.role === 'admin') {
      setRole(sessionData.selectedPanel || sessionData.adminType || 'provost');
    } else {
      setRole('student');
    }
  };

  const handleLogout = () => {
    setAuthSession(null);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleResetData = () => {
    if (confirm('Reset dining database to initial AMU hostel seed data? Any new entries will be refreshed.')) {
      DataService.resetAllData();
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.reload();
    }
  };

  // Prevent flash before session check
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Loading AMU Dining Portal...
      </div>
    );
  }

  // 1. If not logged in -> Show Entrance / Portal Selection Page
  if (!authSession) {
    return <AuthLanding onLogin={handleLogin} />;
  }

  const isStudent = authSession.role === 'student';

  // Students get their own self-contained app-style layout (own header, bottom nav, logout in Profile).
  if (isStudent) {
    return <StudentPortal enforcedStudentId={authSession.studentId} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      {/* Top Header */}
      <Header 
        authSession={authSession}
        currentRole={role} 
        onRoleChange={setRole} 
        onLogout={handleLogout}
        session={session} 
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin logged in: chosen admin panel or student inspector */}
        {role === 'provost' && <ProvostDashboard />}
        {role === 'munshi' && <MunshiDashboard />}
        {role === 'student' && <StudentPortal />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Sir Syed Hall Dining Management System</span>
            <span>•</span>
            <span>Aligarh Muslim University (AMU)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetData}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition"
              title="Reset LocalStorage data to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              Reset Demo Records
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Next.js 14 • Supabase PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
