'use client';

import React from 'react';
import { AlertTriangle, BellRing, Info, OctagonAlert, X } from 'lucide-react';
import { Notice } from './studentUtils';

const STYLE: Record<Notice['level'], { box: string; icon: React.ReactNode }> = {
  critical: { box: 'border-rose-200 bg-rose-50', icon: <OctagonAlert className="h-5 w-5 text-rose-600" /> },
  warning: { box: 'border-amber-200 bg-amber-50', icon: <AlertTriangle className="h-5 w-5 text-amber-600" /> },
  info: { box: 'border-slate-200 bg-slate-50', icon: <Info className="h-5 w-5 text-slate-500" /> }
};

interface NotificationsSheetProps {
  open: boolean;
  notices: Notice[];
  onClose: () => void;
}

/** Everything the student should know right now. It stays until the balance is fixed. */
export const NotificationsSheet: React.FC<NotificationsSheetProps> = ({ open, notices, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center bg-emerald-950/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onClick={onClose}
    >
      <div
        className="sheet-enter flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <BellRing className="h-4 w-4 text-emerald-800" />
            Notifications
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="press rounded-full p-2 text-slate-500 active:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2.5 overflow-y-auto p-4">
          {notices.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Nothing needs your attention.</p>
          ) : (
            notices.map((n) => (
              <div key={n.id} className={`flex gap-3 rounded-2xl border p-3 ${STYLE[n.level].box}`}>
                <span className="mt-0.5 shrink-0">{STYLE[n.level].icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{n.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
