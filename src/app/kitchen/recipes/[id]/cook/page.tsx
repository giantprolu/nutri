import { notFound } from 'next/navigation';
import { requireUserId } from '@/server/guard';
import { recipeFor } from '@/server/services/recipes';
import { planForWeek } from '@/server/services/meal-plan';
import { startOfWeek, todayInParis } from '@/lib/date';
import { CookMode } from './CookMode';

export const dynamic = 'force-dynamic';

/**
 * Mode cuisine d'une recette.
 *
 * Le plat prévu aujourd'hui pour cette recette est cherché ici : s'il existe
 * et n'a pas encore été mangé, c'est lui que la fin du parcours marquera, avec
 * le nombre de parts prévu. Sans cette lecture, cuisiner un plat du plan en
 * créerait un second à côté, et la journée compterait le repas deux fois.
 */
export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }

  const recipe = await recipeFor(userId, id);
  if (recipe === null) {
    notFound();
  }

  const today = todayInParis();
  const planned = await planForWeek(userId, startOfWeek(today));
  const match = planned.find(
    (entry) =>
      entry.planDate === today && entry.recipeId === recipe.id && entry.journaledAt === null,
  );

  return (
    <CookMode
      recipe={recipe}
      plannedId={match?.id ?? null}
      plannedServings={match?.servings ?? null}
    />
  );
}
