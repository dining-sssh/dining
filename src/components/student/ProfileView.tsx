'use client';

import React from 'react';
import { LogOut, Send } from 'lucide-react';
import { HOSTEL_HOUSES, RebateRequest, Student } from '@/types';
import { formatDayMonth } from './studentUtils';

interface ProfileViewProps {
  student: Student;
  rebates: RebateRequest[];
  onApplyRebate: () => void;
  onLogout?: () => void;
}

const REBATE_TONE: Record<RebateRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800'
};

export const ProfileView: React.FC<ProfileViewProps> = ({ student, rebates, onApplyRebate, onLogout }) => {
  const house = HOSTEL_HOUSES[student.house];
  const sorted = [...rebates].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const tiles = [
    { label: 'Hostel house', value: house?.name ?? student.house },
    { label: 'Allotted room', value: `Room ${student.room_no}` },
    { label: 'Previous room', value: student.previous_room || 'New allotment' },
    { label: 'Session', value: student.session }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-[#0c5a41] via-[#0a4733] to-[#052e20] p-5 text-white shadow-lg shadow-emerald-900/25">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold ring-2 ring-white/30">
            {student.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">{student.name}</h2>
            <p className="mt-0.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-xs font-bold">
              {student.enrollment_no}
            </p>
            <p className="mt-1 truncate text-xs text-emerald-100">
              {student.course} · {student.email}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{t.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg shadow-emerald-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Mess off requests</h3>
            <p className="text-xs text-slate-500">Leave rebate requests and their status</p>
          </div>
          <button
            type="button"
            onClick={onApplyRebate}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-emerald-950 shadow-sm transition hover:bg-amber-500"
          >
            <Send className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {sorted.map((r) => (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {formatDayMonth(r.start_date)} – {formatDayMonth(r.end_date)}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${REBATE_TONE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{r.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white py-3 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      )}
    </div>
  );
};
