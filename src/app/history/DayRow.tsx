import Link from 'next/link';
import type { DayTotals } from '@/lib/types';
import { formatRelativeJournalDate } from '@/lib/date';
import { formatGrams, formatKcal } from '@/lib/nutrition';

/**
 * Une ligne de l'historique (FR-20).
 * Partagée entre le rendu serveur de la première page et le chargement
 * progressif des suivantes, pour que les deux soient identiques.
 */
export function DayRow({ day }: { day: DayTotals }) {
  return (
    <li>
      <Link href={`/history/${day.entryDate}`} className="entry-row items-center">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold first-letter:uppercase">
            {formatRelativeJournalDate(day.entryDate)}
          </span>
          <span className="entry-meta mt-px block">
            {formatGrams(day.macros.proteinG)} P · {formatGrams(day.macros.carbsG)} G ·{' '}
            {formatGrams(day.macros.fatG)} L
          </span>
        </span>
        <span className="figure flex-none text-[18px]">{formatKcal(day.macros.kcal)}</span>
        <span className="entry-meta flex-none">kcal</span>
      </Link>
    </li>
  );
}
