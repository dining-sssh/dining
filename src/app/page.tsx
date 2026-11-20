'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthSession } from '@/types';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { DataService } from '@/lib/dataService';
import { clearAuthSession, homeRouteFor, readAuthSession, saveAuthSession } from '@/lib/auth';

/** Login page. After signing in, each panel lives at its own URL: /student, /provost, /munshi. */
export default function LoginPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const existing = readAuthSession();
    if (existing) {
      router.replace(homeRouteFor(existing));
      return;
    }
    setChecked(true);
  }, [router]);

  const handleLogin = (session: AuthSession) => {
    saveAuthSession(session);
    router.push(homeRouteFor(session));
  };

  const handleResetData = () => {
    if (confirm('Reset the dining database to the initial demo data? Any new entries will be lost.')) {
      DataService.resetAllData();
      clearAuthSession();
      window.location.reload();
    }
  };

  if (!checked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-emerald-950 text-sm text-emerald-100">
        Loading AMU Dining Portal…
      </div>
    );
  }

  return <AuthLanding onLogin={handleLogin} onResetData={handleResetData} />;
}
