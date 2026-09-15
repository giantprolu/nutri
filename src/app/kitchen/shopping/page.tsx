import { NavHeader } from '@/components/ScreenHeader';
import { requireUserId } from '@/server/guard';
import { currentList } from '@/server/services/shopping';
import { formatWeekRange, isJournalDate, startOfWeek, todayInParis } from '@/lib/date';
import { ShoppingList } from './ShoppingList';

export const dynamic = 'force-dynamic';

/**
 * La liste de courses.
 *
 * Composant serveur, aucun import client (AD-10). La semaine affichée est
 * celle du plan qu'on veut couvrir, et non celle de la liste existante : on
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
      <NavHeader label="Cuisine" href="/kitchen" mode="back" />

      <h1 className="display">Courses</h1>
      <p className="kicker kicker-quiet mt-1">
        {list === null ? formatWeekRange(weekStart) : formatWeekRange(list.fromDate)}
      </p>
      <hr className="rule mt-3" />

      <ShoppingList list={list} weekStart={weekStart} />
    </>
  );
}
