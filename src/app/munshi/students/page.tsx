'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Pencil, Power, Printer, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { AccountState, formatDays, formatRupees, isDiningActive } from '@/lib/diningEngine';
import { useAdminData } from '@/components/admin/AdminData';
import { diningLabel } from '@/components/admin/studentStatus';
import { CsvUploadModal } from '@/components/csv/CsvUploadModal';
import { AddStudentModal } from '@/components/provost/AddStudentModal';
import { EditStudentModal } from '@/components/munshi/EditStudentModal';
import {
  BTN_ACCENT,
  BTN_GHOST,
  BTN_PRIMARY,
  Card,
  EmptyState,
  HouseChips,
  INPUT,
  PageHeader,
  Pill
} from '@/components/admin/ui';
import { formatLongDate, toDateKey } from '@/components/student/studentUtils';

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function exportCsv(students: Student[]) {
  const rows = students.map((s) =>
    [s.enrollment_no, s.name, s.house, s.room_no, s.course, s.email, s.previous_house || '', s.previous_room || 'New Allotment', s.remarks || '']
      .map(csvCell)
      .join(',')
  );
  const header = 'Enrollment Number,Name,House,Room Number,Course,Email,Previous hostel,Previous room,Remarks';
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `amu_dining_students_${toDateKey(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type StatusFilter = 'all' | 'active' | 'inactive';

function MunshiStudentsView() {
  const { students, accounts, activeCount, reload } = useAdminData();
  const params = useSearchParams();
  const initialHouse = params.get('house');

  const [query, setQuery] = useState('');
  const [house, setHouse] = useState(initialHouse && initialHouse in HOSTEL_HOUSES ? initialHouse : 'ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [csvOpen, setCsvOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [printing, setPrinting] = useState<'active' | 'inactive' | null>(null);
  const [error, setError] = useState('');

  const isActive = (s: Student) => s.status === 'active' && Boolean(accounts.get(s.id)) && isDiningActive(accounts.get(s.id)!);

  const counts = useMemo(() => {
    const c: Partial<Record<HostelHouseCode, number>> = {};
    students.forEach((s) => {
      c[s.house] = (c[s.house] || 0) + 1;
    });
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const match =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.enrollment_no.toLowerCase().includes(q) ||
        s.room_no.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q) ||
        (s.previous_room || '').toLowerCase().includes(q) ||
        (s.remarks || '').toLowerCase().includes(q);
      const active = s.status === 'active' && isDiningActive(accounts.get(s.id) ?? ({ status: 'off' } as AccountState));
      const statusOk = statusFilter === 'all' || (statusFilter === 'active' ? active : !active);
      return match && statusOk && (house === 'ALL' || s.house === house);
    });
  }, [students, accounts, query, house, statusFilter]);

  // Print: show the list, open the print dialog, then go back to the normal page.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 80);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  const printList = useMemo(() => {
    if (!printing) return [];
    return students
      .filter((s) => (printing === 'active' ? isActive(s) : !isActive(s)))
      .sort((a, b) => a.house.localeCompare(b.house) || a.room_no.localeCompare(b.room_no, undefined, { numeric: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing, students, accounts]);

  const remove = async (s: Student) => {
    if (!confirm(`Remove ${s.name} from the dining roster?`)) return;
    setError('');
    try {
      await DataService.deleteStudent(s.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the student.');
    }
  };

  return (
    <>
      <div className="space-y-5 print:hidden">
        <PageHeader
          title="Students"
          subtitle={`${filtered.length} shown of ${students.length} residents`}
          actions={
            <>
              <button type="button" onClick={() => setCsvOpen(true)} className={BTN_PRIMARY}>
                <Upload className="h-4 w-4" />
                Import CSV
              </button>
              <button type="button" onClick={() => setAddOpen(true)} className={BTN_ACCENT}>
                <UserPlus className="h-4 w-4" />
                Add student
              </button>
            </>
          }
        />

        {/* Live counter */}
        <div className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-[#0c5a41] via-[#0a4733] to-[#052e20] p-5 text-white shadow-lg shadow-emerald-900/25 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">Dining running today</p>
            <p className="mt-1 text-4xl font-black leading-none">
              {activeCount}
              <span className="text-2xl font-bold text-emerald-300"> / {students.length}</span>
              <span className="ml-2 text-base font-semibold text-emerald-200">Active Dining</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPrinting('active')}
              className="press inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-emerald-950 shadow-sm sm:text-sm"
            >
              <Printer className="h-4 w-4" />
              Print active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setPrinting('inactive')}
              className="press inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/30 sm:text-sm"
            >
              <Printer className="h-4 w-4" />
              Print inactive ({students.length - activeCount})
            </button>
          </div>
        </div>

        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
              <input
                type="search"
                placeholder="Search enrollment no, name, room, course, remarks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${INPUT} pl-10`}
              />
            </div>
            <button type="button" onClick={() => exportCsv(filtered)} className={BTN_GHOST}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              Export CSV
            </button>
          </div>

          <HouseChips value={house} onChange={setHouse} counts={counts} />

          <div className="grid max-w-sm grid-cols-3 rounded-full bg-slate-200/70 p-1 text-xs font-bold">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                aria-pressed={statusFilter === f}
                className={`press rounded-full py-2 capitalize transition-colors ${
                  statusFilter === f ? 'bg-white text-emerald-950 shadow' : 'text-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState>No students match your search.</EmptyState>
          ) : (
            <>
              {/* Laptop: table */}
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-3">Enrollment</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Hostel · Room</th>
                      <th className="p-3">Dining</th>
                      <th className="p-3">Balance</th>
                      <th className="p-3">Pending deficit</th>
                      <th className="p-3">Previous</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((s) => {
                      const state = accounts.get(s.id);
                      const label = diningLabel(s, state);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-emerald-900">
                            <Link href={`/munshi?en=${s.enrollment_no}`} className="hover:text-emerald-700 hover:underline" title="Open dining ledger">
                              {s.enrollment_no}
                            </Link>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{s.name}</div>
                            <div className="text-[11px] text-slate-500">{s.course}</div>
                            {s.remarks && <div className="mt-0.5 max-w-[14rem] truncate text-[11px] italic text-slate-400" title={s.remarks}>{s.remarks}</div>}
                          </td>
                          <td className="p-3">
                            <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>{s.house}</span>
                            <span className="ml-2 font-bold text-slate-900">{s.room_no}</span>
                          </td>
                          <td className="p-3"><Pill tone={label.tone}>{label.text}</Pill></td>
                          <td className="p-3 font-bold text-slate-900">
                            {state ? (state.negativeDays > 0 ? `-${state.negativeDays}` : formatDays(state.wallet)) : '—'} d
                          </td>
                          <td className="p-3">
                            <Pill tone={state && state.pendingAmount > 0.005 ? 'rose' : 'emerald'}>
                              {state && state.pendingAmount > 0.005 ? formatRupees(state.pendingAmount) : 'None'}
                            </Pill>
                          </td>
                          <td className="p-3 text-slate-500">
                            {s.previous_house ? `${s.previous_house} · ` : ''}
                            {s.previous_room || 'New allotment'}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <Link href={`/munshi/dining?en=${s.enrollment_no}`} className="press rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800" title="Close or restart dining">
                                <Power className="h-4 w-4" />
                              </Link>
                              <button type="button" onClick={() => setEditing(s)} className="press rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800" title="Edit email and details">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => remove(s)} className="press rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove student">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phone: cards */}
              <ul className="space-y-3 md:hidden">
                {filtered.map((s) => {
                  const state = accounts.get(s.id);
                  const label = diningLabel(s, state);
                  return (
                    <li key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                          <Link href={`/munshi?en=${s.enrollment_no}`} className="font-mono text-xs font-semibold text-emerald-900 underline-offset-2 hover:underline">
                            {s.enrollment_no}
                          </Link>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">{s.course}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>{s.house}</span>
                          <p className="mt-1 text-sm font-extrabold text-slate-900">Room {s.room_no}</p>
                        </div>
                      </div>
                      {s.remarks && <p className="mt-2 text-[11px] italic text-slate-500">{s.remarks}</p>}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Pill tone={label.tone}>{label.text}</Pill>
                          <Pill tone={state && state.pendingAmount > 0.005 ? 'rose' : 'emerald'}>
                            {state && state.pendingAmount > 0.005 ? `Deficit ${formatRupees(state.pendingAmount)}` : 'No deficit'}
                          </Pill>
                        </div>
                        <div className="flex gap-1">
                          <Link href={`/munshi/dining?en=${s.enrollment_no}`} className="press rounded-full bg-white p-2.5 text-emerald-800 ring-1 ring-slate-200" aria-label={`Close or restart dining for ${s.name}`}>
                            <Power className="h-4 w-4" />
                          </Link>
                          <button type="button" onClick={() => setEditing(s)} className="press rounded-full bg-white p-2.5 text-slate-600 ring-1 ring-slate-200" aria-label={`Edit ${s.name}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => remove(s)} className="press rounded-full bg-white p-2.5 text-rose-600 ring-1 ring-slate-200" aria-label={`Remove ${s.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <CsvUploadModal
          isOpen={csvOpen}
          onClose={() => setCsvOpen(false)}
          onSuccess={() => {
            setCsvOpen(false);
            reload();
          }}
        />
        <AddStudentModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => reload()} />
        <EditStudentModal student={editing} onClose={() => setEditing(null)} onSaved={() => reload()} />
      </div>

      {/* Printable list. Active and inactive lists use exactly the same table. */}
      {printing && (
        <div className="hidden print:block">
          <h1 className="text-lg font-bold">
            {printing === 'active' ? 'Active students' : 'Inactive students'} · Sulaiman Hall Dining
          </h1>
          <p className="mb-3 text-xs">
            {formatLongDate(toDateKey(new Date()))} · {printList.length} students
          </p>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {['S.No', 'En. No.', 'Name', 'Course', 'Hostel · Room', 'Previous hostel', 'Remarks', 'Dining'].map((h) => (
                  <th key={h} className="border border-black px-1.5 py-1 text-left font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {printList.map((s, i) => (
                <tr key={s.id}>
                  <td className="border border-black px-1.5 py-1">{i + 1}</td>
                  <td className="border border-black px-1.5 py-1 font-mono">{s.enrollment_no}</td>
                  <td className="border border-black px-1.5 py-1">{s.name}</td>
                  <td className="border border-black px-1.5 py-1">{s.course}</td>
                  <td className="border border-black px-1.5 py-1">
                    {s.house} {s.room_no}
                  </td>
                  <td className="border border-black px-1.5 py-1">
                    {[s.previous_house, s.previous_room].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="border border-black px-1.5 py-1">{s.remarks || ''}</td>
                  <td className="border border-black px-1.5 py-1">{diningLabel(s, accounts.get(s.id)).text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function MunshiStudentsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-400">Loading students…</p>}>
      <MunshiStudentsView />
    </Suspense>
  );
}
