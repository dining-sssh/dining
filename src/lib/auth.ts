import { AuthSession, UserRole } from '@/types';

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
