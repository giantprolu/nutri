import { notFound } from 'next/navigation';
import { NavHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { DayBreakdown } from '@/components/DayBreakdown';
import { MealJournal } from '@/components/MealJournal';
import { journalForDate } from '@/server/services/entries';
import { requireUserId } from '@/server/guard';
import { formatJournalDate, formatRelativeJournalDate, isJournalDate } from '@/lib/date';

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

  const { totals, entries } = await journalForDate(await requireUserId(), date);

  // Le titre dit la distance, le surtitre dit la date. « Hier » situe dans la
  // mémoire, « vendredi 13 septembre » situe dans le calendrier ; il faut les
  // deux, et pour une date ancienne les deux se confondent.
  const relative = formatRelativeJournalDate(date);
  const absolute = formatJournalDate(date);

  return (
    <>
      <NavHeader label="Historique" href="/history" mode="back" />

      <div className="pt-3">
        <p className="kicker first-letter:uppercase">{absolute}</p>
        <h1 className="display first-letter:uppercase">{relative}</h1>
      </div>
      <hr className="rule mt-4" />

      {entries.length === 0 ? (
        <EmptyState>Aucune entrée ce jour-là.</EmptyState>
      ) : (
        <>
          <DayBreakdown macros={totals.macros} />
          <hr className="rule" />
          <MealJournal entries={entries} />
          <p className="note mt-4 text-center">
            Journée clôturée. Les valeurs sont figées à l&apos;écriture.
          </p>
        </>
      )}
    </>
  );
}
