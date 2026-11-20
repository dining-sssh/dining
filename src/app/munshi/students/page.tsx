'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, FileSpreadsheet, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { formatMoney } from '@/lib/billingUtils';
import { useProvostData } from '@/components/provost/ProvostData';
import { CsvUploadModal } from '@/components/csv/CsvUploadModal';
import { AddStudentModal } from '@/components/provost/AddStudentModal';
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
import { toDateKey } from '@/components/student/studentUtils';

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function exportCsv(students: Student[]) {
  const rows = students.map((s) =>
    [s.enrollment_no, s.name, s.house, s.room_no, s.course, s.email, s.previous_room || 'New Allotment'].map(csvCell).join(',')
  );
  const header = 'Enrollment Number,Name,House,Room Number,Course,Email,Previous room';
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

function MunshiStudentsView() {
  const { students, balanceByStudent, reload } = useProvostData();
  const params = useSearchParams();
  const initialHouse = params.get('house');

  const [query, setQuery] = useState('');
  const [house, setHouse] = useState(
    initialHouse && initialHouse in HOSTEL_HOUSES ? initialHouse : 'ALL'
  );
  const [csvOpen, setCsvOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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
    await DataService.deleteStudent(s.id);
    await reload();
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${filtered.length} of ${students.length} residents`}
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
                    <th className="p-3">House · Room</th>
                    <th className="p-3">Deficit</th>
                    <th className="p-3">Previous room</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => {
                    const balance = balanceByStudent.get(s.id) || 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-emerald-900">
                          <Link
                            href={`/munshi?en=${s.enrollment_no}`}
                            className="hover:underline hover:text-emerald-700"
                            title="Open dining ledger"
                          >
                            {s.enrollment_no}
                          </Link>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.course}</div>
                        </td>
                        <td className="p-3">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>
                            {s.house}
                          </span>
                          <span className="ml-2 font-bold text-slate-900">{s.room_no}</span>
                        </td>
                        <td className="p-3">
                          <Pill tone={balance > 0 ? 'rose' : 'emerald'}>
                            {balance > 0 ? formatMoney(balance) : balance < 0 ? `Advance ${formatMoney(-balance)}` : 'Cleared'}
                          </Pill>
                        </td>
                        <td className="p-3 text-slate-500">{s.previous_room || 'New allotment'}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/munshi/inspector?student=${s.id}`}
                              className="press rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
                              title="View as student"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => remove(s)}
                              className="press rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Remove student"
                            >
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
                const balance = balanceByStudent.get(s.id) || 0;
                return (
                  <li key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                        <p className="font-mono text-xs font-semibold text-emerald-900">{s.enrollment_no}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{s.course}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>
                          {s.house}
                        </span>
                        <p className="mt-1 text-sm font-extrabold text-slate-900">Room {s.room_no}</p>
                        <p className="text-[10px] text-slate-400">Prev: {s.previous_room || 'New Allotment'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Pill tone={balance > 0 ? 'rose' : 'emerald'}>
                        {balance > 0 ? `Deficit ${formatMoney(balance)}` : balance < 0 ? `Advance ${formatMoney(-balance)}` : 'Cleared'}
                      </Pill>
                      <div className="flex gap-1">
                        <Link
                          href={`/munshi/inspector?student=${s.id}`}
                          className="press rounded-full bg-white p-2.5 text-emerald-800 ring-1 ring-slate-200"
                          aria-label={`View ${s.name} as student`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(s)}
                          className="press rounded-full bg-white p-2.5 text-rose-600 ring-1 ring-slate-200"
                          aria-label={`Remove ${s.name}`}
                        >
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
