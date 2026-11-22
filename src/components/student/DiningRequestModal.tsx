'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface DiningRequestValues {
  startDate: string;
  reason: string;
}

interface DiningRequestModalProps {
  open: boolean;
  /** 'off' = close dining until it is opened again, 'on' = ask the Munshi to open it. */
  kind: 'off' | 'on';
  todayKey: string;
  onClose: () => void;
  onSubmit: (values: DiningRequestValues) => Promise<void>;
}

const COPY = {
  off: {
    title: 'Dining Off',
    subtitle: 'Dining stays closed from your start date until you ask to open it again',
    note: 'No end date. Nothing is charged for the days dining is off.',
    now: 'Immediately (from today)',
    later: 'From a date',
    reasonLabel: 'Reason',
    placeholder: 'e.g. Going home, medical leave, internship',
    done: 'Your request is with the Munshi. You can follow it under Profile.',
    button: 'Send request'
  },
  on: {
    title: 'Request to Open Dining',
    subtitle: 'Ask the Munshi to start your dining again',
    note: 'Dining starts again from the date you choose, after the Munshi approves.',
    now: 'From today',
    later: 'From a date',
    reasonLabel: 'Note (optional)',
    placeholder: 'e.g. Back at the hostel',
    done: 'Your request is with the Munshi. Dining starts once it is approved.',
    button: 'Send request'
  }
} as const;

export const DiningRequestModal: React.FC<DiningRequestModalProps> = ({ open, kind, todayKey, onClose, onSubmit }) => {
  const copy = COPY[kind];
  const [when, setWhen] = useState<'now' | 'date'>('now');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setWhen('now');
      setDate('');
      setReason('');
      setSubmitted(false);
      setSubmitting(false);
      setError('');
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open]);

  if (!open) return null;

  const startDate = when === 'now' ? todayKey : date;
  const needsReason = kind === 'off';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!startDate) return setError('Choose the date.');
    if (startDate < todayKey) return setError('The date cannot be in the past.');
    if (needsReason && !reason.trim()) return setError('Please write a reason.');

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ startDate, reason: reason.trim() || (kind === 'on' ? 'Back at the hostel' : '') });
      setSubmitted(true);
      closeTimer.current = setTimeout(onClose, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center bg-emerald-950/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dining-request-title"
    >
      <div className="sheet-enter max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between bg-gradient-to-br from-[#0c5a41] to-[#052e20] px-5 py-4 text-white">
          <div>
            <h3 id="dining-request-title" className="text-base font-bold">
              {copy.title}
            </h3>
            <p className="text-xs text-emerald-200">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press rounded-full p-2 text-emerald-100 active:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex items-start gap-3 p-6 text-sm text-emerald-900">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="font-semibold">{copy.done}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5 text-xs">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">{copy.note}</div>

            <fieldset>
              <legend className="mb-1.5 font-semibold text-slate-700">Start</legend>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 font-bold">
                {(['now', 'date'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWhen(w)}
                    aria-pressed={when === w}
                    className={`press rounded-full py-2 transition-colors ${
                      when === w ? 'bg-white text-emerald-950 shadow' : 'text-slate-600'
                    }`}
                  >
                    {w === 'now' ? copy.now : copy.later}
                  </button>
                ))}
              </div>
            </fieldset>

            {when === 'date' && (
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700">Date</span>
                <input
                  type="date"
                  required
                  min={todayKey}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-xs"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block font-semibold text-slate-700">{copy.reasonLabel}</span>
              <textarea
                rows={3}
                placeholder={copy.placeholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-xs"
              />
            </label>

            {error && <p role="alert" className="font-semibold text-rose-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="press rounded-full px-4 py-2.5 font-semibold text-slate-600 active:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="press rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white shadow disabled:opacity-60"
              >
                {submitting ? 'Sending…' : copy.button}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
