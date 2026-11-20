'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { SlipData, downloadCanvas, renderFoodSlip, slipFileName } from '@/lib/foodSlip';

interface SlipModalProps {
  data: SlipData | null;
  onClose: () => void;
}

/** Preview of the Food Charges Slip with a download button. */
export const SlipModal: React.FC<SlipModalProps> = ({ data, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!data) {
      setUrl(null);
      setError('');
      return;
    }
    try {
      const canvas = renderFoodSlip(data);
      canvasRef.current = canvas;
      setUrl(canvas.toDataURL('image/png'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the slip.');
    }
  }, [data]);

  if (!data) return null;

  return (
    <div
      className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center bg-emerald-950/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Food charges slip"
      onClick={onClose}
    >
      <div
        className="sheet-enter flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Food Charges Slip</h3>
            <p className="text-[11px] text-slate-500">
              R. No. {data.slip.slip_no} · Book {data.slip.book_no}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press rounded-full p-2 text-slate-500 active:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto bg-slate-100 p-3">
          {error ? (
            <p className="py-10 text-center text-xs font-semibold text-rose-600">{error}</p>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Food charges slip" className="mx-auto w-full rounded-lg shadow" />
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">Preparing slip…</div>
          )}
        </div>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            disabled={!url}
            onClick={() => canvasRef.current && downloadCanvas(canvasRef.current, slipFileName(data))}
            className="press flex w-full items-center justify-center gap-2 rounded-full bg-emerald-900 py-3 text-sm font-bold text-white shadow disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download slip
          </button>
        </div>
      </div>
    </div>
  );
};
