'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, ExternalLink, Utensils } from 'lucide-react';
import { AuthSession, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { ADMIN_CONTACT_EMAIL, resolveLogin } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface AuthLandingProps {
  onLogin: (session: AuthSession) => void;
  onResetData?: () => void;
}

/* ------------------------------------------------------------------ */
/* Artwork (inline SVG, no image files needed)                         */
/* ------------------------------------------------------------------ */

const AmuEmblem: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative flex items-center justify-center ${className ?? ''}`}>
    <img
      src="/amu-logo.png"
      alt="Aligarh Muslim University emblem"
      className="h-full w-full object-contain"
    />
  </div>
);

const CampusArt: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 420 120" className={className} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    {/* trees */}
    <g fill="#7fb293" opacity="0.9">
      <circle cx="44" cy="78" r="22" />
      <circle cx="68" cy="88" r="18" />
      <circle cx="372" cy="78" r="22" />
      <circle cx="348" cy="88" r="18" />
    </g>
    <g fill="#4d8a68">
      <rect x="41" y="92" width="6" height="28" />
      <rect x="369" y="92" width="6" height="28" />
    </g>
    {/* long building */}
    <rect x="86" y="82" width="248" height="38" fill="#b9d8c6" />
    <g fill="#8fbfa3">
      {Array.from({ length: 11 }, (_, i) => (
        <path key={i} d={`M${100 + i * 21} 120 v-18 a7 7 0 0 1 14 0 v18 z`} />
      ))}
    </g>
    <rect x="86" y="78" width="248" height="5" fill="#8fbfa3" />
    {/* centre tower */}
    <rect x="190" y="38" width="40" height="82" fill="#a6cdb5" />
    <rect x="186" y="34" width="48" height="6" fill="#7fb293" />
    <path d="M196 34 C196 14 224 14 224 34 z" fill="#7fb293" />
    <rect x="208.5" y="4" width="3" height="12" fill="#4d8a68" />
    <path d="M204 120 v-26 a6 6 0 0 1 12 0 v26 z" fill="#6aa684" />
    <g fill="#6aa684">
      <rect x="196" y="48" width="8" height="14" rx="4" />
      <rect x="216" y="48" width="8" height="14" rx="4" />
    </g>
    {/* side domes */}
    <path d="M100 82 C100 66 124 66 124 82 z" fill="#8fbfa3" />
    <path d="M296 82 C296 66 320 66 320 82 z" fill="#8fbfa3" />
  </svg>
);

const MinaretArt: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 160 360" className={className} aria-hidden="true">
    <rect x="62" y="70" width="36" height="290" fill="currentColor" />
    <rect x="54" y="64" width="52" height="10" fill="currentColor" />
    <path d="M62 64 C62 30 98 30 98 64 z" fill="currentColor" />
    <rect x="78" y="6" width="4" height="26" fill="currentColor" />
    <rect x="0" y="210" width="160" height="150" fill="currentColor" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

const GoogleG: React.FC = () => (
  <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLogin, onResetData }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsReady, setStudentsReady] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailStep, setShowEmailStep] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // With a database, students can only be read after login, so they are loaded inside finish().
    if (isSupabaseConfigured) {
      setStudentsReady(true);
      return;
    }
    DataService.getStudents().then((list) => {
      setStudents(list);
      setStudentsReady(true);
    });
  }, []);

  const finish = async (rawEmail: string) => {
    const live = isSupabaseConfigured;
    let staffRole: 'provost' | 'munshi' | null = null;
    let list = students;
    try {
      staffRole = live ? await DataService.getStaffRole(rawEmail) : null;
      if (live && !staffRole) list = await DataService.getStudents({ strict: true });
    } catch (e) {
      // The account may be fine; the database could not be read (for example missing grants or tables).
      setError(`Signed in, but the database could not be read: ${e instanceof Error ? e.message : 'unknown error'}`);
      return;
    }
    const result = resolveLogin(rawEmail, list, staffRole);
    if (!result.ok) {
      setError(result.error);
      // A Google account that is not registered here must not stay signed in.
      if (isSupabaseConfigured && supabase) await supabase.auth.signOut().catch(() => undefined);
      return;
    }
    onLogin(result.session);
  };

  // Coming back from Google: pick up the signed-in account and open its panel.
  useEffect(() => {
    if (!studentsReady || !isSupabaseConfigured || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const googleEmail = data.session?.user?.email;
      if (googleEmail) finish(googleEmail);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentsReady]);

  const handleGoogle = async () => {
    setError('');
    if (isSupabaseConfigured && supabase) {
      setBusy(true);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (oauthError) {
        setError(oauthError.message);
        setBusy(false);
      }
      return;
    }
    // Google is not connected yet (no Supabase keys): fall back to typing the registered Gmail.
    setShowEmailStep(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    await finish(email);
    setBusy(false);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#eef5f1]">
      {/* Background art */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-48 -top-56 h-[30rem] w-[30rem] rounded-full bg-emerald-900" />
        <div className="absolute -left-56 -top-64 h-[34rem] w-[34rem] rounded-full border-2 border-emerald-800/60" />
        <div className="absolute -bottom-64 -right-48 h-[32rem] w-[32rem] rounded-full bg-emerald-900" />
        <div className="absolute -bottom-72 -right-56 h-[36rem] w-[36rem] rounded-full border-2 border-emerald-800/60" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%)' }} />
        <MinaretArt className="absolute -left-6 bottom-0 hidden h-80 w-40 text-emerald-900/10 md:block" />
        <MinaretArt className="absolute -right-6 bottom-0 hidden h-80 w-40 text-emerald-900/10 md:block" />
      </div>

      <main className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 py-8">
        <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-emerald-950/20 ring-1 ring-emerald-900/10">
          {/* corner shapes */}
          <div className="absolute left-0 top-0 h-28 w-28 bg-emerald-900 [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
          <div className="absolute left-0 top-0 h-36 w-36 bg-emerald-700/25 [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
          <div className="absolute right-0 top-0 h-24 w-24 bg-emerald-800 [clip-path:polygon(0_0,100%_0,100%_100%)]" aria-hidden="true" />

          <div className="relative px-6 pb-4 pt-8 text-center sm:px-9">
            <AmuEmblem className="mx-auto h-32 w-32 sm:h-36 sm:w-36" />

            <h1 className="mt-4 text-2xl font-extrabold leading-tight text-emerald-900 sm:text-[1.7rem]">
              Aligarh Muslim
              <br />
              University
            </h1>
            <div className="mx-auto mt-2 flex max-w-[16rem] items-center gap-2 text-emerald-800/60" aria-hidden="true">
              <span className="h-px flex-1 bg-current" />
              <span className="text-xs">★</span>
              <span className="h-px flex-1 bg-current" />
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-emerald-900 sm:text-4xl">Sulaiman Hall</h2>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
              <Utensils className="h-4 w-4" />
              Dining System
            </span>

            <h3 className="mt-6 text-2xl font-extrabold text-emerald-950">Sign In</h3>
            <p className="mt-1 text-sm text-slate-600">Access your dining information</p>

            {error && (
              <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left text-xs font-medium text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy || !studentsReady}
              className="press mt-5 flex w-full items-center gap-4 rounded-full bg-white px-5 py-3.5 text-left shadow-lg shadow-emerald-950/10 ring-1 ring-slate-200 disabled:opacity-60"
            >
              <GoogleG />
              <span className="h-7 w-px bg-slate-200" />
              <span className="flex-1 text-base font-semibold text-slate-900">
                {busy ? 'Signing in…' : 'Sign in with Google'}
              </span>
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </button>

            {showEmailStep && (
              <form onSubmit={handleEmailSubmit} className="fade-enter mt-4 space-y-3 text-left">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">Registered Gmail</span>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="press w-full rounded-full bg-emerald-900 py-3 text-sm font-bold text-white shadow disabled:opacity-60"
                >
                  {busy ? 'Checking…' : 'Continue'}
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  Google sign-in is not connected on this setup, so the registered email is checked directly.
                </p>
              </form>
            )}

            <div className="mt-5 flex items-center gap-4 text-xs font-semibold text-slate-600" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-300" />
              OR
              <span className="h-px flex-1 bg-slate-300" />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-900">
              Need Help?{' '}
              <a
                href={`mailto:${ADMIN_CONTACT_EMAIL}?subject=Dining%20portal%20access`}
                className="inline-flex items-center gap-1 font-bold text-emerald-800 underline-offset-2 hover:underline"
              >
                Contact Admin
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </p>
          </div>

          {/* bottom artwork */}
          <div className="relative mt-2 h-32" aria-hidden="true">
            <div className="absolute bottom-0 left-0 h-16 w-24 bg-emerald-900 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
            <div className="absolute bottom-0 right-0 h-16 w-24 bg-emerald-800 [clip-path:polygon(100%_100%,100%_0,0_100%)]" />
            <CampusArt className="absolute inset-x-0 bottom-0 mx-auto h-full w-full max-w-sm" />
          </div>
        </div>

        {onResetData && (
          <button
            type="button"
            onClick={onResetData}
            className="text-[11px] font-medium text-emerald-900/50 underline-offset-2 hover:text-emerald-900 hover:underline"
          >
            Reset demo records
          </button>
        )}
      </main>

    </div>
  );
};
