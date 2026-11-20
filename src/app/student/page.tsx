'use client';

import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { StudentPortal } from '@/components/student/StudentPortal';

export default function StudentPage() {
  return (
    <AuthGuard allow={['student']}>
      {({ session, logout }) => <StudentPortal enforcedStudentId={session.studentId} onLogout={logout} />}
    </AuthGuard>
  );
}
