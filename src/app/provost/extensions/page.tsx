'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, ShieldPlus } from 'lucide-react';
import { GraceExtension, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { GRACE_DAYS, formatRupees } from '@/lib/diningEngine';
import { useAdminData } from '@/components/admin/AdminData';
import { BTN_PRIMARY, Card, EmptyState, INPUT, PageHeader, Pill, Tone } from '@/components/admin/ui';
import { formatLongDate } from '@/components/student/studentUtils';

const STATUS: Record<GraceExtension['status'], { text: string; tone: Tone }> = {
  awaiting_munshi: { text: 'Sent to Munshi', tone: 'amber' },
  applied: { text: 'Applied', tone: 'emerald' },
  cancelled: { text: 'Cancelled', tone: 'slate' }
};

export default function ProvostExtensionsPage() {
  const { students, accounts, extensions, reload } = useAdminData();
  const [days, setDays] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Students whose dining is stopped because they used all their grace days.
  const stopped = useMemo(
    () =>
      students.filter((s) => s.status === 'active' && accounts.get(s.id)?.status === 'stopped').sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [students, accounts]
  );

  const waiting = (s: Student) => extensions.some((e) => e.student_id === s.id && e.status === 'awaiting_munshi');

  const approve = async (s: Student) => {
    const extra = Number(days[s.id] ?? '3');
    if (!Number.isInteger(extra) || extra < 1 || extra > 30) return setError('Choose between 1 and 30 extra days.');
    setBusy(s.id);
    setError('');
    setMessage('');
    try {
      await DataService.approveGraceExtension({
        student: s,
        extraDays: extra,
        note: notes[s.id]?.trim(),
        approvedBy: 'Provost'
      });
      setMessage(`Approved +${extra} days for ${s.name}. The request is now with the Munshi, who will apply it.`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve.');
    } finally {
      setBusy(null);
    }
  };

  const history = [...extensions].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <PageHeader
        title="Grace extensions"
        subtitle={`A student may eat up to -${GRACE_DAYS} days with no paid day left. Beyond that only you can approve more days.`}
      />

      {message && (
        <div className="fade-enter flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldPlus className="h-4 w-4 text-emerald-700" />
          Dining stopped at -{GRACE_DAYS} ({stopped.length})
        </h2>

        {stopped.length === 0 ? (
          <EmptyState>No student is waiting for an extension.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {stopped.map((s) => {
              const st = accounts.get(s.id);
              const sent = waiting(s);
              return (
                <li key={s.id} className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {s.name} <span className="font-mono text-xs font-semibold text-slate-500">· {s.enrollment_no}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {s.house} {s.room_no} · balance <b>-{st?.negativeDays}</b> · pending <b className="text-rose-700">{formatRupees(st?.pendingAmount ?? 0)}</b>
                    </p>
                  </div>

                  {sent ? (
                    <Pill tone="amber">Sent to Munshi to apply</Pill>
                  ) : (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        Extra days
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={days[s.id] ?? '3'}
                          onChange={(e) => setDays((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          className="w-16 rounded-xl border border-slate-300 px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-xs"
                        />
                      </label>
                      <input
                        value={notes[s.id] ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="Note (optional)"
                        className={`${INPUT} w-44`}
                      />
                      <button type="button" disabled={busy === s.id} onClick={() => approve(s)} className={BTN_PRIMARY}>
                        {busy === s.id ? 'Sending…' : 'Approve & send to Munshi'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-slate-500">
          Approving does not restart dining by itself. The Munshi gets the request on the Dining On / Off screen and applies it.
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">History</h2>
        {history.length === 0 ? (
          <EmptyState>No extension has been approved yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {history.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">
                    {e.student_name} · +{e.extra_days} day{e.extra_days > 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Approved {formatLongDate(e.created_at.slice(0, 10))}
                    {e.applied_at && ` · applied ${formatLongDate(e.applied_at)}`}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <Pill tone={STATUS[e.status].tone}>{STATUS[e.status].text}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
