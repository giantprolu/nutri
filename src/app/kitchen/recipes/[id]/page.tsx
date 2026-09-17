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
          {recipe.servings === 1 ? '1 part' : `${recipe.servings} parts`}
        </Badge>
        {alreadyChosen ? <Badge variant="secondary">Au panier</Badge> : null}
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
          <ul>
            {recipe.ingredients.map((ingredient) => (
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
            Recette entière {total.unresolvedCount > 0 ? '≈ ' : ''}
            {formatKcal(total.macros.kcal)} kcal
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
          alreadyChosen={alreadyChosen}
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
