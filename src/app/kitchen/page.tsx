import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { KitchenIcon } from '@/components/icons';
import { requireUserId } from '@/server/guard';
import { basketFor } from '@/server/services/basket';
import { planForWeek, weekDays } from '@/server/services/meal-plan';
import { recipesFor } from '@/server/services/recipes';
import { formatWeekRange, isJournalDate, startOfWeek, todayInParis } from '@/lib/date';
import { WeekBasket } from './WeekBasket';
import { WeekPlanner } from './WeekPlanner';

// Le plan vient du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/**
 * La Cuisine s'ouvre sur la semaine, et non sur les recettes.
 *
 * L'ordre n'est pas neutre. On ouvre cet écran pour savoir ce qu'on mange ce
 * soir, pas pour relire ses fiches : c'est la question quotidienne, et c'est
 * elle qui doit être en première page. Les recettes sont l'outil, la semaine
 * est l'usage.
 *
 * Le panier vient avant le plan pour la même raison. Il porte les deux gestes
 * du début de semaine — choisir, puis acheter — et le plan celui du soir même.
 * Un écran qui ouvrirait sur sept jours vides demanderait de décider lundi ce
 * qu'on mangera jeudi, ce que personne ne sait.
 *
 * Composant serveur, aucun import client (AD-10).
 */
export default async function KitchenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const userId = await requireUserId();
  const today = todayInParis();

  // Une date hors format retombe sur la semaine courante plutôt que de faire
  // échouer l'écran : le paramètre vient d'une URL, que n'importe qui édite.
  const requested = (await searchParams).from;
  const startDate = startOfWeek(
    requested !== undefined && isJournalDate(requested) ? requested : today,
  );

  const [planned, recipes, basket] = await Promise.all([
    planForWeek(userId, startDate),
    recipesFor(userId),
    basketFor(userId, startDate),
  ]);

  const basketRecipeIds = new Set(basket.map((item) => item.recipeId));

  return (
    <>
      <ScreenHeader
        title="Cuisine"
        kicker={formatWeekRange(startDate)}
        action={{
          href: '/kitchen/recipes',
          label: 'Voir mes recettes',
          icon: <KitchenIcon className="h-[22px] w-[22px]" />,
        }}
      />

      <WeekBasket weekStart={startDate} basket={basket} />

      <hr className="rule mt-5" />

      {recipes.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mx-auto max-w-[26ch] text-[23px] leading-[1.35] font-semibold">
            Une semaine se remplit avec des plats.
          </p>
          <p className="note mx-auto mt-3 max-w-[32ch]">
            Choisis-les dans le catalogue, ou écris les tiens.
          </p>
          <Link href="/kitchen/recipes" className="action-quiet mx-auto mt-6 max-w-[240px]">
            Écrire mes propres recettes
          </Link>
        </div>
      ) : (
        <WeekPlanner
          startDate={startDate}
          days={weekDays(startDate)}
          planned={planned}
          recipes={recipes}
          basketRecipeIds={basketRecipeIds}
          today={today}
        />
      )}
    </>
  );
}
