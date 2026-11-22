'use client';

import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { HOSTEL_HOUSES, HOUSE_CODES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';

interface EditStudentModalProps {
  student: Student | null;
  onClose: () => void;
  onSaved: (student: Student) => void;
}

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm';

/** Fix a mistyped email, and keep remarks and the previous hostel up to date. */
export const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, onClose, onSaved }) => {
  const [email, setEmail] = useState('');
  const [remarks, setRemarks] = useState('');
  const [previousHouse, setPreviousHouse] = useState('');
  const [previousRoom, setPreviousRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setEmail(student.email);
      setRemarks(student.remarks ?? '');
      setPreviousHouse(student.previous_house ?? '');
      setPreviousRoom(student.previous_room ?? '');
      setError('');
      setSaving(false);
    }
  }, [student]);

  if (!student) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || !nextEmail.includes('@')) return setError('Enter a valid email address.');

    setSaving(true);
    setError('');
    try {
      const updated = await DataService.updateStudent(student.id, {
        email: nextEmail,
        remarks: remarks.trim(),
        previous_house: previousHouse.trim(),
        previous_room: previousRoom.trim() || 'New Allotment'
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-title"
    >
      <div className="sheet-enter w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between bg-emerald-900 px-5 py-4 text-white">
          <div className="min-w-0">
            <h3 id="edit-student-title" className="text-base font-bold">
              Edit student
            </h3>
            <p className="truncate text-xs text-emerald-200">
              {student.name} · <span className="font-mono">{student.enrollment_no}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="press rounded-lg p-2 text-emerald-200 active:bg-emerald-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Email (used to sign in with Google)</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Previous hostel</span>
              <select
                value={previousHouse}
                onChange={(e) => setPreviousHouse(e.target.value)}
                className={`${FIELD} font-medium`}
              >
                <option value="">None / New allotment</option>
                {previousHouse && !HOUSE_CODES.includes(previousHouse as HostelHouseCode) && (
                  <option value={previousHouse}>{previousHouse}</option>
                )}
                {HOUSE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} – {HOSTEL_HOUSES[code].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Previous room</span>
              <input type="text" value={previousRoom} onChange={(e) => setPreviousRoom(e.target.value)} className={FIELD} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Remarks</span>
            <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={FIELD} />
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={onClose} className="press px-4 py-2 text-xs font-semibold text-slate-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="press flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
