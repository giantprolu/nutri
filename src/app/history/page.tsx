import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { historyPage } from '@/server/services/entries';
import { requireUserId } from '@/server/guard';
import { formatMonthYear } from '@/lib/date';
import { DayRow } from './DayRow';
import { Sparkline } from './Sparkline';
import { LoadMore } from './LoadMore';

export const dynamic = 'force-dynamic';

/** Première page de l'historique. Les suivantes arrivent progressivement (FR-20). */
const PAGE_SIZE = 30;

/**
 * Liste des journaux passés (FR-20).
 * Seules les dates portant au moins une entrée apparaissent : la requête
 * groupe sur `entries`, une date sans entrée n'a donc aucune ligne.
 */
export default async function HistoryPage() {
  const days = await historyPage(await requireUserId(), PAGE_SIZE, 0);

  if (days.length === 0) {
    return (
      <>
        <ScreenHeader title="Historique" />
        <EmptyState>Rien d&apos;enregistré pour l&apos;instant.</EmptyState>
      </>
    );
  }

  // Le surtitre porte le mois du jour le plus récent : c'est là que la liste
  // commence, et non le mois courant, qui peut n'avoir aucune entrée.
  const firstDay = days[0];

  return (
    <>
      <ScreenHeader
        title="Historique"
        {...(firstDay ? { kicker: formatMonthYear(firstDay.entryDate) } : {})}
      />

      <Sparkline days={days} />
      <hr className="rule" />

      <ul>
        {days.map((day) => (
          <DayRow key={day.entryDate} day={day} />
        ))}
      </ul>

      {days.length === PAGE_SIZE ? <LoadMore initialOffset={PAGE_SIZE} /> : null}
    </>
  );
}
