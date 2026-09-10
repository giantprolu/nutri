import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  issueSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/server/auth';
import { apiError } from '@/server/errors';
import { hasSession } from '@/server/guard';

export const runtime = 'nodejs';

const unlockSchema = z.object({ password: z.string().min(1).max(512) });

/** Ouvre une session (FR-1). */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError('invalid_input');
  }

  const parsed = unlockSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError('invalid_input');
  }

  let ok = false;
  try {
    ok = await verifyPassword(parsed.data.password);
  } catch (error) {
    // APP_PASSWORD ou SESSION_SECRET absente : blocage de configuration, pas
    // une erreur d'utilisateur. Le message reste générique côté client (NFR-2).
    console.error('[session] configuration manquante', error);
    return apiError('internal');
  }

  if (!ok) {
    return apiError('unauthorized', 'Mot de passe incorrect.');
  }

  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    await issueSessionToken(),
    sessionCookieOptions(SESSION_MAX_AGE_SECONDS),
  );
  return Response.json({ ok: true });
}

/** Verrouille la session depuis les réglages (FR-3). */
export async function DELETE(): Promise<Response> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return Response.json({ ok: true });
}

/** Sonde d'état, utile pour vérifier le 401 sans session (FR-2). */
export async function GET(): Promise<Response> {
  if (!(await hasSession())) {
    return apiError('unauthorized');
  }
  return Response.json({ ok: true });
}
