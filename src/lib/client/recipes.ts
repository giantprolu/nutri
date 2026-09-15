import type { RecipeInput } from '../recipe';

/**
 * Appels navigateur vers les routes de recettes.
 * Résultats discriminés plutôt qu'exceptions (AD-12) : l'interface aiguille
 * sur la variante au lieu d'afficher un message générique.
 */

export type SaveRecipeOutcome =
  | { kind: 'saved'; id: number }
  /** Le serveur dit pourquoi ; le message est fait pour être affiché tel quel. */
  | { kind: 'invalid'; message: string }
  | { kind: 'unauthorized' }
  | { kind: 'error' };

/** Lit le message de refus renvoyé par la route, ou un repli si le corps est muet. */
async function readRejection(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? 'Recette invalide.';
  } catch {
    return 'Recette invalide.';
  }
}

async function send(
  url: string,
  method: 'POST' | 'PUT',
  payload: unknown,
): Promise<SaveRecipeOutcome> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { kind: 'error' };
  }

  if (response.status === 401) {
    return { kind: 'unauthorized' };
  }
  if (response.status === 400) {
    return { kind: 'invalid', message: await readRejection(response) };
  }
  if (!response.ok) {
    return { kind: 'error' };
  }

  const body = (await response.json()) as { id: number };
  return { kind: 'saved', id: body.id };
}

export function createRecipe(input: RecipeInput): Promise<SaveRecipeOutcome> {
  return send('/api/recipes', 'POST', { ...input, action: 'create' });
}

export function updateRecipe(id: number, input: RecipeInput): Promise<SaveRecipeOutcome> {
  return send(`/api/recipes/${id}`, 'PUT', input);
}

export type DeleteRecipeOutcome = { kind: 'deleted' } | { kind: 'error' };

export async function deleteRecipe(id: number): Promise<DeleteRecipeOutcome> {
  try {
    const response = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    return response.ok ? { kind: 'deleted' } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export interface StarterInstallReport {
  created: number;
  skipped: string[];
}

export type InstallStarterOutcome =
  | { kind: 'installed'; report: StarterInstallReport }
  | { kind: 'error' };

/** Installe les plats de départ. Sans effet si le compte a déjà une recette. */
export async function installStarterRecipes(): Promise<InstallStarterOutcome> {
  try {
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'starter' }),
    });
    if (!response.ok) {
      return { kind: 'error' };
    }
    return { kind: 'installed', report: (await response.json()) as StarterInstallReport };
  } catch {
    return { kind: 'error' };
  }
}
