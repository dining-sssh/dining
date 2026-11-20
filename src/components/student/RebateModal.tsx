'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

export interface RebateFormValues {
  start: string;
  end: string;
  reason: string;
}

interface RebateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RebateFormValues) => Promise<void>;
}

export const RebateModal: React.FC<RebateModalProps> = ({ open, onClose, onSubmit }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setStart('');
      setEnd('');
      setReason('');
      setSubmitted(false);
      setSubmitting(false);
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open]);

  if (!open) return null;

  const dateError = start && end && end < start ? 'End date cannot be before start date.' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end || !reason.trim() || dateError || submitting) return;
    setSubmitting(true);
    await onSubmit({ start, end, reason: reason.trim() });
    setSubmitted(true);
    closeTimer.current = setTimeout(onClose, 1800);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-emerald-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rebate-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between bg-gradient-to-br from-[#0c5a41] to-[#052e20] px-5 py-4 text-white">
          <div>
            <h3 id="rebate-title" className="text-base font-bold">
              Apply for Mess Off
            </h3>
            <p className="text-xs text-emerald-200">Request goes to the Provost and Munshi for approval</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-emerald-100 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex items-start gap-3 p-6 text-sm text-emerald-900">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="font-semibold">Your request has been submitted. You can track it under Profile.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5 text-xs">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <span className="block font-bold">Rule</span>
              As per dining rules, mess off needs a minimum of 3 consecutive days.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700">Start date</span>
                <input
                  type="date"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-700">End date</span>
                <input
                  type="date"
                  required
                  min={start || undefined}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </label>
            </div>
            {dateError && <p className="-mt-2 font-semibold text-rose-600">{dateError}</p>}

            <label className="block">
              <span className="mb-1 block font-semibold text-slate-700">Reason</span>
              <textarea
                required
                rows={3}
                placeholder="e.g. Family function, medical leave, home visit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || Boolean(dateError)}
                className="rounded-full bg-emerald-900 px-5 py-2.5 font-bold text-white shadow transition hover:bg-emerald-950 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
