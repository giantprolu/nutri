import Link from 'next/link';
import { NavHeader } from '@/components/ScreenHeader';
import { PlusIcon } from '@/components/icons';
import { requireUserId } from '@/server/guard';
import { recipesFor } from '@/server/services/recipes';
import { macrosPerServing } from '@/lib/recipe';
import { formatKcal } from '@/lib/nutrition';
import { StarterRecipes } from './StarterRecipes';

// Les recettes viennent du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/**
 * Les recettes d'un compte.
 *
 * Composant serveur, aucun import client (AD-10). Les macros affichées sont
 * celles d'une part et non de la recette entière : c'est la seule grandeur
 * qu'on compare à une cible, et la seule qu'on mange.
 */
export default async function RecipesPage() {
  const recipes = await recipesFor(await requireUserId());

  return (
    <>
      <NavHeader label="Cuisine" href="/kitchen" mode="back" />

      <h1 className="display">Recettes</h1>
      <hr className="rule mt-3" />

      {recipes.length === 0 ? (
        <>
          <StarterRecipes />
          <hr className="rule" />
          <p className="note mt-4 text-center">
            Ou{' '}
            <Link href="/kitchen/recipes/new" className="link-accent">
              écris ta première recette
            </Link>
          </p>
        </>
      ) : (
        <>
          <ul>
            {recipes.map((recipe) => {
              const { macros, unresolvedCount } = macrosPerServing(recipe);
              return (
                <li key={recipe.id}>
                  <Link href={`/kitchen/recipes/${recipe.id}`} className="entry-row items-center">
                    <span className="min-w-0 flex-1">
                      <span className="entry-name block">{recipe.name}</span>
                      <span className="entry-meta mt-0.5 block">
                        {recipe.ingredients.length === 1
                          ? '1 ingrédient'
                          : `${recipe.ingredients.length} ingrédients`}
                        {' · '}
                        {recipe.servings === 1 ? '1 part' : `${recipe.servings} parts`}
                        {recipe.prepMinutes === null ? '' : ` · ${recipe.prepMinutes} min`}
                      </span>
                    </span>
                    <span className="flex-none text-right">
                      <span className="entry-kcal block">
                        {/*
                          Le total est dit partiel plutôt que faux : un
                          ingrédient qu'on n'a pas su résoudre fait un chiffre
                          trop bas, et rien ne le signalerait sans cela.
                        */}
                        {unresolvedCount > 0 ? '≈ ' : ''}
                        {formatKcal(macros.kcal)} kcal
                      </span>
                      <span className="entry-meta mt-0.5 block">par part</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link href="/kitchen/recipes/new" className="action mt-6">
            <PlusIcon className="h-4 w-4" />
            Nouvelle recette
          </Link>
        </>
      )}
    </>
  );
}
