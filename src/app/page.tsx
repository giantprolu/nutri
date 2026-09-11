import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { TotalsCard } from '@/components/TotalsCard';
import { EntryList } from '@/components/EntryList';
import { journalForToday } from '@/server/services/entries';
import { requireUserId } from '@/server/guard';
import { targetFor } from '@/server/services/profile';
import Link from 'next/link';
import { formatRelativeJournalDate, todayInParis } from '@/lib/date';

// Le journal vient du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/** Journal du jour (FR-4). Composant serveur : aucun import client (AD-10). */
export default async function JournalPage() {
  const today = todayInParis();
  const userId = await requireUserId();
  const [{ totals, entries }, target] = await Promise.all([
    journalForToday(userId),
    targetFor(userId),
  ]);

  return (
    <>
      <ScreenHeader title="Journal" subtitle={formatRelativeJournalDate(today)} />
      <TotalsCard
        macros={totals.macros}
        {...(target === null ? {} : { targetKcal: target.targetKcal })}
      />

      {target === null ? (
        <Link
          href="/profile"
          className="tap-target mt-3 block rounded-box border border-base-300 bg-base-200 p-4 text-sm"
        >
          Calculer ma cible calorique
          <span className="mt-1 block text-xs text-ink-secondary">
            Quelques mesures, et le journal affichera ce qu&apos;il te reste.
          </span>
        </Link>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState>Aucune entrée aujourd&apos;hui.</EmptyState>
      ) : (
        <EntryList entries={entries} deletable className="mt-4" />
      )}
    </>
  );
}
