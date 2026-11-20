'use client';

import React from 'react';
import { FileSpreadsheet, Grid3x3, Receipt, Users, Utensils } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AdminShell, AdminNavItem } from '@/components/admin/AdminShell';
import { ProvostDataProvider } from '@/components/provost/ProvostData';

const NAV: AdminNavItem[] = [
  { href: '/munshi', label: 'Dining Ledger', icon: FileSpreadsheet, exact: true },
  { href: '/munshi/slips', label: 'Cut Slip', icon: Receipt },
  { href: '/munshi/students', label: 'Students', icon: Users },
  { href: '/munshi/matrix', label: 'Month Matrix', icon: Grid3x3 },
  { href: '/munshi/reviews', label: 'Food & Cleanliness', icon: Utensils }
];

export default function MunshiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow={['munshi']}>
      {({ session, logout }) => (
        <ProvostDataProvider>
          <AdminShell
            panelName="Munshi"
            panelNote="Admin level 2 · Registers & Students"
            nav={NAV}
            session={session}
            onLogout={logout}
          >
            {children}
          </AdminShell>
        </ProvostDataProvider>
      )}
    </AuthGuard>
  );
}
