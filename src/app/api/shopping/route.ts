import { z } from 'zod';
import { apiError } from '@/server/errors';
import { currentUserId } from '@/server/guard';
import { currentList, generateList } from '@/server/services/shopping';
import { isJournalDate } from '@/lib/date';

export const runtime = 'nodejs';

/** La liste de courses la plus récente. */
export async function GET(): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    return apiError('unauthorized');
  }
  return Response.json({ list: await currentList(userId) });
}

const generateSchema = z.object({
  /** Lundi de la semaine à couvrir. La liste court sur les sept jours suivants. */
  from: z.string().refine(isJournalDate, 'Date invalide.'),
});

/**
 * Engendre une liste depuis le plan de la semaine.
 *
 * Toujours une nouvelle liste, jamais une mise à jour de la précédente : une
 * liste de courses est un instantané du plan, et rien n'est plus déroutant
 * qu'une liste qui se réécrit pendant qu'on fait les courses.
 */
export async function POST(request: Request): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    return apiError('unauthorized');
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError('invalid_input');
  }

  const parsed = generateSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError('invalid_input');
  }

  const list = await generateList(userId, parsed.data.from);
  if (list === null) {
    return apiError('invalid_input', 'Aucun plat prévu sur cette période.');
  }
  return Response.json({ list }, { status: 201 });
}
