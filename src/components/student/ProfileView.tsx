'use client';

import React from 'react';
import { Clock, LogOut, Send, UtensilsCrossed } from 'lucide-react';
import { DiningRequest, HOSTEL_HOUSES, Student } from '@/types';
import { formatLongDate } from './studentUtils';

interface ProfileViewProps {
  student: Student;
  requests: DiningRequest[];
  pendingRequest?: DiningRequest | null;
  /** Dining is currently off (closed), so the button asks to open it again. */
  isOff: boolean;
  onDiningOff: () => void;
  onDiningOn: () => void;
  onLogout?: () => void;
}

const STATUS_TONE: Record<DiningRequest['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800'
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  student,
  requests,
  pendingRequest,
  isOff,
  onDiningOff,
  onDiningOn,
  onLogout
}) => {
  const house = HOSTEL_HOUSES[student.house];
  const sorted = [...requests].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const tiles = [
    { label: 'Hostel house', value: house?.name ?? student.house },
    { label: 'Allotted room', value: `Room ${student.room_no}` },
    { label: 'Previous hostel', value: student.previous_house || '—' },
    { label: 'Previous room', value: student.previous_room || 'New allotment' }
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
          <div key={t.label} className="rounded-2xl border border-white/80 bg-white p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{t.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dining off / on</h3>
            <p className="text-xs text-slate-500">
              {pendingRequest ? 'Request pending review by Munshi' : 'Requests go to the Munshi'}
            </p>
          </div>
          {pendingRequest ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300">
              <Clock className="h-3.5 w-3.5 animate-pulse text-amber-700" />
              {pendingRequest.kind === 'off' ? 'Off Pending' : 'Open Pending'}
            </span>
          ) : isOff ? (
            <button
              type="button"
              onClick={onDiningOn}
              className="press flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Request to open
            </button>
          ) : (
            <button
              type="button"
              onClick={onDiningOff}
              className="press flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-emerald-950 shadow-sm"
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Dining off
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {sorted.map((r) => (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {r.kind === 'off' ? 'Dining off' : 'Open dining'} · from {formatLongDate(r.start_date)}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                {r.reason && <p className="mt-1 text-[11px] text-slate-600">{r.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="press flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-white py-3 text-sm font-bold text-rose-700 shadow-sm"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      )}
    </div>
  );
};
