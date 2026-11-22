import { Student } from '@/types';
import { AccountState } from '@/lib/diningEngine';
import { Tone } from './ui';
import { formatDayMonth } from '../student/studentUtils';

/** One short line about a student's dining today, with a colour. */
export function diningLabel(student: Student, state: AccountState | undefined): { text: string; tone: Tone } {
  if (student.status !== 'active') {
    return { text: student.status === 'suspended' ? 'Suspended' : 'Passed out', tone: 'slate' };
  }
  if (!state) return { text: '—', tone: 'slate' };
  if (state.status === 'off') {
    return { text: state.offSince ? `Off since ${formatDayMonth(state.offSince)}` : 'Off', tone: 'amber' };
  }
  if (state.status === 'stopped') return { text: `Stopped (-${state.negativeDays})`, tone: 'rose' };
  if (state.status === 'break') return { text: 'Vacation', tone: 'slate' };
  return state.negativeDays > 0
    ? { text: `On · -${state.negativeDays}`, tone: 'amber' }
    : { text: 'On', tone: 'emerald' };
}