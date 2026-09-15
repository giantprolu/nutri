import { apiError } from '@/server/errors';
import { currentUserId } from '@/server/guard';
import { recipeFor, removeRecipe, saveRecipe } from '@/server/services/recipes';
import { REJECTION_MESSAGES, recipeSchema } from '@/server/validation/recipes';

export const runtime = 'nodejs';

/**
 * Une recette donnée.
 *
 * Chaque gestionnaire passe l'utilisateur de la session au service, qui le
 * pose en tête de sa clause `where`. L'identifiant de l'URL ne désigne donc
 * jamais qu'une recette du demandeur : celle d'un autre compte répond 404,
 * exactement comme une recette inexistante. Distinguer les deux dirait à qui
 * essaie qu'il a visé juste.
 */

/** Rend l'identifiant de l'URL, ou `null` s'il n'en est pas un. */
function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    return apiError('unauthorized');
  }

  const id = parseId((await context.params).id);
  if (id === null) {
    return apiError('invalid_input');
  }

  const recipe = await recipeFor(userId, id);
  return recipe === null ? apiError('not_found') : Response.json({ recipe });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    return apiError('unauthorized');
  }

  const id = parseId((await context.params).id);
  if (id === null) {
    return apiError('invalid_input');
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError('invalid_input');
  }

  const parsed = recipeSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError('invalid_input');
  }

  const result = await saveRecipe(userId, id, parsed.data);
  if (result.kind === 'invalid') {
    return apiError('invalid_input', REJECTION_MESSAGES[result.reason]);
  }
  if (result.kind === 'not_found') {
    return apiError('not_found');
  }
  return Response.json({ id: result.id });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    return apiError('unauthorized');
  }

  const id = parseId((await context.params).id);
  if (id === null) {
    return apiError('invalid_input');
  }

  const removed = await removeRecipe(userId, id);
  return removed ? new Response(null, { status: 204 }) : apiError('not_found');
}
