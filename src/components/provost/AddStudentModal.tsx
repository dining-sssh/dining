'use client';

import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import { HOSTEL_HOUSES, HostelHouseCode, Student } from '@/types';
import { DataService } from '@/lib/dataService';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [name, setName] = useState('');
  const [house, setHouse] = useState<HostelHouseCode>('HM');
  const [roomNo, setRoomNo] = useState('');
  const [course, setCourse] = useState('');
  const [email, setEmail] = useState('');
  const [previousRoom, setPreviousRoom] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!enrollmentNo.trim()) {
      setError('Enrollment Number is required.');
      return;
    }
    if (!name.trim()) {
      setError('Student Name is required.');
      return;
    }
    if (!roomNo.trim()) {
      setError('Room Number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const student = await DataService.addStudent({
        enrollment_no: enrollmentNo.trim().toUpperCase(),
        name: name.trim(),
        house,
        room_no: roomNo.trim(),
        course: course.trim() || 'General Course',
        email: email.trim() || `${enrollmentNo.trim().toLowerCase()}@myamu.ac.in`,
        previous_room: previousRoom.trim() || 'N/A',
        phone: phone.trim() || undefined,
        session: '2026-2027',
        status: 'active'
      });
      setIsSubmitting(false);
      onSuccess(student);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to add student');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800 rounded-lg">
              <UserPlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Register Dining Student</h3>
              <p className="text-xs text-emerald-200">Add an individual resident to dining records</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enrollment Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. GJ1021"
                required
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Tariq Anwar"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hostel House <span className="text-red-500">*</span>
            </label>
            <select
              value={house}
              onChange={(e) => setHouse(e.target.value as HostelHouseCode)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-medium"
            >
              {Object.values(HOSTEL_HOUSES).map((h) => (
                <option key={h.code} value={h.code}>
                  {h.code} – {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Room Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 14 or F-2"
                required
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Previous Room
              </label>
              <input
                type="text"
                placeholder="e.g. 08 or New Allotment"
                value={previousRoom}
                onChange={(e) => setPreviousRoom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course / Branch
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech Computer Engg"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. tariq@myamu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
