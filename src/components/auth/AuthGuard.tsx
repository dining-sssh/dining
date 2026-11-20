'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSession, UserRole } from '@/types';
import { clearAuthSession, homeRouteFor, panelOf, readAuthSession } from '@/lib/auth';

interface AuthGuardProps {
  /** Panels allowed to see this route. Anyone else is sent to their own panel. */
  allow: UserRole[];
  children: (ctx: { session: AuthSession; logout: () => void }) => React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ allow, children }) => {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const current = readAuthSession();
    if (!current) {
      router.replace('/');
      return;
    }
    if (!allow.includes(panelOf(current))) {
      router.replace(homeRouteFor(current));
      return;
    }
    setSession(current);
    // `allow` is a literal array on every render; the role check only needs to run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const logout = useCallback(() => {
    clearAuthSession();
    router.replace('/');
  }, [router]);

  if (!session) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-emerald-950 text-sm text-emerald-100">
        Loading…
      </div>
    );
  }

  return <>{children({ session, logout })}</>;
};
