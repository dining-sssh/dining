'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer, Search } from 'lucide-react';
import { DiningDailyRecord, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import { BTN_GHOST, Card, EmptyState, HouseChips, INPUT, PageHeader } from '@/components/admin/ui';
import { isEaten, monthLabel, shiftMonth, toDateKey } from '@/components/student/studentUtils';

const CELL: Record<string, string> = {
  E: 'bg-emerald-600 text-white',
  NE: 'bg-rose-200 text-rose-900',
  R: 'bg-amber-400 text-emerald-950',
  '·': 'bg-slate-100 text-slate-400',
  '–': 'bg-white text-slate-300 ring-1 ring-slate-200'
};

export default function MunshiMatrixPage() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<DiningDailyRecord[]>([]);
  const [query, setQuery] = useState('');
  const [house, setHouse] = useState('ALL');

  useEffect(() => {
    Promise.all([DataService.getStudents(), DataService.getAllDailyRecords()]).then(([st, rec]) => {
      setStudents(st);
      setRecords(rec);
    });
  }, []);

  const byKey = useMemo(() => {
    const m = new Map<string, DiningDailyRecord>();
    records.forEach((r) => m.set(`${r.student_id}_${r.date}`, r));
    return m;
  }, [records]);

  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const houseCounts = useMemo(() => {
    const c: Partial<Record<HostelHouseCode, number>> = {};
    students.forEach((s) => {
      c[s.house] = (c[s.house] || 0) + 1;
    });
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const match = !q || s.name.toLowerCase().includes(q) || s.enrollment_no.toLowerCase().includes(q) || s.room_no.toLowerCase().includes(q);
      return match && (house === 'ALL' || s.house === house);
    });
  }, [students, query, house]);

  return (
    <>
      <PageHeader
        title="Month Matrix"
        subtitle="E eaten · NE not eaten · R rebate · – no entry · · upcoming"
        actions={
          <button type="button" onClick={() => window.print()} className={BTN_GHOST}>
            <Printer className="h-4 w-4 text-emerald-700" />
            Print
          </button>
        }
      />

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="no-print flex items-center gap-1 self-start rounded-full bg-white px-1 py-1 ring-1 ring-slate-200">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
              className="press flex h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[9rem] text-center text-sm font-bold text-slate-900">{monthLabel(monthKey)}</span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
              className="press flex h-9 w-9 items-center justify-center rounded-full active:bg-slate-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="no-print relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
            <input
              type="search"
              placeholder="Search enrollment no, name or room"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${INPUT} pl-10`}
            />
          </div>
        </div>

        <div className="no-print">
          <HouseChips value={house} onChange={setHouse} counts={houseCounts} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState>No students match.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-center text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="sticky left-0 z-10 min-w-40 border-r border-slate-200 bg-slate-50 p-2 text-left">Student</th>
                  {days.map((d) => (
                    <th key={d} className="min-w-8 p-1 text-[11px]">
                      {d}
                    </th>
                  ))}
                  <th className="min-w-20 border-l border-slate-200 bg-emerald-50 p-2 text-emerald-950">Eaten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  let eaten = 0;
                  const cells = days.map((d) => {
                    const dateKey = `${monthKey}-${String(d).padStart(2, '0')}`;
                    const rec = byKey.get(`${s.id}_${dateKey}`);
                    let code = '–';
                    if (dateKey > todayKey) code = '·';
                    else if (rec) {
                      if (rec.is_rebate) code = 'R';
                      else if (isEaten(rec)) {
                        code = 'E';
                        eaten += 1;
                      } else code = 'NE';
                    }
                    return (
                      <td key={d} className="p-0.5">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded font-mono text-[10px] font-bold ${CELL[code]}`}>
                          {code}
                        </span>
                      </td>
                    );
                  });

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white p-2 text-left">
                        <div className="max-w-36 truncate font-bold text-slate-900">{s.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {s.enrollment_no} · {s.house}-{s.room_no}
                        </div>
                      </td>
                      {cells}
                      <td className="border-l border-slate-200 bg-emerald-50 p-2 font-mono text-sm font-extrabold text-emerald-950">
                        {eaten}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
