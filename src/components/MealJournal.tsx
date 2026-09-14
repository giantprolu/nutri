'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
    <div className="entry-row">
      <span className="entry-name">{entry.foodLabel}</span>
      <span className="entry-meta">{formatGrams(entry.quantityG)} g</span>
      <span className="entry-kcal">{formatKcal(entry.macros.kcal)}</span>
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
      {sections.map((section, sectionIndex) => (
        <section key={section.meal} aria-label={section.label}>
          <div className="meal-head">
            <h2>{section.label}</h2>
            <span>{formatKcal(section.macros.kcal)} kcal</span>
          </div>

          <ul
            // Le dernier filet du dernier repas est retiré : c'est la fin du
            // journal, et un trait dans le vide se lit comme une suite absente.
            className={
              sectionIndex === sections.length - 1 ? '[&>li:last-child_.entry-row]:border-b-0' : ''
            }
          >
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
