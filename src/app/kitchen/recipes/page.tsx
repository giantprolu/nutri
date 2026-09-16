import Link from 'next/link';
import { NavHeader } from '@/components/ScreenHeader';
import { PlusIcon } from '@/components/icons';
import { requireUserId } from '@/server/guard';
import { recipesFor } from '@/server/services/recipes';
import { macrosPerServing } from '@/lib/recipe';
import { formatKcal } from '@/lib/nutrition';

// Les recettes viennent du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/**
 * Les recettes d'un compte.
 *
 * C'est le carnet, pas le point d'entrée. On arrive ici pour relire ou
 * corriger une fiche ; la semaine se remplit depuis le catalogue, qui met les
 * plats choisis au panier et donc à la liste de courses. Une recette installée
 * par ce carnet n'est prévue nulle part, et c'est très bien : toutes les
 * recettes n'ont pas vocation à passer par les courses de la semaine.
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
        <div className="py-8 text-center">
          <p className="mx-auto max-w-[26ch] text-[23px] leading-[1.35] font-semibold">
            Aucune recette pour l’instant.
          </p>
          <p className="note mx-auto mt-3 max-w-[32ch]">
            Le plus rapide est de choisir des plats dans le catalogue : ils s’installent ici et
            partent directement en liste de courses.
          </p>
          <Link href="/kitchen/catalog" className="action mx-auto mt-6 max-w-[260px]">
            Parcourir le catalogue
          </Link>
          <p className="note mt-4">
            Ou{' '}
            <Link href="/kitchen/recipes/new" className="link-accent">
              écris ta première recette
            </Link>
          </p>
        </div>
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
