'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Save, UtensilsCrossed } from 'lucide-react';
import { DiningTiming, MealType, MenuItem } from '@/types';
import { DataService } from '@/lib/dataService';
import { BTN_PRIMARY, Card, INPUT, PageHeader } from '@/components/admin/ui';
import { MEALS, WEEKDAYS } from '@/components/student/MenuCard';

type MenuDraft = Record<string, string>; // "weekday:meal" -> items
type TimingDraft = Record<MealType, { start: string; end: string }>;

const keyOf = (weekday: number, meal: MealType) => `${weekday}:${meal}`;

const emptyTimings = (): TimingDraft => ({
  breakfast: { start: '', end: '' },
  lunch: { start: '', end: '' },
  dinner: { start: '', end: '' }
});

export default function MunshiMenuPage() {
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<MenuDraft>({});
  const [timings, setTimings] = useState<TimingDraft>(emptyTimings());
  const [day, setDay] = useState(() => new Date().getDay());
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingTimings, setSavingTimings] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([DataService.getMenu(), DataService.getTimings()]).then(([items, times]) => {
      const m: MenuDraft = {};
      items.forEach((i) => {
        m[keyOf(i.weekday, i.meal)] = i.items;
      });
      setMenu(m);
      const t = emptyTimings();
      times.forEach((x) => {
        t[x.meal] = { start: x.start_time, end: x.end_time };
      });
      setTimings(t);
      setLoading(false);
    });
  }, []);

  const flash = (text: string) => {
    setMessage(text);
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const saveMenu = async () => {
    setSavingMenu(true);
    setError('');
    try {
      const items: MenuItem[] = [];
      for (let weekday = 0; weekday < 7; weekday++) {
        MEALS.forEach(({ id }) => {
          items.push({ weekday, meal: id, items: (menu[keyOf(weekday, id)] ?? '').trim() });
        });
      }
      await DataService.saveMenu(items);
      flash('Menu saved. Students see it on their home screen.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the menu.');
    } finally {
      setSavingMenu(false);
    }
  };

  const saveTimings = async () => {
    setError('');
    const list: DiningTiming[] = [];
    for (const { id, label } of MEALS) {
      const t = timings[id];
      if (!t.start && !t.end) continue;
      if (!t.start || !t.end) return setError(`${label}: set both the start and the end time.`);
      if (t.end <= t.start) return setError(`${label}: the end time must be after the start time.`);
      list.push({ meal: id, start_time: t.start, end_time: t.end });
    }
    setSavingTimings(true);
    try {
      await DataService.saveTimings(list);
      flash('Timings saved. Students see them on their home screen.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the timings.');
    } finally {
      setSavingTimings(false);
    }
  };

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading menu…</p>;

  return (
    <>
      <PageHeader title="Menu & timings" subtitle="What you publish here appears on every student's home screen" />

      {message && (
        <div className="fade-enter flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Clock className="h-4 w-4 text-emerald-700" />
            Dining timings
          </h2>
          <p className="text-xs text-slate-500">Leave a meal empty if it is not served.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {MEALS.map(({ id, label }) => (
            <div key={id} className="rounded-2xl bg-slate-50 p-3.5">
              <p className="mb-2 text-xs font-bold text-slate-900">{label}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">From</span>
                  <input
                    type="time"
                    value={timings[id].start}
                    onChange={(e) => setTimings((prev) => ({ ...prev, [id]: { ...prev[id], start: e.target.value } }))}
                    className={INPUT}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-slate-500">To</span>
                  <input
                    type="time"
                    value={timings[id].end}
                    onChange={(e) => setTimings((prev) => ({ ...prev, [id]: { ...prev[id], end: e.target.value } }))}
                    className={INPUT}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={saveTimings} disabled={savingTimings} className={BTN_PRIMARY}>
          <Save className="h-4 w-4" />
          {savingTimings ? 'Saving…' : 'Save timings'}
        </button>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UtensilsCrossed className="h-4 w-4 text-emerald-700" />
            Weekly menu
          </h2>
          <p className="text-xs text-slate-500">Write the dishes for each meal. The same week repeats.</p>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {WEEKDAYS.map((name, d) => (
            <button
              key={name}
              type="button"
              onClick={() => setDay(d)}
              aria-pressed={day === d}
              className={`press shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                day === d ? 'bg-emerald-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200'
              }`}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {MEALS.map(({ id, label }) => (
            <label key={id} className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                {WEEKDAYS[day]} · {label}
              </span>
              <textarea
                rows={2}
                value={menu[keyOf(day, id)] ?? ''}
                onChange={(e) => setMenu((prev) => ({ ...prev, [keyOf(day, id)]: e.target.value }))}
                placeholder="e.g. Roti, Dal Fry, Rice, Salad"
                className={INPUT}
              />
            </label>
          ))}
        </div>

        <button type="button" onClick={saveMenu} disabled={savingMenu} className={BTN_PRIMARY}>
          <Save className="h-4 w-4" />
          {savingMenu ? 'Saving…' : 'Save menu for the whole week'}
        </button>
      </Card>
    </>
  );
}
