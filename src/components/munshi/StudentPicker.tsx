'use client';

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { HOSTEL_HOUSES, Student } from '@/types';
import { INPUT } from '../admin/ui';

interface StudentPickerProps {
  students: Student[];
  selectedId: string | null;
  onSelect: (student: Student | null) => void;
}

const MAX_RESULTS = 6;

/** Type an enrollment number, name or room and pick the student. */
export const StudentPicker: React.FC<StudentPickerProps> = ({ students, selectedId, onSelect }) => {
  const [query, setQuery] = useState('');
  const selected = students.find((s) => s.id === selectedId) ?? null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) =>
          s.enrollment_no.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          `${s.house}${s.room_no}`.toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS);
  }, [students, query]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-emerald-950">{selected.name}</p>
          <p className="truncate text-xs font-semibold text-emerald-900/80">
            <span className="font-mono">{selected.enrollment_no}</span> · {selected.house}
            {selected.room_no} · {selected.course}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery('');
          }}
          aria-label="Change student"
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
        <input
          type="search"
          autoComplete="off"
          placeholder="Enrollment no, name or room (e.g. GQ0103)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${INPUT} pl-10`}
          aria-label="Find student"
        />
      </div>

      {query.trim() && (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-xs text-slate-400">No student found.</li>
          ) : (
            results.map((s) => (
              <li key={s.id} className="border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-emerald-50"
                >
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-extrabold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>
                    {s.house}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{s.name}</span>
                    <span className="block truncate font-mono text-xs text-slate-500">
                      {s.enrollment_no} · Room {s.room_no}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
