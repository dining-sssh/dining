'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { RebateRequest } from '@/types';
import { DataService } from '@/lib/dataService';
import { useProvostData } from '@/components/provost/ProvostData';
import { Card, EmptyState, PageHeader, Pill, Tone } from '@/components/admin/ui';
import { formatDayMonth } from '@/components/student/studentUtils';

const STATUS_TONE: Record<RebateRequest['status'], Tone> = {
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose'
};

type Filter = 'pending' | 'decided' | 'all';

export default function ProvostRebatesPage() {
  const { rebates, reload } = useProvostData();
  const [filter, setFilter] = useState<Filter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = rebates.filter((r) => r.status === 'pending').length;

  const list = useMemo(() => {
    const items = rebates.filter((r) =>
      filter === 'all' ? true : filter === 'pending' ? r.status === 'pending' : r.status !== 'pending'
    );
    return [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [rebates, filter]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    await DataService.updateRebateStatus(id, status);
    await reload();
    setBusyId(null);
  };

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'pending', label: `Pending (${pendingCount})` },
    { id: 'decided', label: 'Decided' },
    { id: 'all', label: 'All' }
  ];

  return (
    <>
      <PageHeader title="Rebate approvals" subtitle="Mess off requests sent by students" />

      <div className="grid max-w-md grid-cols-3 rounded-full bg-slate-200/70 p-1 text-xs font-bold">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            aria-pressed={filter === t.id}
            className={`press rounded-full py-2 transition-colors ${
              filter === t.id ? 'bg-white text-emerald-950 shadow' : 'text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState>{filter === 'pending' ? 'No pending requests.' : 'Nothing to show here.'}</EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{r.student_name}</p>
                    <p className="font-mono text-xs font-semibold text-slate-500">{r.enrollment_no}</p>
                  </div>
                  <Pill tone={STATUS_TONE[r.status]}>{r.status.toUpperCase()}</Pill>
                </div>

                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <CalendarDays className="h-4 w-4 text-emerald-700" />
                  {formatDayMonth(r.start_date)} – {formatDayMonth(r.end_date)}
                </p>
                <p className="mt-1.5 text-xs text-slate-600">{r.reason}</p>

                {r.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, 'approved')}
                      className="press flex-1 rounded-full bg-emerald-800 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, 'rejected')}
                      className="press flex-1 rounded-full bg-rose-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
