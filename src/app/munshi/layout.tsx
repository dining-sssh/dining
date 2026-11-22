'use client';

import React from 'react';
import {
  FileSpreadsheet,
  Grid3x3,
  Power,
  Receipt,
  TrendingDown,
  Users,
  Utensils,
  UtensilsCrossed
} from 'lucide-react';
import { AuthSession } from '@/types';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AdminShell, AdminNavItem } from '@/components/admin/AdminShell';
import { AdminDataProvider, useAdminData } from '@/components/admin/AdminData';

const Frame: React.FC<{ session: AuthSession; onLogout: () => void; children: React.ReactNode }> = ({
  session,
  onLogout,
  children
}) => {
  const { requests, extensions } = useAdminData();
  const waiting =
    requests.filter((r) => r.status === 'pending').length + extensions.filter((e) => e.status === 'awaiting_munshi').length;

  const nav: AdminNavItem[] = [
    { href: '/munshi', label: 'Dining Ledger', icon: FileSpreadsheet, exact: true },
    { href: '/munshi/students', label: 'Students', icon: Users },
    { href: '/munshi/dining', label: 'Dining On / Off', icon: Power, badge: waiting },
    { href: '/munshi/deficit', label: 'Deficit (Per Day)', icon: TrendingDown },
    { href: '/munshi/slips', label: 'Cut Slip', icon: Receipt },
    { href: '/munshi/menu', label: 'Menu & Timings', icon: UtensilsCrossed },
    { href: '/munshi/matrix', label: 'Month Matrix', icon: Grid3x3 },
    { href: '/munshi/reviews', label: 'Food & Cleanliness', icon: Utensils }
  ];

  return (
    <AdminShell
      panelName="Munshi"
      panelNote="Admin level 2 · Registers & Students"
      nav={nav}
      session={session}
      onLogout={onLogout}
    >
      {children}
    </AdminShell>
  );
};

export default function MunshiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow={['munshi']}>
      {({ session, logout }) => (
        <AdminDataProvider>
          <Frame session={session} onLogout={logout}>
            {children}
          </Frame>
        </AdminDataProvider>
      )}
    </AuthGuard>
  );
}
