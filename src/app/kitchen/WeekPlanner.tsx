'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon } from '@/components/icons';
import { journalMeal, planMeal, reopenMeal, unplanMeal } from '@/lib/client/plan';
import { MEAL_LABELS, mealForHour, type Meal } from '@/lib/meal';
import { formatDayMonth, formatWeekday, shiftDate } from '@/lib/date';
import { macrosPerServing, type Recipe } from '@/lib/recipe';
import { formatKcal, scaleMacros } from '@/lib/nutrition';
import type { PlannedMeal } from '@/server/db/queries/meal-plan';
import { PlanMealSheet } from './PlanMealSheet';

/**
 * Le plan de la semaine.
 *
 * Sept jours empilés plutôt qu'une grille de sept colonnes : sur la largeur
 * d'un téléphone, une colonne par jour donne des cases de cinquante pixels où
 * aucun nom de plat ne tient. La semaine se parcourt du pouce, pas d'un regard.
 *
 * Un plat journalisé reste affiché, barré de son horodatage. Le faire
 * disparaître priverait du seul repère qui dit ce qui a déjà été mangé, et le
 * plan se relirait comme une semaine à moitié vide.
 */

/** Jour vers lequel la feuille s'ouvre, et repas présélectionné. */
interface SheetTarget {
  planDate: string;
  meal: Meal;
}

export function WeekPlanner({
  startDate,
  days,
  planned,
  recipes,
  today,
}: {
  startDate: string;
  days: readonly string[];
  planned: readonly PlannedMeal[];
  recipes: readonly Recipe[];
  today: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<SheetTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const byRecipe = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  async function add(recipeId: number, meal: Meal, servings: number) {
    if (target === null) {
      return;
    }
    setBusy(true);
    setError(null);
    const outcome = await planMeal({ planDate: target.planDate, meal, recipeId, servings });
    setBusy(false);

    if (outcome.kind === 'planned') {
      setTarget(null);
      router.refresh();
      return;
    }
    setError(
      outcome.kind === 'unauthorized' ? 'Session expirée.' : 'Ce plat n’a pas pu être prévu.',
    );
  }

  async function remove(id: number) {
    setBusy(true);
    setError(null);
    const outcome = await unplanMeal(id);
    setBusy(false);
    if (outcome.kind === 'removed') {
      router.refresh();
      return;
    }
    setError('Suppression impossible.');
  }

  async function eat(id: number) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const outcome = await journalMeal(id);
    setBusy(false);

    if (outcome.kind === 'journaled') {
      // Les ingrédients sans fiche sont dits, jamais tus : le total de la
      // journée est plus bas qu'il ne devrait, et rien d'autre ne le dirait.
      setNotice(
        outcome.skipped.length === 0
          ? `${outcome.created === 1 ? '1 ligne ajoutée' : `${outcome.created} lignes ajoutées`} au journal.`
          : `${outcome.created} lignes ajoutées. Sans fiche, donc non comptés : ${outcome.skipped.join(', ')}.`,
      );
      router.refresh();
      return;
    }
    setError(outcome.kind === 'refused' ? outcome.message : 'Enregistrement impossible.');
  }

  async function reopen(id: number) {
    setBusy(true);
    setError(null);
    await reopenMeal(id);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <nav className="flex items-center justify-between py-2" aria-label="Semaine">
        <Link
          href={`/kitchen?from=${shiftDate(startDate, -7)}`}
          aria-label="Semaine précédente"
          className="tap-target -ml-3 flex items-center justify-center"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <Link href="/kitchen" className="kicker kicker-quiet">
          Cette semaine
        </Link>
        <Link
          href={`/kitchen?from=${shiftDate(startDate, 7)}`}
          aria-label="Semaine suivante"
          className="tap-target -mr-3 flex items-center justify-center"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
      </nav>

      {error ? (
        <p role="alert" className="mt-2 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="note mt-2">
          {notice}
        </p>
      ) : null}

      {days.map((day) => {
        const meals = planned.filter((entry) => entry.planDate === day);
        const isToday = day === today;

        return (
          <section key={day} className="mt-4">
            <div className="meal-head">
              <span className="first-letter:uppercase">
                {formatWeekday(day)} {formatDayMonth(day)}
              </span>
              {isToday ? <span className="kicker">Aujourd’hui</span> : null}
            </div>

            {meals.length === 0 ? (
              <p className="note py-2">Rien de prévu.</p>
            ) : (
              <ul>
                {meals.map((entry) => {
                  const recipe = byRecipe.get(entry.recipeId);
                  const eaten =
                    recipe === undefined
                      ? null
                      : scaleMacros(macrosPerServing(recipe).macros, entry.servings * 100);
                  const done = entry.journaledAt !== null;

                  return (
                    <li key={entry.id} className="py-2">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/kitchen/recipes/${entry.recipeId}`}
                            className="entry-name block"
                            style={done ? { opacity: 0.55 } : undefined}
                          >
                            {entry.recipeName}
                          </Link>
                          <p className="entry-meta mt-0.5">
                            {MEAL_LABELS[entry.meal]}
                            {' · '}
                            {entry.servings === 1 ? '1 part' : `${entry.servings} parts`}
                            {eaten === null ? '' : ` · ${formatKcal(eaten.kcal)} kcal`}
                          </p>
                        </div>

                        <div className="flex flex-none items-center gap-2">
                          {done ? (
                            <button
                              type="button"
                              onClick={() => void reopen(entry.id)}
                              disabled={busy}
                              className="chip"
                            >
                              Au journal
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void eat(entry.id)}
                              disabled={busy}
                              className="chip"
                              aria-pressed={false}
                            >
                              J’ai mangé
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void remove(entry.id)}
                            disabled={busy}
                            aria-label={`Retirer ${entry.recipeName} du plan`}
                            className="tap-target flex items-center justify-center"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() =>
                setTarget({
                  planDate: day,
                  // Le repas proposé suit l'heure pour aujourd'hui, et le dîner
                  // pour les autres jours : c'est le repas qu'on planifie.
                  meal: isToday ? mealForHour(new Date().getHours()) : 'dinner',
                })
              }
              className="action-quiet mt-1"
            >
              <PlusIcon className="h-4 w-4" />
              Prévoir un plat
            </button>
          </section>
        );
      })}

      <PlanMealSheet
        open={target !== null}
        planDate={target?.planDate ?? startDate}
        meal={target?.meal ?? 'dinner'}
        recipes={recipes}
        busy={busy}
        onClose={() => setTarget(null)}
        onConfirm={(recipeId, meal, servings) => void add(recipeId, meal, servings)}
      />
    </>
  );
}
