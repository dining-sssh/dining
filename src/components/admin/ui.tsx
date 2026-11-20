'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode } from '@/types';

/** One background layer (no blur, no rotated blobs): cheap to paint, same look as the student app. */
export const PAGE_BACKGROUND =
  'radial-gradient(circle at 100% 0%, rgba(4,120,87,0.22) 0, transparent 34%), ' +
  'radial-gradient(circle at 0% 100%, rgba(4,120,87,0.14) 0, transparent 38%), ' +
  'linear-gradient(to bottom, #f4f9f6, #e5efe9)';

/** text-base on phones stops iOS from zooming into a focused field. */
export const INPUT =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm';

export const BTN_PRIMARY =
  'press inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 sm:text-sm';
export const BTN_ACCENT =
  'press inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-bold text-emerald-950 shadow-sm sm:text-sm';
export const BTN_GHOST =
  'press inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 sm:text-sm';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-xl font-extrabold tracking-tight text-emerald-950 sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <section className={`rounded-3xl border border-white bg-white p-4 shadow-lg shadow-emerald-950/5 sm:p-5 ${className}`}>
    {children}
  </section>
);

export type Tone = 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';

const TONES: Record<Tone, { card: string; icon: string; value: string }> = {
  emerald: { card: 'bg-emerald-50 border-emerald-200', icon: 'bg-emerald-100 text-emerald-800', value: 'text-emerald-950' },
  amber: { card: 'bg-amber-50 border-amber-200', icon: 'bg-amber-100 text-amber-800', value: 'text-amber-950' },
  rose: { card: 'bg-rose-50 border-rose-200', icon: 'bg-rose-100 text-rose-800', value: 'text-rose-950' },
  sky: { card: 'bg-sky-50 border-sky-200', icon: 'bg-sky-100 text-sky-800', value: 'text-sky-950' },
  slate: { card: 'bg-white border-slate-200', icon: 'bg-slate-100 text-slate-700', value: 'text-slate-900' }
};

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}> = ({ label, value, hint, icon: Icon, tone = 'slate' }) => {
  const t = TONES[tone];
  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 ${t.card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className={`mt-2 text-2xl font-black leading-none sm:text-3xl ${t.value}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] font-medium text-slate-500">{hint}</div>}
    </div>
  );
};

const PILL: Record<Tone, string> = {
  emerald: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-800',
  sky: 'bg-sky-100 text-sky-800',
  slate: 'bg-slate-100 text-slate-700'
};

export const Pill: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'slate', children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PILL[tone]}`}>
    {children}
  </span>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="py-10 text-center text-xs text-slate-400 sm:text-sm">{children}</p>
);

/** Scrollable row of house filter chips: All, HM, BH, QH, KH, AK, MB. */
export const HouseChips: React.FC<{
  value: string;
  onChange: (value: string) => void;
  counts?: Partial<Record<HostelHouseCode, number>>;
}> = ({ value, onChange, counts }) => {
  const items: Array<{ code: string; label: string }> = [
    { code: 'ALL', label: 'All' },
    ...(Object.keys(HOSTEL_HOUSES) as HostelHouseCode[]).map((c) => ({ code: c, label: c }))
  ];
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((it) => {
        const on = value === it.code;
        const count = it.code === 'ALL' ? undefined : counts?.[it.code as HostelHouseCode];
        return (
          <button
            key={it.code}
            type="button"
            onClick={() => onChange(on && it.code !== 'ALL' ? 'ALL' : it.code)}
            aria-pressed={on}
            title={it.code === 'ALL' ? 'All houses' : HOSTEL_HOUSES[it.code as HostelHouseCode].name}
            className={`press shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
              on ? 'bg-emerald-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            {it.label}
            {count !== undefined && <span className={`ml-1.5 ${on ? 'text-emerald-200' : 'text-slate-400'}`}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
