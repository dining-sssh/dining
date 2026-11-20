import { AuthSession, Student, UserRole } from '@/types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const AUTH_STORAGE_KEY = 'amu_dining_auth_session';

export function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AuthSession) : null;
  } catch (e) {
    console.warn('Could not read auth session:', e);
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Could not save auth session:', e);
  }
}

export function clearAuthSession(): void {
  // Also end the Google (Supabase) session, otherwise the login page would sign the user straight back in.
  supabase?.auth.signOut().catch(() => undefined);
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear auth session:', e);
  }
}

/** Which panel this login belongs to. Each panel lives at its own URL. */
export function panelOf(session: AuthSession): UserRole {
  if (session.role === 'student') return 'student';
  return session.adminType ?? (session.selectedPanel === 'munshi' ? 'munshi' : 'provost');
}

export function homeRouteFor(session: AuthSession): string {
  return `/${panelOf(session)}`;
}

const emailList = (value: string | undefined, fallback: string): string[] =>
  (value || fallback)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

// Admin accounts are decided by email. Set these in .env.local for real deployments.
const PROVOST_EMAILS = emailList(process.env.NEXT_PUBLIC_PROVOST_EMAILS, 'provost.amu@gmail.com');
const MUNSHI_EMAILS = emailList(process.env.NEXT_PUBLIC_MUNSHI_EMAILS, 'munshi.amu@gmail.com');

export const ADMIN_CONTACT_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_CONTACT || PROVOST_EMAILS[0] || '').trim();

export type LoginResult = { ok: true; session: AuthSession } | { ok: false; error: string };

/**
 * The role comes from the account itself, so nobody chooses a panel on the login page:
 * a registered student email opens the student panel, a provost or munshi email opens that panel.
 */
export function resolveLogin(
  rawEmail: string,
  students: Student[],
  /** Role from the staff_users table (only used when the database is connected). */
  dbStaffRole: 'provost' | 'munshi' | null = null
): LoginResult {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  // With a database, the staff_users table decides (it is also what Row Level Security trusts).
  // Without one, the emails in .env.local decide.
  const staffRole: 'provost' | 'munshi' | null = isSupabaseConfigured
    ? dbStaffRole
    : PROVOST_EMAILS.includes(email)
    ? 'provost'
    : MUNSHI_EMAILS.includes(email)
    ? 'munshi'
    : null;

  if (staffRole) {
    return { ok: true, session: { role: 'admin', selectedPanel: staffRole, adminType: staffRole, email } };
  }

  const student = students.find((s) => s.email.trim().toLowerCase() === email);
  if (student) {
    if (student.status !== 'active') {
      return { ok: false, error: 'This student account is not active. Please contact the admin.' };
    }
    return {
      ok: true,
      session: {
        role: 'student',
        selectedPanel: 'student',
        email,
        studentId: student.id,
        studentEnrollment: student.enrollment_no,
        studentName: student.name
      }
    };
  }

  return { ok: false, error: `${rawEmail.trim()} is not registered for this portal. Please contact the admin.` };
}