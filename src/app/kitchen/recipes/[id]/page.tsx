import { ChefHatIcon, ClockIcon, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BottomBar } from '@/components/BottomBar';
import { NavHeader } from '@/components/ScreenHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireUserId } from '@/server/guard';
import { basketFor } from '@/server/services/basket';
import { recipeFor } from '@/server/services/recipes';
import {
  formatIngredientQuantity,
  formatServings,
  ingredientsForServings,
  macrosPerServing,
  recipeMacros,
} from '@/lib/recipe';
import { formatGrams, formatKcal, scaleMacros } from '@/lib/nutrition';
import { isJournalDate, startOfWeek, todayInParis } from '@/lib/date';
import { AddToBasket } from './AddToBasket';
import { DeleteRecipe } from './DeleteRecipe';

export const dynamic = 'force-dynamic';

/**
 * Fiche d'une recette.
 *
 * Les macros affichées sont celles d'une part, et le total n'est rappelé qu'en
 * second : on ne mange pas une recette, on en mange une part. C'est aussi la
 * seule grandeur comparable à la cible de la journée.
 *
 * Les quantités, elles, sont celles du panier quand le plat y figure, et non
 * celles écrites dans la recette. On ouvre cette fiche depuis sa liste de
 * repas, le sac de courses posé sur la table : le riz qu'on y a mis pèse ce
 * que la liste a fait acheter, pas ce que la recette annonçait pour un nombre
 * de parts qu'on a changé depuis.
 */
export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const userId = await requireUserId();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }

  const recipe = await recipeFor(userId, id);
  if (recipe === null) {
    notFound();
  }

  // La semaine d'où l'on vient, à défaut celle du jour : on arrive ici depuis
  // le panier d'une semaine précise, et c'est son panier qui décide des
  // quantités. Une date hors format retombe sur la semaine courante plutôt que
  // de faire échouer l'écran, le paramètre venant d'une URL.
  const requested = (await searchParams).from;
  const weekStart = startOfWeek(
    requested !== undefined && isJournalDate(requested) ? requested : todayInParis(),
  );
  const basket = await basketFor(userId, weekStart);
  const chosen = basket.find((item) => item.recipeId === recipe.id) ?? null;

  // Hors panier, la recette parle pour elle-même : ses propres parts.
  const servings = chosen === null ? recipe.servings : chosen.servings;
  const ingredients = ingredientsForServings(recipe.ingredients, recipe.servings, servings);

  // La part reste la part : la mise à l'échelle ne la change pas, et c'est
  // pourquoi elle se lit sur la recette et non sur les quantités affichées.
  const perServing = macrosPerServing(recipe);
  const batch = recipeMacros(ingredients);
  const hasSteps = recipe.steps.length > 0;

  return (
    <>
      <NavHeader
        label="Recettes"
        href="/kitchen/recipes"
        action={
          <Button asChild variant="ghost" size="icon">
            <Link href={`/kitchen/recipes/${recipe.id}/edit`} aria-label="Modifier la recette">
              <PencilIcon className="size-[19px]" />
            </Link>
          </Button>
        }
      />

      <div aria-hidden className="hatch h-[150px] rounded-xl border" />

      <h1 className="mt-4 text-[22px] font-semibold tracking-tight">{recipe.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {recipe.prepMinutes === null ? null : (
          <Badge variant="outline" className="tabular">
            <ClockIcon />
            {recipe.prepMinutes} min
          </Badge>
        )}
        <Badge variant="outline" className="tabular">
          {formatServings(servings)}
        </Badge>
        {chosen === null ? null : <Badge variant="secondary">Au panier</Badge>}
      </div>

      <Card className="mt-4 bg-muted">
        <CardContent className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-muted-foreground">Par part</p>
            <p className="tabular mt-px text-[26px] font-semibold tracking-tight">
              {perServing.unresolvedCount > 0 ? '≈ ' : ''}
              {formatKcal(perServing.macros.kcal)} kcal
            </p>
          </div>
          <p className="tabular text-right text-[12.5px] text-muted-foreground">
            {formatGrams(perServing.macros.proteinG)} g P · {formatGrams(perServing.macros.carbsG)}{' '}
            g G · {formatGrams(perServing.macros.fatG)} g L
          </p>
        </CardContent>
      </Card>

      {perServing.unresolvedCount > 0 ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>
            {perServing.unresolvedCount === 1
              ? "Un ingrédient n'a plus de fiche nutritionnelle : le total est incomplet."
              : `${perServing.unresolvedCount} ingrédients n'ont plus de fiche nutritionnelle : le total est incomplet.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="ingredients" className="mt-4 gap-0">
        <TabsList className="w-full">
          <TabsTrigger value="ingredients">Ingrédients</TabsTrigger>
          <TabsTrigger value="steps" disabled={!hasSteps}>
            Préparation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="mt-2.5">
          {/*
            Dit dès qu'il y a un écart, et seulement alors : une quantité qui
            n'est pas celle de la recette doit s'expliquer sur-le-champ, sinon
            c'est la fiche qu'on soupçonne d'avoir tort.
          */}
          {chosen !== null && servings !== recipe.servings ? (
            <p className="mb-2.5 text-[12.5px] text-muted-foreground">
              Quantités pour les {formatServings(servings)} du panier de la semaine, celles-là
              mêmes que la liste de courses a fait acheter. La recette, telle qu&apos;elle est
              écrite, en produit {formatServings(recipe.servings)}.
            </p>
          ) : null}
          <ul>
            {ingredients.map((ingredient) => (
              <li key={ingredient.id} className="flex items-center gap-3 border-b py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium tracking-tight">
                    {ingredient.label}
                  </span>
                  <span className="tabular mt-px block text-[12.5px] text-muted-foreground">
                    {formatIngredientQuantity(ingredient)}
                  </span>
                </span>
                <span className="tabular flex-none text-muted-foreground">
                  {ingredient.per100g === null ? (
                    <span className="text-destructive">—</span>
                  ) : (
                    `${formatKcal(scaleMacros(ingredient.per100g, ingredient.quantityG).kcal)} kcal`
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="tabular mt-3 text-muted-foreground">
            {formatServings(servings)} en tout {batch.unresolvedCount > 0 ? '≈ ' : ''}
            {formatKcal(batch.macros.kcal)} kcal
          </p>
        </TabsContent>

        {hasSteps ? (
          <TabsContent value="steps" className="mt-3">
            <ol className="flex flex-col gap-3">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span
                    aria-hidden
                    className="tabular flex size-6 flex-none items-center justify-center rounded-full bg-muted text-[12px] font-semibold"
                  >
                    {index + 1}
                  </span>
                  <span className="text-[15px] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </TabsContent>
        ) : null}
      </Tabs>

      <DeleteRecipe id={recipe.id} name={recipe.name} />

      <BottomBar className="flex gap-2.5">
        <AddToBasket
          recipeId={recipe.id}
          servings={recipe.servings}
          weekStart={weekStart}
          alreadyChosen={chosen !== null}
        />
        {hasSteps ? (
          <Button asChild className="flex-[1.4]">
            <Link href={`/kitchen/recipes/${recipe.id}/cook`}>
              <ChefHatIcon />
              Cuisiner pas à pas
            </Link>
          </Button>
        ) : null}
      </BottomBar>
    </>
  );
}
