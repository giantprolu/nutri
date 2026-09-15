import 'server-only';
import { quantityForServings, type Recipe } from '@/lib/recipe';
import { isValidQuantity } from '@/lib/nutrition';
import { daysFrom, shiftDate } from '@/lib/date';
import type { Meal } from '@/lib/meal';
import {
  clearJournaled,
  deletePlannedMeal,
  findPlannedMeal,
  insertPlannedMeal,
  listPlannedMeals,
  markJournaled,
  recipeForPlanned,
  type PlannedMeal,
} from '../db/queries/meal-plan';
import { recordEntry } from './entries';

/**
 * Service du plan de la semaine.
 *
 * C'est le seul endroit où un plat prévu devient des lignes de journal. La
 * conversion y est une opération nommée, et non un effet de bord d'un écran :
 * elle écrit dans les données de santé de quelqu'un, et doit pouvoir être lue
 * d'un seul endroit.
 */

/** Une semaine pleine. Le plan ne se lit jamais jour par jour. */
export const WEEK_LENGTH = 7;

/** Au-delà, ce n'est plus un repas mais une erreur de saisie. */
export const MAX_PLANNED_SERVINGS = 20;

export type { PlannedMeal };

export function planForWeek(userId: number, startDate: string): Promise<PlannedMeal[]> {
  return listPlannedMeals(userId, startDate, shiftDate(startDate, WEEK_LENGTH - 1));
}

export function weekDays(startDate: string): string[] {
  return daysFrom(startDate, WEEK_LENGTH);
}

export type PlanMealResult =
  | { kind: 'planned'; id: number }
  | { kind: 'invalid' }
  | { kind: 'not_found' };

export async function planMeal(
  userId: number,
  input: { planDate: string; meal: Meal; recipeId: number; servings: number },
): Promise<PlanMealResult> {
  if (
    !Number.isFinite(input.servings) ||
    input.servings <= 0 ||
    input.servings > MAX_PLANNED_SERVINGS
  ) {
    return { kind: 'invalid' };
  }

  const id = await insertPlannedMeal(userId, input);
  // `null` signifie que la recette n'est pas la sienne : introuvable, et non
  // interdit, pour ne pas confirmer l'existence d'une recette d'un autre compte.
  return id === null ? { kind: 'not_found' } : { kind: 'planned', id };
}

export function unplanMeal(userId: number, id: number): Promise<boolean> {
  return deletePlannedMeal(userId, id);
}

export function reopenMeal(userId: number, id: number): Promise<boolean> {
  return clearJournaled(userId, id);
}

export type JournalPlannedResult =
  | { kind: 'journaled'; created: number; skipped: string[] }
  | { kind: 'nothing_to_journal' }
  | { kind: 'already_journaled' }
  | { kind: 'not_found' };

/**
 * Les ingrédients d'une recette, mis à l'échelle des parts réellement mangées.
 *
 * Un ingrédient sans fiche est écarté plutôt que journalisé à zéro : compter
 * zéro calorie pour un aliment qu'on a mangé est un mensonge, l'omettre et le
 * dire est une lacune. Les deux donnent un total trop bas, mais seul le second
 * se voit.
 */
function scaledIngredients(recipe: Recipe, servings: number) {
  const journaled: {
    label: string;
    quantityG: number;
    per100g: NonNullable<Recipe['ingredients'][number]['per100g']>;
    refKind: 'ciqual' | 'product';
    refValue: string;
  }[] = [];
  const skipped: string[] = [];

  for (const ingredient of recipe.ingredients) {
    const quantityG = quantityForServings(ingredient.quantityG, recipe.servings, servings);
    if (ingredient.per100g === null || !isValidQuantity(quantityG)) {
      skipped.push(ingredient.label);
      continue;
    }
    journaled.push({
      label: ingredient.label,
      quantityG,
      per100g: ingredient.per100g,
      refKind: ingredient.refKind,
      refValue: ingredient.refValue,
    });
  }

  return { journaled, skipped };
}

/**
 * Marque un plat prévu comme mangé et l'inscrit au journal, un ingrédient par
 * ligne.
 *
 * Le verrou est posé avant les écritures et non après, et c'est délibéré.
 * `markJournaled` ne réussit qu'une fois, la condition étant dans sa clause
 * `where` : deux appuis rapprochés sur « J'ai mangé ça » ne peuvent pas
 * compter le repas deux fois. Marquer après aurait laissé la fenêtre ouverte
 * pendant toute la durée des insertions.
 *
 * Le prix de ce choix est qu'une panne au milieu des écritures laisse un plat
 * marqué mangé avec des lignes manquantes. C'est le bon prix à payer : les
 * lignes manquantes se voient dans le journal du jour et se rattrapent à la
 * main, là où un repas compté deux fois ne se voit nulle part.
 */
export async function journalPlannedMeal(
  userId: number,
  id: number,
): Promise<JournalPlannedResult> {
  const planned = await findPlannedMeal(userId, id);
  if (planned === null) {
    return { kind: 'not_found' };
  }
  if (planned.journaledAt !== null) {
    return { kind: 'already_journaled' };
  }

  const recipe = await recipeForPlanned(userId, planned.recipeId);
  if (recipe === null) {
    return { kind: 'not_found' };
  }

  const { journaled, skipped } = scaledIngredients(recipe, planned.servings);
  if (journaled.length === 0) {
    // Rien d'inscriptible : ne pas marquer le plat mangé, sans quoi il serait
    // clos sans qu'une seule ligne ait rejoint le journal.
    return { kind: 'nothing_to_journal' };
  }

  if (!(await markJournaled(userId, id))) {
    return { kind: 'already_journaled' };
  }

  let created = 0;
  for (const ingredient of journaled) {
    const result = await recordEntry({
      userId,
      foodLabel: ingredient.label,
      per100g: ingredient.per100g,
      quantityG: ingredient.quantityG,
      sourceKind: ingredient.refKind,
      sourceRef: ingredient.refValue,
      entryDate: planned.planDate,
      meal: planned.meal,
    });
    if (result.kind === 'created') {
      created += 1;
    } else {
      skipped.push(ingredient.label);
    }
  }

  return { kind: 'journaled', created, skipped };
}
