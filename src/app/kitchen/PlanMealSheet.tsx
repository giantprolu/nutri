import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { MEALS, MEAL_SHORT_LABELS, type Meal } from '@/lib/meal';
import { formatWeekday, formatDayMonth } from '@/lib/date';
import { macrosPerServing, type Recipe } from '@/lib/recipe';
import { formatKcal, scaleMacros } from '@/lib/nutrition';

/**
 * Feuille d'ajout d'un plat au plan.
 *
 * Rendue dans un `<dialog>` natif, comme `AddSheet` et pour les mêmes raisons :
 * le navigateur fournit la couche supérieure, le piège à focus et la fermeture
 * par la touche d'échappement.
 *
 * L'ordre des questions suit celui de la décision réelle. On sait quel jour on
 * remplit — c'est le bouton qu'on vient de toucher — et on cherche quoi y
 * mettre ; le repas et les parts se règlent après, et tombent juste le plus
 * souvent sans qu'on y touche.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis
 * WeekPlanner, qui la porte déjà.
 */

/** Ce qu'on mange d'un plat, par défaut. Une part : on cuisine pour plusieurs jours. */
const DEFAULT_SERVINGS = 1;

export function PlanMealSheet({
  open,
  planDate,
  meal: initialMeal,
  recipes,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  planDate: string;
  meal: Meal;
  recipes: readonly Recipe[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (recipeId: number, meal: Meal, servings: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [servings, setServings] = useState(DEFAULT_SERVINGS);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Le repas suit le bouton touché : ouvrir la feuille depuis le dîner de
  // jeudi ne doit pas proposer le déjeuner.
  useEffect(() => {
    setMeal(initialMeal);
    setServings(DEFAULT_SERVINGS);
  }, [initialMeal, planDate, open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      aria-label="Prévoir un plat"
      className="sheet"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="kicker first-letter:uppercase">
            {formatWeekday(planDate)} {formatDayMonth(planDate)}
          </p>
          <h2 className="display-sm mt-1">Prévoir un plat</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="tap-target -mr-2 flex items-center justify-center opacity-55"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="segmented mt-4" role="group" aria-label="Repas">
        {MEALS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setMeal(candidate)}
            aria-pressed={meal === candidate}
          >
            {MEAL_SHORT_LABELS[candidate]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="label mb-0 flex-1" htmlFor="plan-servings">
          Parts mangées
        </label>
        <input
          id="plan-servings"
          type="number"
          inputMode="decimal"
          min={0.5}
          step={0.5}
          value={servings}
          onChange={(event) => setServings(Number(event.target.value))}
          className="field w-[92px] text-right text-[17px]"
        />
      </div>

      <hr className="rule mt-4" />

      {recipes.length === 0 ? (
        <p className="note py-6 text-center">Aucune recette à prévoir pour l&apos;instant.</p>
      ) : (
        <ul>
          {recipes.map((recipe) => {
            const per = macrosPerServing(recipe);
            // Ce qui compte est ce qu'on va manger, pas ce que la recette
            // produit : une part de plus double le chiffre affiché.
            const eaten = scaleMacros(per.macros, servings * 100);
            return (
              <li key={recipe.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onConfirm(recipe.id, meal, servings)}
                  className="entry-row items-center"
                >
                  <span className="min-w-0 flex-1">
                    <span className="entry-name block">{recipe.name}</span>
                    <span className="entry-meta mt-0.5 block">
                      {recipe.ingredients.length === 1
                        ? '1 ingrédient'
                        : `${recipe.ingredients.length} ingrédients`}
                      {recipe.prepMinutes === null ? '' : ` · ${recipe.prepMinutes} min`}
                    </span>
                  </span>
                  <span className="entry-kcal flex-none">
                    {per.unresolvedCount > 0 ? '≈ ' : ''}
                    {formatKcal(eaten.kcal)} kcal
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </dialog>
  );
}
