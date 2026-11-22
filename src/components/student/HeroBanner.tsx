'use client';

import React from 'react';
import { Check, X, UtensilsCrossed, CalendarDays, Clock3, Info, AlertTriangle, Sun } from 'lucide-react';
import { formatDays } from '@/lib/diningEngine';
import { HeroState, formatLongDate, formatInDays } from './studentUtils';

const CampusSilhouette: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 120 80" className={className} fill="currentColor" aria-hidden="true">
    <rect x="8" y="54" width="104" height="26" />
    <path d="M40 54 C40 28 80 28 80 54 Z" />
    <rect x="58.5" y="18" width="3" height="12" />
    <rect x="18" y="26" width="9" height="28" />
    <path d="M18 26 C18 14 27 14 27 26 Z" />
    <rect x="93" y="26" width="9" height="28" />
    <path d="M93 26 C93 14 102 14 102 26 Z" />
  </svg>
);

interface HeroBannerProps {
  hero: HeroState;
}

const DARK: Record<'active' | 'grace' | 'stopped', { bg: string; ring: string; word: string }> = {
  active: {
    bg: 'bg-gradient-to-br from-[#0c5a41] via-[#0a4733] to-[#052e20] shadow-emerald-900/25',
    ring: 'border-emerald-400/90 text-emerald-300',
    word: 'text-emerald-300'
  },
  grace: {
    bg: 'bg-gradient-to-br from-[#9a4a0a] via-[#7c3a08] to-[#4a2205] shadow-amber-900/25',
    ring: 'border-amber-300/90 text-amber-200',
    word: 'text-amber-200'
  },
  stopped: {
    bg: 'bg-gradient-to-br from-[#7f1d1d] via-[#651a1a] to-[#3f0d0d] shadow-rose-900/25',
    ring: 'border-rose-400/90 text-rose-300',
    word: 'text-rose-300'
  }
};

export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({ hero }) => {
  if (hero.kind === 'off') {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-300 p-5 shadow-lg shadow-amber-900/10 ring-1 ring-amber-400/40">
        <CampusSilhouette className="pointer-events-none absolute -bottom-2 right-2 h-24 w-32 text-amber-700/15" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/70 text-rose-600 shadow-inner ring-2 ring-white/80">
            <UtensilsCrossed className="h-8 w-8" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold leading-tight text-slate-900">Dining Off</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {hero.offSince ? `Closed since ${formatLongDate(hero.offSince)}` : 'Dining is closed'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hero.kind === 'break') {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 p-5 text-white shadow-lg shadow-slate-900/20">
        <CampusSilhouette className="pointer-events-none absolute -bottom-3 right-1 h-28 w-36 text-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-slate-300/80 text-slate-200">
            <Sun className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold leading-tight">Vacation</h2>
            <p className="mt-0.5 text-xs font-medium text-white/75">The dining year runs August to May. No charges in June and July.</p>
          </div>
        </div>
      </div>
    );
  }

  const style = DARK[hero.kind];
  const title = hero.kind === 'active' ? 'Active' : hero.kind === 'grace' ? 'On Grace' : 'Stopped';
  const subtitle =
    hero.kind === 'active'
      ? `${formatDays(hero.balanceDays)} day${hero.balanceDays === 1 ? '' : 's'} of dining left`
      : hero.kind === 'grace'
      ? `Balance -${hero.negativeDays} of -${hero.graceLimit}. Dining stops at -${hero.graceLimit}`
      : 'Grace days are used up. Deposit to start again';

  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg ${style.bg}`}>
      <CampusSilhouette className="pointer-events-none absolute -bottom-3 right-1 h-28 w-36 text-white/10" />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${style.ring}`}>
          {hero.kind === 'active' ? (
            <Check className="h-8 w-8" strokeWidth={3.2} />
          ) : hero.kind === 'grace' ? (
            <AlertTriangle className="h-8 w-8" strokeWidth={2.6} />
          ) : (
            <X className="h-8 w-8" strokeWidth={3.2} />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold leading-none text-white/95">Dining</p>
          <h2 className={`text-3xl font-extrabold leading-tight ${style.word}`}>{title}</h2>
          <p className="mt-0.5 text-xs font-medium text-white/80">{subtitle}</p>
        </div>
      </div>
    </div>
  );
});
HeroBanner.displayName = 'HeroBanner';

interface DiningInfoStripProps {
  hero: HeroState;
}

export const DiningInfoStrip: React.FC<DiningInfoStripProps> = React.memo(({ hero }) => {
  const isOff = hero.kind === 'off';
  const isStopped = hero.kind === 'stopped';

  const nextLabel = isOff ? 'Resumes' : 'Next Dining';
  const nextValue = isOff
    ? hero.resumeInDays !== null
      ? formatInDays(hero.resumeInDays)
      : 'Ask to open'
    : isStopped
    ? 'After deposit'
    : hero.nextDiningInDays !== null
    ? formatInDays(hero.nextDiningInDays)
    : '—';

  return (
    <div className="space-y-3">
      <div
        className={`grid grid-cols-2 divide-x divide-emerald-900/10 overflow-hidden rounded-2xl border ${
          isStopped ? 'border-slate-200 bg-slate-100/80' : 'border-emerald-900/10 bg-emerald-50/80'
        }`}
      >
        <div className="flex items-center gap-3 p-3.5">
          <CalendarDays className="h-6 w-6 shrink-0 text-emerald-800" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Last Dining</p>
            <p className="truncate text-[13px] font-bold text-slate-900">
              {hero.lastDiningKey ? formatLongDate(hero.lastDiningKey) : 'No record yet'}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 p-3.5 ${isStopped ? 'bg-rose-50' : ''}`}>
          <Clock3 className={`h-6 w-6 shrink-0 ${isStopped ? 'text-rose-700' : 'text-emerald-800'}`} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">{nextLabel}</p>
            <p className="truncate text-[13px] font-bold text-slate-900">{nextValue}</p>
          </div>
        </div>
      </div>

      {isOff && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-50/80 p-3.5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
          <p className="text-xs font-medium text-slate-700">
            Dining stays off until it is opened again. Use <b>Request to open dining</b> when you are back.
          </p>
        </div>
      )}
    </div>
  );
});
DiningInfoStrip.displayName = 'DiningInfoStrip';
