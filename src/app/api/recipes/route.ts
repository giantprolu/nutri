import { z } from 'zod';
import { apiError } from '@/server/errors';
import { currentUserId } from '@/server/guard';
import { createRecipe, installStarterRecipes, recipesFor } from '@/server/services/recipes';
import { REJECTION_MESSAGES, recipeSchema } from '@/server/validation/recipes';

export const runtime = 'nodejs';

/** Les recettes de l'utilisateur, ingrédients résolus. */
export async function GET(): Promise<Response> {
  const userId = await currentUserId();
  if (userId === null) {
    return apiError('unauthorized');
  }
  return Response.json({ recipes: await recipesFor(userId) });
}

/**
 * Crée une recette, ou installe les plats de départ.
 *
 * Les deux passent par la même route et se distinguent par `action` : la
 * seconde crée exactement ce que crée la première, et lui ouvrir un chemin à
 * part n'aurait ajouté qu'une porte de plus à garder.
 */
const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('starter') }),
  recipeSchema.extend({ action: z.literal('create') }),
]);

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

  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError('invalid_input');
  }

  if (parsed.data.action === 'starter') {
    const report = await installStarterRecipes(userId);
    return Response.json(report, { status: 201 });
  }

  const { name, servings, steps, prepMinutes, notes, ingredients } = parsed.data;
  const result = await createRecipe(userId, {
    name,
    servings,
    steps,
    prepMinutes,
    notes,
    ingredients,
  });
  if (result.kind === 'invalid') {
    return apiError('invalid_input', REJECTION_MESSAGES[result.reason]);
  }
  if (result.kind === 'not_found') {
    return apiError('not_found');
  }

  return Response.json({ id: result.id }, { status: 201 });
}
