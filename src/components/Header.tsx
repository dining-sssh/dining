'use client';

import React from 'react';
import { UserRole, AuthSession } from '@/types';
import { ShieldCheck, ClipboardList, UserCheck, Database, Calendar, Award, LogOut, User } from 'lucide-react';
import { DataService } from '@/lib/dataService';

interface HeaderProps {
  authSession: AuthSession;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  session: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  authSession, 
  currentRole, 
  onRoleChange, 
  onLogout,
  session 
}) => {
  const isLive = DataService.isLiveSupabase();
  const isStudent = authSession.role === 'student';

  return (
    <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  AMU DINING HALL SYSTEM
                </h1>
                <span className="bg-amber-500 text-emerald-950 text-xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Session {session}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200">
                Sir Syed Hall • Residence Dining & Meal Management Portal
              </p>
            </div>
          </div>

          {/* User Badge, Database Status & Logout info */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            {/* Gmail Account & Identity Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-xs text-emerald-100 shadow-inner">
              {/* Google G logo */}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="font-mono text-[11px] text-emerald-200 hidden md:inline truncate max-w-40" title={authSession.email}>
                {authSession.email}
              </span>
              <span className="text-emerald-500 hidden md:inline">•</span>

              {isStudent ? (
                <>
                  <span className="font-bold text-white">{authSession.studentName}</span>
                  <span className="bg-emerald-800 font-mono text-[11px] px-1.5 py-0.5 rounded text-amber-300 font-semibold">
                    {authSession.studentEnrollment}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-white">
                    {authSession.adminType === 'provost' ? 'Provost Admin' : 'Munshi Admin'}
                  </span>
                  <span className="bg-amber-500 text-emerald-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                    Admin
                  </span>
                </>
              )}
            </div>

            {/* Supabase status indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              isLive 
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50' 
                : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span>{isLive ? 'Supabase Live' : 'Supabase (Local Sync)'}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 border border-rose-700/60 text-xs font-bold text-white transition shadow-sm"
              title="Log out from Gmail and return to login screen"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Visible ONLY to Admins */}
        {!isStudent && (
          <div className="mt-5 pt-3 border-t border-emerald-700/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onRoleChange('provost')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                  currentRole === 'provost'
                    ? 'bg-amber-500 text-emerald-950 shadow-md font-bold'
                    : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-100 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Provost Oversight (Admin Level 1)</span>
              </button>

              <button
                onClick={() => onRoleChange('munshi')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                  currentRole === 'munshi'
                    ? 'bg-amber-500 text-emerald-950 shadow-md font-bold'
                    : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-100 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Munshi Day-Wise Register (Admin Level 2)</span>
              </button>

              <button
                onClick={() => onRoleChange('student')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                  currentRole === 'student'
                    ? 'bg-amber-500 text-emerald-950 shadow-md font-bold'
                    : 'bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-100 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Student View Inspector (Audit All Students)</span>
              </button>
            </div>

            <span className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/20 px-2.5 py-1 rounded-lg font-medium hidden lg:inline-block">
              🛡️ Admin Privilege: Access both Admin & Student data
            </span>
          </div>
        )}

        {/* If student, show friendly student navigation indicator */}
        {isStudent && (
          <div className="mt-4 pt-3 border-t border-emerald-700/40 flex items-center justify-between text-xs text-emerald-200">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Student Dining Dashboard • Session {session}
            </span>
            <span className="text-[11px] text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-700/40">
              🔒 Personal Student Account
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
