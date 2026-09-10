'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Entry } from '@/lib/types';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import { SwipeToDeleteRow } from './SwipeToDeleteRow';

/**
 * Liste des entrées d'un journal (FR-4, FR-5, FR-21).
 * Les valeurs affichées sont les macros figées de l'entrée : cette liste ne
 * consulte jamais une table de référence (AD-1).
 *
 * En lecture seule (`deletable` à faux) pour l'historique, où aucune
 * modification n'est possible — c'est la garantie des macros figées rendue
 * visible dans l'interface.
 */

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 py-3">
      <span className="min-w-0 flex-1 truncate text-sm">{entry.foodLabel}</span>
      <span className="tabular shrink-0 text-xs text-ink-secondary">
        {formatGrams(entry.quantityG)} g
      </span>
      <span className="tabular w-16 shrink-0 text-right text-sm">
        {formatKcal(entry.macros.kcal)}
      </span>
    </div>
  );
}

export function EntryList({
  entries,
  deletable = false,
  className,
}: {
  entries: readonly Entry[];
  deletable?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<ReadonlySet<number>>(new Set());

  async function remove(id: number) {
    const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      return;
    }
    // Retrait optimiste, puis rafraîchissement serveur pour les totaux (FR-5).
    setRemoving((previous) => new Set(previous).add(id));
    router.refresh();
  }

  const visible = entries.filter((entry) => !removing.has(entry.id));

  return (
    <ul className={`divide-y divide-base-300 ${className ?? ''}`}>
      {visible.map((entry) =>
        deletable ? (
          <SwipeToDeleteRow
            key={entry.id}
            label={entry.foodLabel}
            onDelete={() => remove(entry.id)}
          >
            <EntryRow entry={entry} />
          </SwipeToDeleteRow>
        ) : (
          <li key={entry.id}>
            <EntryRow entry={entry} />
          </li>
        ),
      )}
    </ul>
  );
}
