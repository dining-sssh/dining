'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Save,
  Search,
  Users,
  X
} from 'lucide-react';
import { DiningDailyRecord, HOSTEL_HOUSES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';
import {
  BTN_GHOST,
  BTN_PRIMARY,
  Card,
  EmptyState,
  HouseChips,
  INPUT,
  PageHeader,
  StatCard
} from '@/components/admin/ui';
import { addDays, formatLongDate, isEaten, toDateKey } from '@/components/student/studentUtils';

type RecordMap = Record<string, DiningDailyRecord>;

const blankRecord = (s: Student, date: string): DiningDailyRecord => ({
  id: `rec-${s.id}-${date}`,
  student_id: s.id,
  enrollment_no: s.enrollment_no,
  date,
  eaten: true,
  lunch: true,
  dinner: true,
  is_rebate: false,
  guest_diets: 0,
  marked_by: 'Munshi'
});

export default function MunshiRegisterPage() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(todayKey);
  const [records, setRecords] = useState<RecordMap>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [query, setQuery] = useState('');
  const [house, setHouse] = useState('ALL');

  useEffect(() => {
    DataService.getStudents().then(setStudents);
  }, []);

  // Load the register for the chosen day.
  useEffect(() => {
    if (students.length === 0) return;
    let cancelled = false;
    DataService.getDailyRecordsForDate(date).then((dayRecords) => {
      if (cancelled) return;
      const map: RecordMap = {};
      students.forEach((s) => {
        const found = dayRecords.find((r) => r.student_id === s.id);
        map[s.id] = found ? { ...found } : blankRecord(s, date);
      });
      setRecords(map);
      setDirty(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date, students]);

  const patch = useCallback((studentId: string, change: (r: DiningDailyRecord) => DiningDailyRecord) => {
    setRecords((prev) => (prev[studentId] ? { ...prev, [studentId]: change(prev[studentId]) } : prev));
    setDirty(true);
  }, []);

  const toggleEaten = (id: string) =>
    patch(id, (r) => {
      const next = !isEaten(r);
      return { ...r, eaten: next, lunch: next, dinner: next, is_rebate: false, rebate_reason: undefined };
    });

  const toggleRebate = (id: string) =>
    patch(id, (r) => {
      const off = !r.is_rebate;
      return {
        ...r,
        is_rebate: off,
        eaten: !off,
        lunch: !off,
        dinner: !off,
        rebate_reason: off ? 'Official Mess Off / Rebate' : undefined
      };
    });

  const changeGuests = (id: string, delta: number) =>
    patch(id, (r) => ({ ...r, guest_diets: Math.max(0, (r.guest_diets || 0) + delta) }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const match =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.enrollment_no.toLowerCase().includes(q) ||
        s.room_no.toLowerCase().includes(q) ||
        (s.previous_room || '').toLowerCase().includes(q);
      return match && (house === 'ALL' || s.house === house);
    });
  }, [students, query, house]);

  const houseCounts = useMemo(() => {
    const c: Partial<Record<HostelHouseCode, number>> = {};
    students.forEach((s) => {
      c[s.house] = (c[s.house] || 0) + 1;
    });
    return c;
  }, [students]);

  // Applies to the students currently shown (so a house filter marks only that house).
  const markShown = (eaten: boolean) => {
    const ids = new Set(filtered.map((s) => s.id));
    setRecords((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        const r = next[id];
        if (r && !r.is_rebate) next[id] = { ...r, eaten, lunch: eaten, dinner: eaten };
      });
      return next;
    });
    setDirty(true);
  };

  const stats = useMemo(() => {
    const list = Object.values(records);
    return {
      eaten: list.filter(isEaten).length,
      notEaten: list.filter((r) => !r.is_rebate && !isEaten(r)).length,
      rebate: list.filter((r) => r.is_rebate).length,
      guests: list.reduce((acc, r) => acc + (r.guest_diets || 0), 0)
    };
  }, [records]);

  const goToDate = (next: string) => {
    if (next === date || !next) return;
    if (dirty && !confirm('You have unsaved changes for this day. Leave without saving?')) return;
    setDate(next);
  };

  const save = async () => {
    setSaving(true);
    await DataService.updateDailyRecords(Object.values(records));
    setSaving(false);
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  const percent = students.length ? Math.round((stats.eaten / students.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Daily Register"
        subtitle={formatLongDate(date)}
        actions={
          <button type="button" onClick={save} disabled={saving || !dirty} className={BTN_PRIMARY}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save register'}
          </button>
        }
      />

      {savedFlash && (
        <div className="fade-enter flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Register for {formatLongDate(date)} saved.
        </div>
      )}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goToDate(addDays(date, -1))}
            aria-label="Previous day"
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <label className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
            <CalendarDays className="h-4 w-4 text-emerald-700" />
            <input
              type="date"
              value={date}
              onChange={(e) => goToDate(e.target.value)}
              className="bg-transparent text-base font-bold text-slate-900 focus:outline-none sm:text-sm"
              aria-label="Register date"
            />
          </label>

          <button
            type="button"
            onClick={() => goToDate(addDays(date, 1))}
            aria-label="Next day"
            className="press flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {date !== todayKey && (
            <button type="button" onClick={() => goToDate(todayKey)} className={BTN_GHOST}>
              Today
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Eaten" value={stats.eaten} hint={`${percent}% of residents`} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Not eaten" value={stats.notEaten} hint="Absent from dining" icon={X} tone="rose" />
          <StatCard label="Mess off" value={stats.rebate} hint="Approved leave" icon={AlertCircle} tone="amber" />
          <StatCard label="Guest diets" value={stats.guests} hint="Extra meals booked" icon={Users} tone="slate" />
        </div>
      </Card>

      <Card className="space-y-4 !p-0 sm:!p-0">
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-emerald-700" />
              <input
                type="search"
                placeholder="Search enrollment no, name or room"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${INPUT} pl-10`}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => markShown(true)} className={`${BTN_GHOST} flex-1 sm:flex-none`}>
                <Check className="h-4 w-4 text-emerald-700" />
                All eaten
              </button>
              <button type="button" onClick={() => markShown(false)} className={`${BTN_GHOST} flex-1 sm:flex-none`}>
                <X className="h-4 w-4 text-rose-600" />
                All not eaten
              </button>
            </div>
          </div>
          <HouseChips value={house} onChange={setHouse} counts={houseCounts} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState>No students match.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {filtered.map((s) => {
              const rec = records[s.id];
              if (!rec) return null;
              const eaten = isEaten(rec);
              return (
                <li
                  key={s.id}
                  className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                    rec.is_rebate ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                      <span className={`rounded px-1 text-[10px] font-extrabold ${HOSTEL_HOUSES[s.house]?.color ?? ''}`}>
                        {s.house}
                      </span>
                      <span className="text-sm font-extrabold leading-tight text-slate-900">{s.room_no}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                      <p className="truncate font-mono text-xs font-semibold text-slate-500">{s.enrollment_no}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={rec.is_rebate}
                      onClick={() => toggleEaten(s.id)}
                      aria-pressed={eaten}
                      className={`press inline-flex h-11 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold shadow-sm transition-colors ${
                        rec.is_rebate
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : eaten
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                      }`}
                    >
                      {eaten ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {rec.is_rebate ? 'Mess off' : eaten ? 'Eaten' : 'Not eaten'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRebate(s.id)}
                      aria-pressed={rec.is_rebate}
                      className={`press inline-flex h-11 items-center justify-center rounded-full px-4 text-xs font-bold transition-colors ${
                        rec.is_rebate ? 'bg-amber-400 text-emerald-950 shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {rec.is_rebate ? 'On rebate' : 'Rebate'}
                    </button>

                    <div className="inline-flex h-11 items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-300">
                      <button
                        type="button"
                        onClick={() => changeGuests(s.id, -1)}
                        aria-label={`Remove a guest diet for ${s.name}`}
                        className="press flex h-full w-10 items-center justify-center text-slate-600 active:bg-slate-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-6 text-center font-mono text-sm font-bold text-slate-900" aria-label="Guest diets">
                        {rec.guest_diets || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeGuests(s.id, 1)}
                        aria-label={`Add a guest diet for ${s.name}`}
                        className="press flex h-full w-10 items-center justify-center text-slate-600 active:bg-slate-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Appears as soon as something changes, so the Munshi never forgets to save */}
      {dirty && (
        <div className="no-print fade-enter fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-full bg-emerald-950 py-2 pl-5 pr-2 text-white shadow-xl lg:left-[calc(50%+8rem)]">
          <span className="text-xs font-semibold">Unsaved changes</span>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="press rounded-full bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-emerald-950 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save register'}
          </button>
        </div>
      )}
    </>
  );
}
