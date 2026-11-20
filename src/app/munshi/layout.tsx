'use client';

import React from 'react';
import { ClipboardList, Grid3x3, Utensils } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AdminShell, AdminNavItem } from '@/components/admin/AdminShell';

const NAV: AdminNavItem[] = [
  { href: '/munshi', label: 'Daily Register', icon: ClipboardList, exact: true },
  { href: '/munshi/matrix', label: 'Month Matrix', icon: Grid3x3 },
  { href: '/munshi/reviews', label: 'Food & Cleanliness', icon: Utensils }
];

export default function MunshiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow={['munshi']}>
      {({ session, logout }) => (
        <AdminShell
          panelName="Munshi"
          panelNote="Admin level 2 · Registers"
          nav={NAV}
          session={session}
          onLogout={logout}
        >
          {children}
        </AdminShell>
      )}
    </AuthGuard>
  );
}
