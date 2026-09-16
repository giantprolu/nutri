import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NavHeader } from '@/components/ScreenHeader';
import { KitchenIcon, PencilIcon } from '@/components/icons';
import { requireUserId } from '@/server/guard';
import { basketFor } from '@/server/services/basket';
import { recipeFor } from '@/server/services/recipes';
import { formatIngredientQuantity, macrosPerServing, recipeMacros } from '@/lib/recipe';
import { formatGrams, formatKcal, scaleMacros } from '@/lib/nutrition';
import { startOfWeek, todayInParis } from '@/lib/date';
import { AddToBasket } from './AddToBasket';
import { DeleteRecipe } from './DeleteRecipe';

export const dynamic = 'force-dynamic';

/**
 * Fiche d'une recette.
 *
 * Les macros affichées sont celles d'une part, et le total de la recette n'est
 * rappelé qu'en second : on ne mange pas une recette, on en mange une part.
 * C'est aussi la seule grandeur comparable à la cible de la journée.
 */
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }

  const recipe = await recipeFor(userId, id);
  if (recipe === null) {
    notFound();
  }

  // La semaine du jour, et non celle qu'on consultait : on arrive ici depuis
  // une recherche ou un lien, et « cette semaine » ne veut dire qu'une chose.
  const weekStart = startOfWeek(todayInParis());
  const basket = await basketFor(userId, weekStart);
  const alreadyChosen = basket.some((item) => item.recipeId === recipe.id);

  const perServing = macrosPerServing(recipe);
  const total = recipeMacros(recipe.ingredients);

  return (
    <>
      <NavHeader label="Cuisine" href="/kitchen" mode="back" />

      <h1 className="display-sm">{recipe.name}</h1>
      <p className="kicker kicker-quiet mt-1">
        {recipe.servings === 1 ? '1 part' : `${recipe.servings} parts`}
        {recipe.prepMinutes === null ? '' : ` · ${recipe.prepMinutes} min`}
      </p>

      <div className="mt-5">
        <p className="figure">
          {perServing.unresolvedCount > 0 ? '≈ ' : ''}
          {formatKcal(perServing.macros.kcal)} kcal
        </p>
        <p className="entry-meta mt-1">
          par part · {formatGrams(perServing.macros.proteinG)} P ·{' '}
          {formatGrams(perServing.macros.carbsG)} G · {formatGrams(perServing.macros.fatG)} L
        </p>
      </div>

      {perServing.unresolvedCount > 0 ? (
        <p className="note mt-3" style={{ color: 'var(--color-danger)' }}>
          {perServing.unresolvedCount === 1
            ? "Un ingrédient n'a plus de fiche nutritionnelle : le total est incomplet."
            : `${perServing.unresolvedCount} ingrédients n'ont plus de fiche nutritionnelle : le total est incomplet.`}
        </p>
      ) : null}

      <hr className="rule mt-6" />
      <p className="kicker mt-4 mb-1">Ingrédients</p>

      <ul>
        {recipe.ingredients.map((ingredient) => (
          <li key={ingredient.id} className="entry-row items-center">
            <span className="min-w-0 flex-1">
              <span className="entry-name block">{ingredient.label}</span>
              <span className="entry-meta mt-0.5 block">
                {formatIngredientQuantity(ingredient)}
              </span>
            </span>
            <span className="entry-kcal flex-none">
              {ingredient.per100g === null ? (
                <span style={{ color: 'var(--color-danger)' }}>—</span>
              ) : (
                `${formatKcal(scaleMacros(ingredient.per100g, ingredient.quantityG).kcal)} kcal`
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="note mt-3">
        Recette entière : {total.unresolvedCount > 0 ? '≈ ' : ''}
        {formatKcal(total.macros.kcal)} kcal
      </p>

      {recipe.steps.length > 0 ? (
        <>
          <hr className="rule mt-6" />
          <p className="kicker mt-4 mb-2">Préparation</p>
          <ol className="space-y-3">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="kicker kicker-quiet flex-none pt-1">{index + 1}</span>
                <span className="text-[17px] leading-[1.5]">{step}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <hr className="rule mt-6" />

      {recipe.steps.length > 0 ? (
        <Link href={`/kitchen/recipes/${recipe.id}/cook`} className="action mt-4">
          <KitchenIcon className="h-4 w-4" />
          Cuisiner pas à pas
        </Link>
      ) : null}

      <AddToBasket
        recipeId={recipe.id}
        servings={recipe.servings}
        weekStart={weekStart}
        alreadyChosen={alreadyChosen}
      />

      <Link href={`/kitchen/recipes/${recipe.id}/edit`} className="action-quiet mt-3">
        <PencilIcon className="h-4 w-4" />
        Modifier
      </Link>

      <DeleteRecipe id={recipe.id} name={recipe.name} />
    </>
  );
}
