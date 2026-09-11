import { z } from 'zod';
import { apiError } from '@/server/errors';
import { isJournalDate, todayInParis } from '@/lib/date';
import { findUserByIngestToken } from '@/server/db/queries/users';
import { upsertDailyActivity } from '@/server/db/queries/activity';

export const runtime = 'nodejs';

/**
 * Ingestion de la dépense d'activité (FR-27).
 *
 * Appelée par un raccourci iOS, qui n'a pas de cookie de session : elle
 * s'authentifie par un jeton porté dans l'en-tête, propre à l'utilisateur et
 * révocable. C'est la seule route de l'application dans ce cas, et elle
 * n'écrit qu'un nombre de kilocalories par jour.
 *
 * Santé d'Apple n'est accessible à aucune page web : HealthKit est réservé aux
 * applications natives iOS. Le raccourci est le seul pont existant qui ne
 * passe pas par l'App Store.
 */
const bodySchema = z.object({
  /** Jour civil concerné. Par défaut le jour courant à Paris. */
  day: z.string().refine(isJournalDate, 'Date invalide.').optional(),
  /** Énergie active du jour, hors métabolisme de base. */
  activeKcal: z.number().min(0).max(20000),
  source: z.enum(['health', 'strava']).default('health'),
});

/** `Authorization: Bearer <jeton>`, ou l'en-tête abrégé que pose un raccourci. */
function readToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim() || null;
  }
  return request.headers.get('x-ingest-token')?.trim() || null;
}

export async function POST(request: Request): Promise<Response> {
  const token = readToken(request);
  if (!token) {
    return apiError('unauthorized');
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError('invalid_input');
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError('invalid_input');
  }

  let user: Awaited<ReturnType<typeof findUserByIngestToken>>;
  try {
    user = await findUserByIngestToken(token);
  } catch (error) {
    console.error('[activity] lecture du jeton en echec', error);
    return apiError('internal');
  }

  if (!user) {
    return apiError('unauthorized');
  }

  const day = parsed.data.day ?? todayInParis();
  await upsertDailyActivity(user.id, day, parsed.data.source, parsed.data.activeKcal);

  return Response.json({ ok: true, day, activeKcal: parsed.data.activeKcal });
}
