import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/ui/button';
import { requireUserId } from '@/server/guard';
import { recipesFor } from '@/server/services/recipes';
import { macrosPerServing } from '@/lib/recipe';
import { KitchenTabs } from '../KitchenTabs';
import { RecipeGrid, type RecipeTile } from './RecipeGrid';

// Les recettes viennent du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/**
 * Les recettes d'un compte.
 *
 * C'est le carnet, pas le point d'entrée. On arrive ici pour relire ou
 * corriger une fiche ; la semaine se remplit depuis le catalogue, qui met les
 * plats choisis au panier et donc à la liste de courses.
 *
 * Les macros affichées sont celles d'une part et non de la recette entière :
 * c'est la seule grandeur qu'on compare à une cible, et la seule qu'on mange.
 */
export default async function RecipesPage() {
  const recipes = await recipesFor(await requireUserId());

  const tiles: RecipeTile[] = recipes.map((recipe) => {
    const { macros, unresolvedCount } = macrosPerServing(recipe);
    return {
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      kcalPerServing: macros.kcal,
      partial: unresolvedCount > 0,
    };
  });

  return (
    <div className="pb-16">
      <ScreenHeader
        title="Cuisine"
        kicker={recipes.length === 1 ? '1 recette' : `${recipes.length} recettes`}
      />

      <KitchenTabs current="recipes" />

      {recipes.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mx-auto max-w-[26ch] text-lg font-semibold tracking-tight">
            Aucune recette pour l’instant.
          </p>
          <p className="mx-auto mt-2 max-w-[32ch] text-muted-foreground">
            Le plus rapide est de choisir des plats dans le catalogue : ils s’installent ici et
            partent directement en liste de courses.
          </p>
          <Button asChild className="mt-5">
            <Link href="/kitchen/catalog">Parcourir le catalogue</Link>
          </Button>
        </div>
      ) : (
        <RecipeGrid recipes={tiles} />
      )}

      <Button
        asChild
        size="icon"
        className="fixed right-[max(1.25rem,calc(50vw-16rem+1.25rem))] bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 size-14 rounded-full shadow-[0_8px_20px_-4px_rgb(0_0_0/0.35)]"
      >
        <Link href="/kitchen/recipes/new" aria-label="Nouvelle recette">
          <PlusIcon className="size-6" />
        </Link>
      </Button>
    </div>
  );
}
