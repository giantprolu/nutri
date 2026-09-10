import type { Entry } from '@/lib/types';
import { formatGrams, formatKcal } from '@/lib/nutrition';

/**
 * Liste des entrées d'un journal, en lecture (FR-4, FR-21).
 * Les valeurs affichées sont les macros figées de l'entrée : cette liste ne
 * consulte jamais une table de référence (AD-1).
 */
export function EntryList({
  entries,
  className,
}: {
  entries: readonly Entry[];
  className?: string;
}) {
  return (
    <ul className={`divide-y divide-base-300 ${className ?? ''}`}>
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-baseline justify-between gap-3 py-3">
          <span className="min-w-0 flex-1 truncate text-sm">{entry.foodLabel}</span>
          <span className="tabular shrink-0 text-xs text-ink-secondary">
            {formatGrams(entry.quantityG)} g
          </span>
          <span className="tabular w-16 shrink-0 text-right text-sm">
            {formatKcal(entry.macros.kcal)}
          </span>
        </li>
      ))}
    </ul>
  );
}
