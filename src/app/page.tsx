import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DayDial } from '@/components/DayDial';
import { MealJournal } from '@/components/MealJournal';
import { PlusIcon } from '@/components/icons';
import { journalForToday } from '@/server/services/entries';
import { requireUserId } from '@/server/guard';
import { targetFor } from '@/server/services/profile';
import { formatJournalDate, todayInParis } from '@/lib/date';

// Le journal vient du serveur à chaque navigation : rien n'est mis en cache (AD-5).
export const dynamic = 'force-dynamic';

/**
 * Journal du jour (FR-4). Composant serveur : aucun import client (AD-10).
 *
 * Le surtitre porte la date en toutes lettres et non « Aujourd'hui » : cet
 * écran ne montre jamais autre chose que le jour même, et le dire deux fois
 * serait du remplissage. La date, elle, situe.
 */
export default async function JournalPage() {
  const today = todayInParis();
  const userId = await requireUserId();
  const [{ totals, entries }, target] = await Promise.all([
    journalForToday(userId),
    targetFor(userId),
  ]);

  return (
    <>
      <ScreenHeader title="Journal" kicker={formatJournalDate(today)} />

      <DayDial
        macros={totals.macros}
        target={
          target === null
            ? null
            : {
                targetKcal: target.targetKcal,
                proteinG: target.proteinG,
                carbsG: target.carbsG,
                fatG: target.fatG,
              }
        }
      />

      <hr className="rule" />

      {entries.length === 0 ? (
        <>
          <div className="py-8 text-center">
            <p className="mx-auto max-w-[24ch] text-[23px] leading-[1.35] font-semibold">
              Le premier geste de la journée tient en trois touches.
            </p>
            <p className="note mx-auto mt-3 max-w-[30ch]">
              Scanne un code-barres, cherche un nom, ou photographie l&apos;assiette.
            </p>
            <Link href="/add" className="action mx-auto mt-6 max-w-[220px]">
              <PlusIcon className="h-4 w-4" />
              Ajouter une entrée
            </Link>
          </div>
          <hr className="rule" />
        </>
      ) : (
        <MealJournal entries={entries} deletable />
      )}

      {target === null ? (
        <p className="note mt-4 text-center">
          Pas de cible calorique définie.{' '}
          <Link href="/profile" className="link-accent">
            La calculer en une minute
          </Link>
        </p>
      ) : null}
    </>
  );
}
