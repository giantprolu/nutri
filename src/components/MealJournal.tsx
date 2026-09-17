'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Entry } from '@/lib/types';
import { groupByMeal } from '@/lib/journal';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import { SwipeToDeleteRow } from './SwipeToDeleteRow';

/**
 * Le journal d'une journée, groupé par repas (FR-4, FR-5, FR-21).
 *
 * Les valeurs affichées sont les macros figées de chaque entrée : cette liste
 * ne consulte jamais une table de référence (AD-1). Les sous-totaux de repas
 * sont sommés ici, à l'affichage, pour la même raison — il n'y a rien à
 * redemander à la base, tout est déjà dans les lignes.
 *
 * En lecture seule (`deletable` à faux) pour l'historique, où aucune
 * modification n'est possible : c'est la garantie des macros figées rendue
 * visible dans l'interface, et non une fonctionnalité oubliée.
 */

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <div className="flex items-center gap-3 border-b py-2.5">
      <Avatar aria-hidden className="size-[34px]">
        <AvatarFallback className="text-xs font-semibold uppercase">
          {entry.foodLabel.trim().charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium tracking-tight">{entry.foodLabel}</p>
        <p className="tabular mt-px text-[12.5px] text-muted-foreground">
          {formatGrams(entry.quantityG)} g
        </p>
      </div>
      <p className="tabular font-medium">{formatKcal(entry.macros.kcal)}</p>
    </div>
  );
}

export function MealJournal({
  entries,
  deletable = false,
}: {
  entries: readonly Entry[];
  deletable?: boolean;
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

  const sections = groupByMeal(entries.filter((entry) => !removing.has(entry.id)));

  return (
    <>
      {sections.map((section) => (
        <section key={section.meal} aria-label={section.label}>
          <div className="flex items-center justify-between pt-[18px] pb-1.5">
            <h2 className="text-[13px] font-semibold tracking-tight">{section.label}</h2>
            <Badge variant="secondary" className="tabular">
              {formatKcal(section.macros.kcal)} kcal
            </Badge>
          </div>

          <ul>
            {section.entries.map((entry) =>
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
        </section>
      ))}
    </>
  );
}
