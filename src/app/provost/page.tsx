'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, ShieldPlus, Star, Users, Wallet } from 'lucide-react';
import { HOSTEL_HOUSES, HOUSE_CODES } from '@/types';
import { formatRupees } from '@/lib/diningEngine';
import { useAdminData } from '@/components/admin/AdminData';
import { Card, EmptyState, PageHeader, Pill, StatCard } from '@/components/admin/ui';

export default function ProvostOverviewPage() {
  const { students, accounts, settings, todayReview, totalPending, totalReceived, activeCount, extensions } = useAdminData();

  const houseCounts = HOUSE_CODES.map((code) => ({
    code,
    count: students.filter((s) => s.house === code).length
  }));

  const stopped = students.filter((s) => s.status === 'active' && accounts.get(s.id)?.status === 'stopped');
  const awaiting = extensions.filter((e) => e.status === 'awaiting_munshi').length;

  return (
    <>
      <PageHeader
        title="Provost Dashboard"
        subtitle={settings ? `${settings.provost_name} · Sir Shah Sulaiman Hall` : 'Hall oversight'}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total pending amount" value={formatRupees(totalPending)} hint="Unpaid deficit of all students" icon={Clock} tone="amber" />
        <StatCard label="Total received" value={formatRupees(totalReceived)} hint="All deposits (food charges slips)" icon={Wallet} tone="emerald" />
        <StatCard label="Active dining" value={`${activeCount} / ${students.length}`} hint="Dining running today" icon={Users} tone="sky" />
        <StatCard label="At the -3 limit" value={stopped.length} hint={`${awaiting} extension${awaiting === 1 ? '' : 's'} with the Munshi`} icon={ShieldPlus} tone="rose" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="text-sm font-bold text-slate-900">Residents by hostel</h2>
          <p className="text-xs text-slate-500">Tap a hostel to open its students</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {houseCounts.map(({ code, count }) => (
              <Link
                key={code}
                href={`/provost/students?house=${code}`}
                className="press rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-extrabold ${HOSTEL_HOUSES[code].color}`}>{code}</span>
                  <span className="text-lg font-black text-slate-900">{count}</span>
                </div>
                <p className="mt-1.5 truncate text-xs font-semibold text-slate-700">{HOSTEL_HOUSES[code].name}</p>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Dining stopped at -3</h2>
              <Link href="/provost/extensions" className="flex items-center text-xs font-bold text-emerald-800">
                Extensions <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {stopped.length === 0 ? (
              <EmptyState>No student has reached the limit.</EmptyState>
            ) : (
              <ul className="mt-3 space-y-2">
                {stopped.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{s.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">{s.enrollment_no}</p>
                    </div>
                    <Pill tone="rose">{formatRupees(accounts.get(s.id)?.pendingAmount ?? 0)}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Link href="/provost/reviews" className="press block">
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Star className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">Today&apos;s food & cleanliness</p>
                  <p className="text-xs text-slate-500">
                    {todayReview && todayReview.total_reviews > 0
                      ? `${todayReview.overall_score} / 5 from ${todayReview.total_reviews} reviews`
                      : 'No reviews yet today'}
                  </p>
                </div>
                {todayReview && todayReview.total_reviews > 0 && <Pill tone="amber">★ {todayReview.overall_score}</Pill>}
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}
