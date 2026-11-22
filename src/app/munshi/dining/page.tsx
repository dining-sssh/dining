'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Power, PowerOff, ShieldPlus } from 'lucide-react';
import { DataService } from '@/lib/dataService';
import { formatDays, formatRupees } from '@/lib/diningEngine';
import { useAdminData } from '@/components/admin/AdminData';
import { diningLabel } from '@/components/admin/studentStatus';
import { BTN_PRIMARY, Card, EmptyState, INPUT, PageHeader, Pill } from '@/components/admin/ui';
import { StudentPicker } from '@/components/munshi/StudentPicker';
import { formatLongDate, toDateKey } from '@/components/student/studentUtils';

const Label: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-slate-700">{text}</span>
    {children}
  </label>
);

function DiningControl() {
  const { students, requests, extensions, accounts, todayKey, reload } = useAdminData();
  const params = useSearchParams();
  const preset = params.get('en');

  const [studentId, setStudentId] = useState<string | null>(null);
  const [closeDate, setCloseDate] = useState(todayKey);
  const [closeReason, setCloseReason] = useState('');
  const [openDate, setOpenDate] = useState(todayKey);
  const [openNote, setOpenNote] = useState('');
  const [applyDates, setApplyDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!preset || studentId) return;
    const found = students.find((s) => s.enrollment_no.toUpperCase() === preset.toUpperCase());
    if (found) setStudentId(found.id);
  }, [preset, students, studentId]);

  const student = students.find((s) => s.id === studentId) ?? null;
  const state = student ? accounts.get(student.id) : undefined;
  const label = student ? diningLabel(student, state) : null;

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pending').sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [requests]
  );
  const decided = useMemo(
    () =>
      requests
        .filter((r) => r.status !== 'pending')
        .sort((a, b) => String(b.reviewed_at ?? b.created_at).localeCompare(String(a.reviewed_at ?? a.created_at)))
        .slice(0, 8),
    [requests]
  );
  const awaiting = extensions.filter((e) => e.status === 'awaiting_munshi');

  const run = async (key: string, work: () => Promise<string>) => {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      setMessage(await work());
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const closeDining = () =>
    student &&
    run('close', async () => {
      await DataService.setDiningStatus({
        student,
        kind: 'off',
        startDate: closeDate,
        reason: closeReason.trim() || 'Dining closed by Munshi'
      });
      setCloseReason('');
      return `Dining closed for ${student.name} from ${formatLongDate(closeDate)}. It stays off until you restart it.`;
    });

  const restartDining = () =>
    student &&
    run('open', async () => {
      await DataService.setDiningStatus({
        student,
        kind: 'on',
        startDate: openDate,
        reason: openNote.trim() || 'Dining restarted by Munshi'
      });
      setOpenNote('');
      return `Dining restarted for ${student.name} from ${formatLongDate(openDate)}.`;
    });

  return (
    <>
      <PageHeader
        title="Dining On / Off"
        subtitle="Close or restart a student's dining on any date, and answer the students' requests"
      />

      {message && (
        <div className="fade-enter flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Find the student</h2>
        <StudentPicker students={students} selectedId={studentId} onSelect={(s) => setStudentId(s?.id ?? null)} />

        {student && state && label && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50 p-2.5">
              <p className="text-[10px] font-semibold text-slate-500">Dining today</p>
              <div className="mt-1">
                <Pill tone={label.tone}>{label.text}</Pill>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-2.5">
              <p className="text-[10px] font-semibold text-slate-500">Balance</p>
              <p className="text-sm font-extrabold text-slate-900">
                {state.negativeDays > 0 ? `-${state.negativeDays}` : formatDays(state.wallet)} days
              </p>
            </div>
            <div className={`rounded-2xl p-2.5 ${state.pendingAmount > 0.005 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              <p className="text-[10px] font-semibold text-slate-600">Pending deficit</p>
              <p className="text-sm font-extrabold text-slate-900">{formatRupees(state.pendingAmount)}</p>
            </div>
          </div>
        )}
      </Card>

      {student && (
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <PowerOff className="h-4 w-4" />
                Close dining
              </h2>
              <p className="text-xs text-slate-500">
                Dining stays off from this date until you restart it. Any date works, including past days.
              </p>
            </div>
            <Label text="Off from">
              <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className={INPUT} />
            </Label>
            <Label text="Reason">
              <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="e.g. Gone home" className={INPUT} />
            </Label>
            <button
              type="button"
              onClick={closeDining}
              disabled={busy !== null || !closeDate}
              className="press inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
            >
              <PowerOff className="h-4 w-4" />
              {busy === 'close' ? 'Saving…' : 'Close dining'}
            </button>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <Power className="h-4 w-4" />
                Restart dining
              </h2>
              <p className="text-xs text-slate-500">Dining counts again from this date. Any date works.</p>
            </div>
            <Label text="Restart from">
              <input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} className={INPUT} />
            </Label>
            <Label text="Note (optional)">
              <input value={openNote} onChange={(e) => setOpenNote(e.target.value)} placeholder="e.g. Back from home" className={INPUT} />
            </Label>
            <button type="button" onClick={restartDining} disabled={busy !== null || !openDate} className={`${BTN_PRIMARY} w-full py-3`}>
              <Power className="h-4 w-4" />
              {busy === 'open' ? 'Saving…' : 'Restart dining'}
            </button>
          </Card>
        </div>
      )}

      {/* Requests from students */}
      <Card className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Requests from students ({pending.length} waiting)</h2>
          <p className="text-xs text-slate-500">Dining off and "open dining" requests</p>
        </div>

        {pending.length === 0 ? (
          <EmptyState>No requests waiting.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {r.student_name} <span className="font-mono text-xs font-semibold text-slate-500">· {r.enrollment_no}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <Pill tone={r.kind === 'off' ? 'amber' : 'emerald'}>{r.kind === 'off' ? 'Dining off' : 'Open dining'}</Pill>
                    from {formatLongDate(r.start_date)}
                  </p>
                  {r.reason && <p className="mt-1 text-[11px] text-slate-500">{r.reason}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`ok-${r.id}`, async () => {
                        await DataService.decideDiningRequest(r.id, 'approved');
                        return `${r.kind === 'off' ? 'Dining closed' : 'Dining opened'} for ${r.student_name}.`;
                      })
                    }
                    className="press rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`no-${r.id}`, async () => {
                        await DataService.decideDiningRequest(r.id, 'rejected');
                        return `Request from ${r.student_name} rejected.`;
                      })
                    }
                    className="press rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {decided.length > 0 && (
          <details className="rounded-2xl bg-slate-50 p-3 text-xs">
            <summary className="cursor-pointer font-bold text-slate-700">Recently decided ({decided.length})</summary>
            <ul className="mt-2 space-y-1.5">
              {decided.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                  <span>
                    {r.student_name} · {r.kind === 'off' ? 'off' : 'open'} from {formatLongDate(r.start_date)}
                  </span>
                  <Pill tone={r.status === 'approved' ? 'emerald' : 'rose'}>{r.status}</Pill>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {/* Provost approved extensions waiting for the Munshi */}
      <Card className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldPlus className="h-4 w-4 text-emerald-700" />
            Extensions approved by the Provost ({awaiting.length} to apply)
          </h2>
          <p className="text-xs text-slate-500">Apply it to let the student dine beyond -3 days</p>
        </div>

        {awaiting.length === 0 ? (
          <EmptyState>No extension is waiting.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {awaiting.map((e) => {
              const owner = byId.get(e.student_id);
              const date = applyDates[e.id] ?? todayKey;
              return (
                <li key={e.id} className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {e.student_name} <span className="font-mono text-xs font-semibold text-slate-500">· {e.enrollment_no}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      <b>+{e.extra_days} day{e.extra_days > 1 ? 's' : ''}</b> beyond -3 · approved by {e.approved_by || 'Provost'}
                    </p>
                    {e.note && <p className="mt-1 text-[11px] text-slate-500">{e.note}</p>}
                    {owner && accounts.get(owner.id) && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Now at -{accounts.get(owner.id)!.negativeDays} · pending {formatRupees(accounts.get(owner.id)!.pendingAmount)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(ev) => setApplyDates((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                      aria-label="Apply from"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy !== null || !date}
                      onClick={() =>
                        run(`ext-${e.id}`, async () => {
                          await DataService.applyGraceExtension(e.id, date);
                          return `Extension applied for ${e.student_name}: +${e.extra_days} days from ${formatLongDate(date)}.`;
                        })
                      }
                      className="press rounded-full bg-emerald-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`cx-${e.id}`, async () => {
                          await DataService.cancelGraceExtension(e.id);
                          return `Extension for ${e.student_name} cancelled.`;
                        })
                      }
                      className="press rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function MunshiDiningPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-400">Loading…</p>}>
      <DiningControl />
    </Suspense>
  );
}
