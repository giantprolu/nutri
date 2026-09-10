import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { historyPage } from '@/server/services/entries';
import { DayRow } from './DayRow';
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
  const days = await historyPage(PAGE_SIZE, 0);

  if (days.length === 0) {
    return (
      <>
        <ScreenHeader title="Historique" />
        <EmptyState>Rien d&apos;enregistré pour l&apos;instant.</EmptyState>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Historique" />
      <ul className="divide-y divide-base-300">
        {days.map((day) => (
          <DayRow key={day.entryDate} day={day} />
        ))}
      </ul>

      {days.length === PAGE_SIZE ? <LoadMore initialOffset={PAGE_SIZE} /> : null}
    </>
  );
}
