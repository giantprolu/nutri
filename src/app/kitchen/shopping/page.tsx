import { NavHeader, PageTitle } from '@/components/ScreenHeader';
import { requireUserId } from '@/server/guard';
import { listForWeek } from '@/server/services/shopping';
import { formatWeekRange, isJournalDate, startOfWeek, todayInParis } from '@/lib/date';
import { ShoppingList } from './ShoppingList';

export const dynamic = 'force-dynamic';

/**
 * La liste de courses.
 *
 * Composant serveur, aucun import client (AD-10). La semaine affichée est
 * celle du panier qu'on veut couvrir, et la liste lue est la sienne. C'est la
 * même semaine des deux côtés, et il le faut : régler les parts d'un plat ne
 * réécrit que la liste de cette semaine-là, si bien qu'afficher la dernière
 * liste tous comptes faits montrait au lundi suivant des courses que plus
 * aucun geste ne faisait bouger.
 *
 * Aucune liste pour cette semaine rend l'écran d'accueil, celui qui propose de
 * l'engendrer depuis le panier.
 */
export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const userId = await requireUserId();

  const requested = (await searchParams).from;
  const weekStart = startOfWeek(
    requested !== undefined && isJournalDate(requested) ? requested : todayInParis(),
  );

  const list = await listForWeek(userId, weekStart);

  return (
    <>
      <NavHeader label="Cuisine" href={`/kitchen?from=${weekStart}`} />
      <PageTitle
        title="Courses"
        description={formatWeekRange(weekStart)}
      />

      <ShoppingList list={list} weekStart={weekStart} />
    </>
  );
}
