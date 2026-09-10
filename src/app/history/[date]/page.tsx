import { notFound } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { TotalsCard } from '@/components/TotalsCard';
import { EntryList } from '@/components/EntryList';
import { journalForDate } from '@/server/services/entries';
import { formatRelativeJournalDate, isJournalDate } from '@/lib/date';

export const dynamic = 'force-dynamic';

/**
 * Détail d'un journal passé (FR-21).
 *
 * En lecture seule : aucune suppression ni modification n'est possible ici.
 * C'est la garantie des macros figées rendue visible dans l'interface, et non
 * une simple omission de fonctionnalité.
 *
 * Les valeurs viennent de `entries` seule, sans jointure vers une table de
 * référence (AD-1) : corriger une fiche produit ne change rien ici.
 */
export default async function HistoryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isJournalDate(date)) {
    notFound();
  }

  const { totals, entries } = await journalForDate(date);
  if (entries.length === 0) {
    return (
      <>
        <ScreenHeader title="Historique" subtitle={formatRelativeJournalDate(date)} />
        <EmptyState>Aucune entrée ce jour-là.</EmptyState>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Historique" subtitle={formatRelativeJournalDate(date)} />
      <TotalsCard macros={totals.macros} />
      <EntryList entries={entries} className="mt-4" />
    </>
  );
}
