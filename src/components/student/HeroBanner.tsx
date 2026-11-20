'use client';

import React from 'react';
import { Check, X, UtensilsCrossed, CalendarDays, Clock3, Info } from 'lucide-react';
import { HeroState, formatLongDate, formatDayMonth, formatInDays } from './studentUtils';

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
            <p className="mt-0.5 text-sm font-medium text-slate-700">Dining will resume soon</p>
          </div>
        </div>
      </div>
    );
  }

  const active = hero.kind === 'active';

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-lg ${
        active
          ? 'bg-gradient-to-br from-[#0c5a41] via-[#0a4733] to-[#052e20] shadow-emerald-900/25'
          : 'bg-gradient-to-br from-[#7f1d1d] via-[#651a1a] to-[#3f0d0d] shadow-rose-900/25'
      }`}
    >
      <CampusSilhouette className="pointer-events-none absolute -bottom-3 right-1 h-28 w-36 text-white/10" />
      <div className="relative flex items-center gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${
            active ? 'border-emerald-400/90 text-emerald-300' : 'border-rose-400/90 text-rose-300'
          }`}
        >
          {active ? <Check className="h-8 w-8" strokeWidth={3.2} /> : <X className="h-8 w-8" strokeWidth={3.2} />}
        </div>
        <div>
          <p className="text-lg font-semibold leading-none text-white/95">Dining</p>
          <h2 className={`text-3xl font-extrabold leading-tight ${active ? 'text-emerald-300' : 'text-rose-300'}`}>
            {active ? 'Active' : 'Inactive'}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-white/75">
            {active ? 'Meal is available today' : 'No dining recorded today'}
          </p>
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
  const isInactive = hero.kind === 'inactive';

  const nextLabel = isOff ? 'Resumes In' : 'Next Dining';
  const nextValue = isOff
    ? hero.resumeInDays !== null
      ? `${hero.resumeInDays} ${hero.resumeInDays === 1 ? 'Day' : 'Days'}`
      : '—'
    : hero.nextDiningInDays !== null
    ? formatInDays(hero.nextDiningInDays)
    : '—';

  return (
    <div className="space-y-3">
      <div
        className={`grid grid-cols-2 divide-x divide-emerald-900/10 overflow-hidden rounded-2xl border ${
          isInactive ? 'border-slate-200 bg-slate-100/80' : 'border-emerald-900/10 bg-emerald-50/80'
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

        <div className={`flex items-center gap-3 p-3.5 ${isInactive ? 'bg-rose-50' : ''}`}>
          <Clock3 className={`h-6 w-6 shrink-0 ${isInactive ? 'text-rose-700' : 'text-emerald-800'}`} />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">{nextLabel}</p>
            <p className="truncate text-[13px] font-bold text-slate-900">{nextValue}</p>
          </div>
        </div>
      </div>

      {isOff && hero.offPeriod && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-50/80 p-3.5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
          <div className="min-w-0 text-xs">
            <p className="text-[13px] font-bold text-slate-900">Mess Off Period</p>
            <p className="mt-0.5 font-medium text-slate-700">
              {formatDayMonth(hero.offPeriod.start)}
              {hero.offPeriod.start !== hero.offPeriod.end && ` – ${formatDayMonth(hero.offPeriod.end)}`}
            </p>
            {hero.offPeriod.reason && (
              <p className="mt-0.5 truncate text-slate-500" title={hero.offPeriod.reason}>
                {hero.offPeriod.reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
DiningInfoStrip.displayName = 'DiningInfoStrip';
