'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StudentPortal } from '@/components/student/StudentPortal';
import { PageHeader } from '@/components/admin/ui';

function MunshiInspector() {
  const params = useSearchParams();
  return <StudentPortal initialStudentId={params.get('student') ?? undefined} />;
}

export default function MunshiInspectorPage() {
  return (
    <>
      <PageHeader
        title="Student view"
        subtitle="See exactly what a resident sees. Pick any student to audit their dining, bills and reviews."
      />
      <Suspense fallback={<p className="py-10 text-center text-sm text-slate-400">Loading…</p>}>
        <MunshiInspector />
      </Suspense>
    </>
  );
}
