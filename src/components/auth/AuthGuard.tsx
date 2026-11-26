'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSession, UserRole } from '@/types';
import { clearAuthSession, homeRouteFor, panelOf, readAuthSession, signOutEverywhere } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

interface AuthGuardProps {
  /** Panels allowed to see this route. Anyone else is sent to their own panel. */
  allow: UserRole[];
  children: (ctx: { session: AuthSession; logout: () => void }) => React.ReactNode;
}

const Splash: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex min-h-[100dvh] items-center justify-center bg-emerald-950 text-sm text-emerald-100">{text}</div>
);

export const AuthGuard: React.FC<AuthGuardProps> = ({ allow, children }) => {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const current = readAuthSession();
      if (!current) {
        router.replace('/');
        return;
      }
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          clearAuthSession();
          router.replace('/');
          return;
        }
      }
      if (!allow.includes(panelOf(current))) {
        router.replace(homeRouteFor(current));
        return;
      }
      setSession(current);
    };
    check();
    return () => {
      cancelled = true;
    };
    // `allow` is a literal array on every render; the role check only needs to run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const logout = useCallback(async () => {
    // Take the panel off the screen first, so nothing keeps asking the database while we sign out.
    setLoggingOut(true);
    await signOutEverywhere();
    router.replace('/');
  }, [router]);

  if (loggingOut) return <Splash text="Signing out…" />;
  if (!session) return <Splash text="Loading…" />;

  return <>{children({ session, logout })}</>;
};
