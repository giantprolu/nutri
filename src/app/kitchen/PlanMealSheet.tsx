import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MEALS, MEAL_SHORT_LABELS, isMeal, type Meal } from '@/lib/meal';
import { formatWeekday, formatDayMonth } from '@/lib/date';
import { macrosPerServing, type Recipe } from '@/lib/recipe';
import { formatKcal, scaleMacros } from '@/lib/nutrition';
import { MAX_PLANNED_SERVINGS } from '@/lib/basket';

/**
 * Feuille d'ajout d'un plat au plan.
 *
 * L'ordre des questions suit celui de la décision réelle. On sait quel jour on
 * remplit — c'est le bouton qu'on vient de toucher — et on cherche quoi y
 * mettre ; le repas et les parts se règlent avant, et tombent juste le plus
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
  basketRecipeIds,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  planDate: string;
  meal: Meal;
  recipes: readonly Recipe[];
  /** Recettes du panier de la semaine, présentées d'abord. */
  basketRecipeIds: ReadonlySet<number>;
  busy: boolean;
  onClose: () => void;
  onConfirm: (recipeId: number, meal: Meal, servings: number) => void;
}) {
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [servings, setServings] = useState(DEFAULT_SERVINGS);

  // Le repas suit le bouton touché : ouvrir la feuille depuis le dîner de
  // jeudi ne doit pas proposer le déjeuner.
  useEffect(() => {
    setMeal(initialMeal);
    setServings(DEFAULT_SERVINGS);
  }, [initialMeal, planDate, open]);

  // Le champ se vide en le corrigeant, et `Number('')` vaut zéro. Sans ce
  // contrôle, choisir un plat à cet instant partait au serveur pour revenir en
  // « Ce plat n'a pas pu être prévu », qui n'explique rien.
  const validServings =
    Number.isFinite(servings) && servings > 0 && servings <= MAX_PLANNED_SERVINGS;

  const chosen = recipes.filter((recipe) => basketRecipeIds.has(recipe.id));
  const others = recipes.filter((recipe) => !basketRecipeIds.has(recipe.id));

  function renderRecipe(recipe: Recipe) {
    const per = macrosPerServing(recipe);
    // Ce qui compte est ce qu'on va manger, pas ce que la recette produit :
    // une part de plus double le chiffre affiché.
    const eaten = scaleMacros(per.macros, servings * 100);
    return (
      <li key={recipe.id}>
        <button
          type="button"
          disabled={busy || !validServings}
          onClick={() => onConfirm(recipe.id, meal, servings)}
          className="flex w-full items-center gap-3 border-b py-2.5 text-left transition-colors active:bg-accent disabled:opacity-50"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium tracking-tight">
              {recipe.name}
            </span>
            <span className="tabular mt-px block text-[12.5px] text-muted-foreground">
              {recipe.ingredients.length === 1
                ? '1 ingrédient'
                : `${recipe.ingredients.length} ingrédients`}
              {recipe.prepMinutes === null ? '' : ` · ${recipe.prepMinutes} min`}
            </span>
          </span>
          <span className="tabular flex-none font-medium">
            {per.unresolvedCount > 0 ? '≈ ' : ''}
            {formatKcal(eaten.kcal)} kcal
          </span>
        </button>
      </li>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88dvh] max-w-lg gap-0 overflow-y-auto rounded-t-[20px] px-5 pt-2.5 pb-[calc(1.75rem+var(--safe-bottom))]"
      >
        <div aria-hidden className="mx-auto mb-3.5 h-1 w-11 rounded-full bg-border" />
        <SheetHeader className="p-0 pr-10">
          <SheetTitle className="text-[17px]">Prévoir un plat</SheetTitle>
          <SheetDescription className="first-letter:uppercase">
            {formatWeekday(planDate)} {formatDayMonth(planDate)}
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={meal}
          onValueChange={(value) => isMeal(value) && setMeal(value)}
          className="mt-4"
        >
          <TabsList aria-label="Repas" className="w-full">
            {MEALS.map((candidate) => (
              <TabsTrigger key={candidate} value={candidate}>
                {MEAL_SHORT_LABELS[candidate]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-3.5 flex items-center gap-3">
          <Label htmlFor="plan-servings" className="flex-1">
            Parts mangées
          </Label>
          <Input
            id="plan-servings"
            type="number"
            inputMode="decimal"
            min={0.5}
            max={MAX_PLANNED_SERVINGS}
            step={0.5}
            value={servings}
            onChange={(event) => setServings(Number(event.target.value))}
            aria-invalid={!validServings}
            aria-describedby={validServings ? undefined : 'plan-servings-error'}
            className="tabular w-[92px] text-right"
          />
        </div>
        {validServings ? null : (
          <p id="plan-servings-error" role="alert" className="mt-1.5 text-right text-destructive">
            Entre une demi-part et {MAX_PLANNED_SERVINGS} parts.
          </p>
        )}

        <Separator className="mt-4" />

        {recipes.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            Aucune recette à prévoir pour l&apos;instant.
          </p>
        ) : (
          <>
            {/*
              Les plats du panier d'abord, et séparés du reste. C'est pour eux
              qu'on a fait les courses : proposer les cent recettes du carnet sur
              le même rang obligerait à retrouver chaque soir, dans la liste,
              celles dont les ingrédients sont effectivement au frigo.
            */}
            {chosen.length > 0 ? (
              <>
                <h3 className="pt-4 pb-1 text-[12.5px] text-muted-foreground">
                  Au panier cette semaine
                </h3>
                <ul>{chosen.map(renderRecipe)}</ul>
              </>
            ) : null}

            {others.length > 0 ? (
              <>
                {chosen.length > 0 ? (
                  <h3 className="pt-4 pb-1 text-[12.5px] text-muted-foreground">
                    Mes autres recettes
                  </h3>
                ) : null}
                <ul>{others.map(renderRecipe)}</ul>
              </>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
