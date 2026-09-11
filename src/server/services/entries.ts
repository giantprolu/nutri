import 'server-only';
import type { DayTotals, Entry, Macros, SourceKind } from '@/lib/types';
import { isValidQuantity, scaleMacros } from '@/lib/nutrition';
import { todayInParis } from '@/lib/date';
import {
  deleteEntry,
  insertEntry,
  listDayTotals,
  listEntriesForDate,
  recentQuantities,
  totalsForDate,
} from '../db/queries/entries';

/**
 * Service du journal.
 *
 * C'est l'unique endroit où des macros pour 100 g deviennent les macros figées
 * d'une entrée (AD-1, AD-8). Aucun autre module n'a le droit de faire ce calcul
 * avant écriture.
 */

export interface JournalView {
  totals: DayTotals;
  entries: Entry[];
}

export async function journalForDate(
  userId: number,
  entryDate: string,
): Promise<JournalView> {
  const [totals, entries] = await Promise.all([
    totalsForDate(userId, entryDate),
    listEntriesForDate(userId, entryDate),
  ]);
  return { totals, entries };
}

export function journalForToday(userId: number): Promise<JournalView> {
  return journalForDate(userId, todayInParis());
}

export interface RecordEntryInput {
  userId: number;
  foodLabel: string;
  /** Valeurs pour 100 g de l'aliment de référence, ou saisies à la main (FR-25). */
  per100g: Macros;
  quantityG: number;
  sourceKind: SourceKind;
  sourceRef: string | null;
  entryDate?: string;
}

export type RecordEntryResult =
  | { kind: 'created'; entry: Entry }
  | { kind: 'invalid_quantity' };

/** Enregistre une entrée en figeant ses macros (FR-10). */
export async function recordEntry(input: RecordEntryInput): Promise<RecordEntryResult> {
  if (!isValidQuantity(input.quantityG)) {
    return { kind: 'invalid_quantity' };
  }

  const entry = await insertEntry({
    userId: input.userId,
    entryDate: input.entryDate ?? todayInParis(),
    foodLabel: input.foodLabel,
    quantityG: input.quantityG,
    macros: scaleMacros(input.per100g, input.quantityG),
    sourceKind: input.sourceKind,
    sourceRef: input.sourceRef,
  });

  return { kind: 'created', entry };
}

export function removeEntry(userId: number, id: number): Promise<boolean> {
  return deleteEntry(userId, id);
}

export function historyPage(
  userId: number,
  limit: number,
  offset: number,
): Promise<DayTotals[]> {
  return listDayTotals(userId, limit, offset);
}

export function quantityShortcuts(
  userId: number,
  sourceKind: SourceKind,
  sourceRef: string | null,
  foodLabel: string,
): Promise<number[]> {
  return recentQuantities(userId, sourceKind, sourceRef, foodLabel);
}
