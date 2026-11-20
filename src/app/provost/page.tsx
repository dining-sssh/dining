'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, IndianRupee, Star, TrendingUp, Users } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode } from '@/types';
import { DataService } from '@/lib/dataService';
import { formatMoney } from '@/lib/billingUtils';
import { useProvostData } from '@/components/provost/ProvostData';
import { Card, EmptyState, PageHeader, Pill, StatCard } from '@/components/admin/ui';
import { formatDayMonth } from '@/components/student/studentUtils';

export default function ProvostOverviewPage() {
  const { students, bills, rebates, settings, todayReview, totalPendingDues, reload } = useProvostData();

  const totalDiets = bills.reduce((acc, b) => acc + (b.total_diets || 0), 0);
  const totalBilled = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const pending = rebates.filter((r) => r.status === 'pending');

  const houseCounts = (Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((code) => ({
    code,
    count: students.filter((s) => s.house === code).length
  }));

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    await DataService.updateRebateStatus(id, status);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Provost Dashboard"
        subtitle={settings ? `${settings.provost_name} · Session ${settings.session}` : 'Hall oversight'}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Residents" value={students.length} hint="Across all 6 houses" icon={Users} tone="emerald" />
        <StatCard label="Diets logged" value={totalDiets.toLocaleString('en-IN')} hint="This and earlier sessions" icon={TrendingUp} tone="sky" />
        <StatCard label="Billed" value={formatMoney(totalBilled)} hint="Diets + fixed + establishment" icon={IndianRupee} tone="slate" />
        <StatCard label="Pending dues" value={formatMoney(totalPendingDues)} hint="Charged minus deposited" icon={Clock} tone="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="text-sm font-bold text-slate-900">Residents by house</h2>
          <p className="text-xs text-slate-500">Tap a house to open its students</p>
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
              <h2 className="text-sm font-bold text-slate-900">Rebate requests waiting</h2>
              <Link href="/provost/rebates" className="flex items-center text-xs font-bold text-emerald-800">
                All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {pending.length === 0 ? (
              <EmptyState>Nothing waiting for approval.</EmptyState>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {pending.slice(0, 3).map((r) => (
                  <li key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-900">
                      {r.student_name} <span className="font-mono font-semibold text-slate-500">· {r.enrollment_no}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDayMonth(r.start_date)} – {formatDayMonth(r.end_date)} · {r.reason}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => decide(r.id, 'approved')}
                        className="press rounded-full bg-emerald-800 px-4 py-1.5 text-[11px] font-bold text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r.id, 'rejected')}
                        className="press rounded-full bg-rose-600 px-4 py-1.5 text-[11px] font-bold text-white"
                      >
                        Reject
                      </button>
                    </div>
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
