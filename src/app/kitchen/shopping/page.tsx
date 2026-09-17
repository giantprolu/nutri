import { NavHeader, PageTitle } from '@/components/ScreenHeader';
import { requireUserId } from '@/server/guard';
import { currentList } from '@/server/services/shopping';
import { formatWeekRange, isJournalDate, startOfWeek, todayInParis } from '@/lib/date';
import { ShoppingList } from './ShoppingList';

export const dynamic = 'force-dynamic';

/**
 * La liste de courses.
 *
 * Composant serveur, aucun import client (AD-10). La semaine affichée est
 * celle du panier qu'on veut couvrir, et non celle de la liste existante : on
 * arrive ici pour préparer les courses de la semaine qui vient.
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

  const list = await currentList(userId);

  return (
    <>
      <NavHeader label="Cuisine" href={`/kitchen?from=${weekStart}`} />
      <PageTitle
        title="Courses"
        description={
          list === null ? formatWeekRange(weekStart) : formatWeekRange(list.fromDate)
        }
      />

      <ShoppingList list={list} weekStart={weekStart} />
    </>
  );
}
