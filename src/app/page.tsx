import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { TotalsCard } from '@/components/TotalsCard';
import { EntryList } from '@/components/EntryList';
import { journalForToday } from '@/server/services/entries';
import { formatRelativeJournalDate, todayInParis } from '@/lib/date';

// Le journal vient du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/** Journal du jour (FR-4). Composant serveur : aucun import client (AD-10). */
export default async function JournalPage() {
  const today = todayInParis();
  const { totals, entries } = await journalForToday();

  return (
    <>
      <ScreenHeader title="Journal" subtitle={formatRelativeJournalDate(today)} />
      <TotalsCard macros={totals.macros} />

      {entries.length === 0 ? (
        <EmptyState>Aucune entrée aujourd&apos;hui.</EmptyState>
      ) : (
        <EntryList entries={entries} deletable className="mt-4" />
      )}
    </>
  );
}
