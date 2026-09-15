import 'server-only';
import {
  MAX_INGREDIENTS,
  MAX_STEPS,
  isValidServings,
  type RecipeInput,
  type Recipe,
} from '@/lib/recipe';
import { isValidQuantity } from '@/lib/nutrition';
import { STARTER_RECIPES } from '@/lib/starter-recipes';
import {
  countRecipes,
  deleteRecipe,
  findRecipe,
  insertRecipe,
  listRecipes,
  missingReferences,
  updateRecipe,
} from '../db/queries/recipes';
import { searchReferenceFoods } from '../db/queries/search';

/**
 * Service des recettes.
 *
 * C'est ici que se décide ce qu'est une recette enregistrable. La couche
 * requêtes écrit ce qu'on lui donne ; la validation ne doit donc exister
 * qu'une fois, et à cet étage — une route HTTP qui validerait pour son compte
 * laisserait passer tout ce qui n'entre pas par elle.
 */

export type { Recipe };

export const MAX_NAME_LENGTH = 80;
export const MAX_PREP_MINUTES = 600;

/**
 * Pourquoi une recette a été refusée.
 *
 * Nommer le motif plutôt que rendre un booléen : le formulaire doit pouvoir
 * dire ce qui cloche, et « enregistrement impossible » n'aide personne à
 * corriger une quantité.
 */
export type RecipeRejection =
  | 'name'
  | 'servings'
  | 'ingredients'
  | 'quantity'
  | 'steps'
  | 'unknown_reference';

export type SaveRecipeResult =
  | { kind: 'saved'; id: number }
  | { kind: 'invalid'; reason: RecipeRejection }
  | { kind: 'not_found' };

/**
 * Contrôles qui ne demandent pas la base. Séparés de ceux qui l'interrogent :
 * inutile d'aller vérifier l'existence de vingt références si le nom est vide.
 */
function checkShape(input: RecipeInput): RecipeRejection | null {
  if (input.name.trim().length === 0 || input.name.length > MAX_NAME_LENGTH) {
    return 'name';
  }
  if (!isValidServings(input.servings)) {
    return 'servings';
  }
  if (input.ingredients.length === 0 || input.ingredients.length > MAX_INGREDIENTS) {
    return 'ingredients';
  }
  if (input.steps.length > MAX_STEPS) {
    return 'steps';
  }
  if (
    input.prepMinutes !== null &&
    (!Number.isInteger(input.prepMinutes) ||
      input.prepMinutes < 0 ||
      input.prepMinutes > MAX_PREP_MINUTES)
  ) {
    return 'steps';
  }
  for (const ingredient of input.ingredients) {
    // La même borne que le journal : une recette sert à le remplir, une
    // quantité qu'il refuserait n'a rien à faire ici non plus.
    if (!isValidQuantity(ingredient.quantityG)) {
      return 'quantity';
    }
    if (ingredient.label.trim().length === 0) {
      return 'ingredients';
    }
    // L'unité va par deux : un nom sans poids ne se convertit pas, un poids
    // sans nom ne s'affiche pas.
    if ((ingredient.unitName === null) !== (ingredient.unitGrams === null)) {
      return 'ingredients';
    }
    if (ingredient.unitGrams !== null && ingredient.unitGrams <= 0) {
      return 'ingredients';
    }
  }
  return null;
}

/** Nettoie ce que le client envoie : espaces en trop, étapes vides. */
function normalize(input: RecipeInput): RecipeInput {
  return {
    ...input,
    name: input.name.trim(),
    notes: input.notes === null || input.notes.trim() === '' ? null : input.notes.trim(),
    steps: input.steps.map((step) => step.trim()).filter((step) => step.length > 0),
    ingredients: input.ingredients.map((ingredient) => ({
      ...ingredient,
      label: ingredient.label.trim(),
      unitName:
        ingredient.unitName === null || ingredient.unitName.trim() === ''
          ? null
          : ingredient.unitName.trim(),
    })),
  };
}

async function validate(input: RecipeInput): Promise<RecipeRejection | null> {
  const shape = checkShape(input);
  if (shape !== null) {
    return shape;
  }
  const missing = await missingReferences(input.ingredients);
  return missing.length > 0 ? 'unknown_reference' : null;
}

export function recipesFor(userId: number): Promise<Recipe[]> {
  return listRecipes(userId);
}

export function recipeFor(userId: number, id: number): Promise<Recipe | null> {
  return findRecipe(userId, id);
}

export async function createRecipe(
  userId: number,
  input: RecipeInput,
): Promise<SaveRecipeResult> {
  const clean = normalize(input);
  const rejection = await validate(clean);
  if (rejection !== null) {
    return { kind: 'invalid', reason: rejection };
  }
  return { kind: 'saved', id: await insertRecipe(userId, clean) };
}

export async function saveRecipe(
  userId: number,
  id: number,
  input: RecipeInput,
): Promise<SaveRecipeResult> {
  const clean = normalize(input);
  const rejection = await validate(clean);
  if (rejection !== null) {
    return { kind: 'invalid', reason: rejection };
  }
  const updated = await updateRecipe(userId, id, clean);
  return updated ? { kind: 'saved', id } : { kind: 'not_found' };
}

export function removeRecipe(userId: number, id: number): Promise<boolean> {
  return deleteRecipe(userId, id);
}

export function recipeCount(userId: number): Promise<number> {
  return countRecipes(userId);
}

export interface StarterInstallReport {
  created: number;
  /** Ingrédients qu'aucune fiche CIQUAL n'a pu servir, désignés par leur nom. */
  skipped: string[];
}

/**
 * Installe les plats de départ sur un compte qui n'a encore aucune recette.
 *
 * Chaque ingrédient passe par la recherche que l'utilisateur emploierait
 * lui-même, plutôt que par un code CIQUAL écrit en dur : les codes de l'ANSES
 * changent de millésime en millésime, et une liste figée finirait par
 * installer des recettes pointant vers rien.
 *
 * Ce qui ne se résout pas est omis et rapporté, jamais remplacé par une
 * valeur approchante. Un ingrédient absent se voit et se corrige en dix
 * secondes ; un ingrédient silencieusement remplacé par le premier résultat
 * venu fausse toutes les journées à venir sans qu'on sache pourquoi.
 *
 * Le garde-fou sur le nombre de recettes existantes est ici et non dans
 * l'écran : c'est une écriture, et elle ne doit pas se rejouer au double clic.
 */
export async function installStarterRecipes(userId: number): Promise<StarterInstallReport> {
  if ((await countRecipes(userId)) > 0) {
    return { created: 0, skipped: [] };
  }

  const report: StarterInstallReport = { created: 0, skipped: [] };

  for (const starter of STARTER_RECIPES) {
    const resolved = await Promise.all(
      starter.ingredients.map(async (ingredient) => {
        const [best] = await searchReferenceFoods(ingredient.searchTerm, 1);
        if (!best) {
          return null;
        }
        return {
          refKind: best.kind,
          refValue: best.ref,
          label: ingredient.label,
          quantityG: ingredient.quantityG,
          unitName: ingredient.unitName ?? null,
          unitGrams: ingredient.unitGrams ?? null,
        };
      }),
    );

    const ingredients = resolved.filter((ingredient) => ingredient !== null);
    report.skipped.push(
      ...starter.ingredients
        .filter((_, index) => resolved[index] === null)
        .map((ingredient) => ingredient.label),
    );

    // Une recette dont plus rien ne se résout n'aurait aucun total : mieux
    // vaut ne pas la créer que d'en laisser une coquille à supprimer.
    if (ingredients.length === 0) {
      continue;
    }

    await insertRecipe(userId, {
      name: starter.name,
      servings: starter.servings,
      steps: [...starter.steps],
      prepMinutes: starter.prepMinutes,
      notes: null,
      ingredients,
    });
    report.created += 1;
  }

  return report;
}
