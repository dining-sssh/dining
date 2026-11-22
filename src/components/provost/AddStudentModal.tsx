'use client';

import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { HOSTEL_HOUSES, HOUSE_CODES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm';

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [name, setName] = useState('');
  const [house, setHouse] = useState<HostelHouseCode>('HM');
  const [roomNo, setRoomNo] = useState('');
  const [course, setCourse] = useState('');
  const [email, setEmail] = useState('');
  const [previousRoom, setPreviousRoom] = useState('');
  const [previousHouse, setPreviousHouse] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setEnrollmentNo('');
    setName('');
    setHouse('HM');
    setRoomNo('');
    setCourse('');
    setEmail('');
    setPreviousRoom('');
    setPreviousHouse('');
    setRemarks('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!enrollmentNo.trim()) return setError('Enrollment Number is required.');
    if (!name.trim()) return setError('Student Name is required.');
    if (!roomNo.trim()) return setError('Room Number is required.');

    setIsSubmitting(true);
    try {
      const student = await DataService.addStudent({
        enrollment_no: enrollmentNo.trim().toUpperCase(),
        name: name.trim(),
        house,
        room_no: roomNo.trim(),
        course: course.trim() || 'General Course',
        email: email.trim() || `${enrollmentNo.trim().toLowerCase()}@myamu.ac.in`,
        previous_room: previousRoom.trim() || 'New Allotment',
        previous_house: previousHouse.trim() || undefined,
        remarks: remarks.trim() || undefined,
        session: '2026-2027',
        status: 'active'
      });
      setIsSubmitting(false);
      onSuccess(student);
      reset();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to add student');
    }
  };

  return (
    <div className="no-print fade-enter fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 sm:items-center sm:p-4">
      <div className="sheet-enter flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between bg-emerald-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-800 p-2">
              <UserPlus className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Register Dining Student</h3>
              <p className="text-xs text-emerald-200">Add one resident to the dining records</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press rounded-lg p-2 text-emerald-200 active:bg-emerald-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-5">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Enrollment Number <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                placeholder="e.g. GJ1021"
                required
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value.toUpperCase())}
                className={`${FIELD} font-mono uppercase`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Student Full Name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                placeholder="e.g. Tariq Anwar"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Hostel <span className="text-red-500">*</span>
              </span>
              <select
                value={house}
                onChange={(e) => setHouse(e.target.value as HostelHouseCode)}
                className={`${FIELD} font-medium`}
              >
                {HOUSE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} – {HOSTEL_HOUSES[code].name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                Room Number <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                placeholder="e.g. 14 or F-2"
                required
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                className={FIELD}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Previous Hostel / House</span>
              <select
                value={previousHouse}
                onChange={(e) => setPreviousHouse(e.target.value)}
                className={`${FIELD} font-medium`}
              >
                <option value="">None / New Allotment</option>
                {HOUSE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} – {HOSTEL_HOUSES[code].name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Previous Room</span>
              <input
                type="text"
                placeholder="e.g. 08 or New Allotment"
                value={previousRoom}
                onChange={(e) => setPreviousRoom(e.target.value)}
                className={FIELD}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Course / Branch</span>
              <input
                type="text"
                placeholder="e.g. B.Tech Computer Engg"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Email Address</span>
              <input
                type="email"
                placeholder="e.g. tariq@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={FIELD}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Remarks</span>
            <textarea
              rows={2}
              placeholder="Anything the Munshi should remember about this student"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className={FIELD}
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="press px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="press flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Registering…' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
