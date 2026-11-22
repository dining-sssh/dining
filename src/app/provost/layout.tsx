'use client';

import React from 'react';
import { LayoutDashboard, ShieldPlus, Users, Utensils } from 'lucide-react';
import { AuthSession } from '@/types';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AdminShell, AdminNavItem } from '@/components/admin/AdminShell';
import { AdminDataProvider, useAdminData } from '@/components/admin/AdminData';

const Frame: React.FC<{
  session: AuthSession;
  onLogout: () => void;
  children: React.ReactNode;
}> = ({ session, onLogout, children }) => {
  const { students, accounts, extensions } = useAdminData();

  // Students stopped at the grace limit who have no extension waiting yet.
  const waitingForProvost = students.filter((s) => {
    const st = accounts.get(s.id);
    return s.status === 'active' && st?.status === 'stopped' && !extensions.some((e) => e.student_id === s.id && e.status === 'awaiting_munshi');
  }).length;

  const nav: AdminNavItem[] = [
    { href: '/provost', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/provost/students', label: 'Students', icon: Users },
    { href: '/provost/extensions', label: 'Extensions', icon: ShieldPlus, badge: waitingForProvost },
    { href: '/provost/reviews', label: 'Food & Cleanliness', icon: Utensils }
  ];

  return (
    <AdminShell
      panelName="Provost"
      panelNote="Admin level 1 · Oversight"
      nav={nav}
      session={session}
      onLogout={onLogout}
    >
      {children}
    </AdminShell>
  );
};

export default function ProvostLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow={['provost']}>
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
