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
      <Link
        href={`/history/${day.entryDate}`}
        className="tap-target flex items-baseline justify-between gap-3 py-3"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm capitalize">
            {formatRelativeJournalDate(day.entryDate)}
          </span>
          <span className="tabular mt-0.5 block text-xs text-ink-secondary">
            {formatGrams(day.macros.proteinG)} P · {formatGrams(day.macros.carbsG)} G ·{' '}
            {formatGrams(day.macros.fatG)} L
          </span>
        </span>
        <span className="tabular shrink-0 text-sm">{formatKcal(day.macros.kcal)} kcal</span>
      </Link>
    </li>
  );
}
