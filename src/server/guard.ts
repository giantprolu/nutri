import { cookies } from 'next/headers';
import { SESSION_COOKIE, isValidSessionToken } from './auth';

/**
 * Garde partagé des routes serveur (FR-2, AD-7).
 * Le middleware couvre les navigations ; les routes sous /api l'appellent
 * elles-mêmes pour répondre 401 plutôt que de rediriger.
 */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}
