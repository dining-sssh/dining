'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { formatDays, formatRupees } from '@/lib/diningEngine';
import { useAdminData } from '@/components/admin/AdminData';
import { diningLabel } from '@/components/admin/studentStatus';
import { CsvUploadModal } from '@/components/csv/CsvUploadModal';
import { AddStudentModal } from '@/components/provost/AddStudentModal';
import { BTN_ACCENT, BTN_GHOST, BTN_PRIMARY, Card, EmptyState, HouseChips, INPUT, PageHeader, Pill } from '@/components/admin/ui';
import { toDateKey } from '@/components/student/studentUtils';

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

function StudentsView() {
  const { students, accounts, activeCount, reload } = useAdminData();
  const params = useSearchParams();
  const initialHouse = params.get('house');

  const [query, setQuery] = useState('');
  const [house, setHouse] = useState(initialHouse && initialHouse in HOSTEL_HOUSES ? initialHouse : 'ALL');
  const [csvOpen, setCsvOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');

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
        (s.previous_room || '').toLowerCase().includes(q);
      return match && (house === 'ALL' || s.house === house);
    });
  }, [students, query, house]);

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
      <PageHeader
        title="Students"
        subtitle={`${filtered.length} shown of ${students.length} residents · ${activeCount} with dining running`}
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

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
            <input
              type="search"
              placeholder="Search enrollment no, name, room, course"
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
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => {
                    const state = accounts.get(s.id);
                    const label = diningLabel(s, state);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-emerald-900">{s.enrollment_no}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.course}</div>
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
                        <td className="p-3">
                          <div className="flex justify-end">
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
                        <p className="font-mono text-xs font-semibold text-emerald-900">{s.enrollment_no}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{s.course}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>{s.house}</span>
                        <p className="mt-1 text-sm font-extrabold text-slate-900">Room {s.room_no}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Pill tone={label.tone}>{label.text}</Pill>
                        <Pill tone={state && state.pendingAmount > 0.005 ? 'rose' : 'emerald'}>
                          {state && state.pendingAmount > 0.005 ? `Deficit ${formatRupees(state.pendingAmount)}` : 'No deficit'}
                        </Pill>
                      </div>
                      <button type="button" onClick={() => remove(s)} className="press rounded-full bg-white p-2.5 text-rose-600 ring-1 ring-slate-200" aria-label={`Remove ${s.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
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
    </>
  );
}

export default function ProvostStudentsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-slate-400">Loading students…</p>}>
      <StudentsView />
    </Suspense>
  );
}
