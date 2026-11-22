'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, RotateCcw, Save, Sparkles, Table as TableIcon, UtensilsCrossed } from 'lucide-react';
import { DiningTiming, MealType, MenuItem } from '@/types';
import { DataService } from '@/lib/dataService';
import { INITIAL_MENU, INITIAL_TIMINGS } from '@/lib/mockData';
import { BTN_PRIMARY, Card, INPUT, PageHeader } from '@/components/admin/ui';
import { MEALS, ORDERED_WEEKDAYS, WEEKDAYS } from '@/components/student/MenuCard';

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
  const [activeDay, setActiveDay] = useState(1); // Monday default
  const [editMode, setEditMode] = useState<'table' | 'day'>('table');
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
    setTimeout(() => setMessage(''), 3500);
  };

  const loadDefaultMenu = () => {
    if (
      !window.confirm(
        'Load the default Sir Shah Sulaiman Hall weekly menu?\n\nThis will fill in standard breakfast, lunch, and dinner dishes into the draft table below. Remember to click "Save menu" to publish it.'
      )
    ) {
      return;
    }
    const m: MenuDraft = {};
    INITIAL_MENU.forEach((i) => {
      m[keyOf(i.weekday, i.meal)] = i.items;
    });
    setMenu(m);

    const t = emptyTimings();
    INITIAL_TIMINGS.forEach((x) => {
      t[x.meal] = { start: x.start_time, end: x.end_time };
    });
    setTimings(t);

    flash('Default Breakfast, Lunch & Dinner menu loaded into editor. Click Save to publish.');
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
      flash('Weekly dining menu saved. All student and staff panels are updated.');
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
      list.push({ meal: id, start_time: t.start, end_time: t.end });
    }
    setSavingTimings(true);
    try {
      await DataService.saveTimings(list);
      flash('Dining timings saved. All panels updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the timings.');
    } finally {
      setSavingTimings(false);
    }
  };

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading menu…</p>;

  return (
    <>
      <PageHeader
        title="Menu & timings"
        subtitle="What you publish here appears in the official dining hall table on every student's dashboard"
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

      {/* Timings Section */}
      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Clock className="h-4 w-4 text-emerald-700" />
            Dining timings
          </h2>
          <p className="text-xs text-slate-500">Set meal timing ranges (Breakfast, Lunch, Dinner).</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {MEALS.map(({ id, label, sublabel, defaultTiming }) => (
            <div key={id} className="rounded-2xl bg-slate-50 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-serif text-xs font-bold text-slate-900">{label}</span>
                <span className="text-[10px] text-slate-500">{sublabel}</span>
              </div>
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
              <p className="mt-1.5 text-[10px] text-slate-400">Default: {defaultTiming}</p>
            </div>
          ))}
        </div>

        <button type="button" onClick={saveTimings} disabled={savingTimings} className={BTN_PRIMARY}>
          <Save className="h-4 w-4" />
          {savingTimings ? 'Saving…' : 'Save timings'}
        </button>
      </Card>

      {/* Weekly Menu Section */}
      <Card className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UtensilsCrossed className="h-4 w-4 text-emerald-700" />
              Weekly dining menu table
            </h2>
            <p className="text-xs text-slate-500">
              Matches the official Sir Shah Sulaiman Hall dining table format (Monday – Sunday).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadDefaultMenu}
              className="press inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              Load Default Menu
            </button>
            <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditMode('table')}
                className={`rounded-full px-3 py-1 transition-colors ${
                  editMode === 'table' ? 'bg-white font-bold text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setEditMode('day')}
                className={`rounded-full px-3 py-1 transition-colors ${
                  editMode === 'day' ? 'bg-white font-bold text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Day-by-Day
              </button>
            </div>
          </div>
        </div>

        {editMode === 'table' ? (
          /* Editable Full Weekly Dining Table */
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-900">
                  <th className="w-[16%] border-r border-slate-300 p-2.5 font-serif font-black uppercase">
                    DAYS
                  </th>
                  {MEALS.map((meal) => (
                    <th key={meal.id} className="w-[28%] border-r border-slate-300 p-2.5 last:border-r-0">
                      <div className="font-serif font-black uppercase text-slate-900">{meal.label}</div>
                      <div className="text-[10px] font-normal text-slate-500">{meal.sublabel}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ORDERED_WEEKDAYS.map(({ day, name }) => (
                  <tr key={day} className="hover:bg-slate-50/60">
                    <td className="border-r border-slate-200 bg-slate-50 p-2.5 font-serif font-black uppercase text-slate-900">
                      {name}
                    </td>
                    {MEALS.map((meal) => (
                      <td key={meal.id} className="border-r border-slate-200 p-1.5 last:border-r-0">
                        <textarea
                          rows={2}
                          value={menu[keyOf(day, meal.id)] ?? ''}
                          onChange={(e) =>
                            setMenu((prev) => ({ ...prev, [keyOf(day, meal.id)]: e.target.value }))
                          }
                          placeholder={`Dishes for ${name} ${meal.label.toLowerCase()}…`}
                          className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Day-by-Day Editor */
          <div className="space-y-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {ORDERED_WEEKDAYS.map(({ day, name }) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  aria-pressed={activeDay === day}
                  className={`press shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    activeDay === day ? 'bg-emerald-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {MEALS.map(({ id, label, sublabel }) => (
                <label key={id} className="block">
                  <span className="mb-1 flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>
                      {WEEKDAYS[activeDay]} · {label}
                    </span>
                    <span className="font-normal text-slate-400">{sublabel}</span>
                  </span>
                  <textarea
                    rows={2}
                    value={menu[keyOf(activeDay, id)] ?? ''}
                    onChange={(e) => setMenu((prev) => ({ ...prev, [keyOf(activeDay, id)]: e.target.value }))}
                    placeholder={`e.g. Dishes served on ${WEEKDAYS[activeDay]}`}
                    className={INPUT}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Changes will immediately update on all student dashboards and the dining hall register.
          </p>
          <button type="button" onClick={saveMenu} disabled={savingMenu} className={`${BTN_PRIMARY} px-6 py-3`}>
            <Save className="h-4 w-4" />
            {savingMenu ? 'Saving…' : 'Save menu for the whole week'}
          </button>
        </div>
      </Card>
    </>
  );
}
