import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '../client';
import type { DayTotals, Entry, Macros, SourceKind } from '@/lib/types';

/**
 * Accès aux données du journal.
 *
 * Toute lecture porte sur `entries` seule : aucune jointure vers une table de
 * référence, sous peine de faire bouger l'historique (AD-1). Les sommes sont
 * calculées par Postgres, en numeric, pour éviter la dérive flottante (AD-9).
 */

/** Les colonnes numeric arrivent en chaîne par le pilote : conversion unique ici. */
function toNumber(value: string | null): number {
  return value === null ? 0 : Number(value);
}

function toEntry(row: typeof schema.entries.$inferSelect): Entry {
  return {
    id: row.id,
    entryDate: row.entryDate,
    foodLabel: row.foodLabel,
    quantityG: toNumber(row.quantityG),
    macros: {
      kcal: toNumber(row.kcal),
      proteinG: toNumber(row.proteinG),
      carbsG: toNumber(row.carbsG),
      fatG: toNumber(row.fatG),
    },
    sourceKind: row.sourceKind as SourceKind,
    sourceRef: row.sourceRef,
  };
}

/** Les entrées d'une date, dans l'ordre de saisie (FR-4). */
export async function listEntriesForDate(entryDate: string): Promise<Entry[]> {
  const rows = await db()
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.entryDate, entryDate))
    .orderBy(asc(schema.entries.createdAt), asc(schema.entries.id));
  return rows.map(toEntry);
}

/** Totaux d'une date, sommés par Postgres (FR-4, AD-9). */
export async function totalsForDate(entryDate: string): Promise<DayTotals> {
  const [row] = await db()
    .select({
      kcal: sql<string>`coalesce(sum(${schema.entries.kcal}), 0)`,
      proteinG: sql<string>`coalesce(sum(${schema.entries.proteinG}), 0)`,
      carbsG: sql<string>`coalesce(sum(${schema.entries.carbsG}), 0)`,
      fatG: sql<string>`coalesce(sum(${schema.entries.fatG}), 0)`,
      entryCount: sql<string>`count(*)`,
    })
    .from(schema.entries)
    .where(eq(schema.entries.entryDate, entryDate));

  const macros: Macros = {
    kcal: toNumber(row?.kcal ?? null),
    proteinG: toNumber(row?.proteinG ?? null),
    carbsG: toNumber(row?.carbsG ?? null),
    fatG: toNumber(row?.fatG ?? null),
  };

  return { entryDate, macros, entryCount: Number(row?.entryCount ?? 0) };
}

/** Les dates renseignées, de la plus récente à la plus ancienne (FR-20). */
export async function listDayTotals(limit: number, offset: number): Promise<DayTotals[]> {
  const rows = await db()
    .select({
      entryDate: schema.entries.entryDate,
      kcal: sql<string>`sum(${schema.entries.kcal})`,
      proteinG: sql<string>`sum(${schema.entries.proteinG})`,
      carbsG: sql<string>`sum(${schema.entries.carbsG})`,
      fatG: sql<string>`sum(${schema.entries.fatG})`,
      entryCount: sql<string>`count(*)`,
    })
    .from(schema.entries)
    .groupBy(schema.entries.entryDate)
    .orderBy(desc(schema.entries.entryDate))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    entryDate: row.entryDate,
    macros: {
      kcal: toNumber(row.kcal),
      proteinG: toNumber(row.proteinG),
      carbsG: toNumber(row.carbsG),
      fatG: toNumber(row.fatG),
    },
    entryCount: Number(row.entryCount),
  }));
}

export interface InsertEntryInput {
  entryDate: string;
  foodLabel: string;
  quantityG: number;
  macros: Macros;
  sourceKind: SourceKind;
  sourceRef: string | null;
}

/** Écrit une entrée avec ses macros déjà figées (FR-10, AD-1). */
export async function insertEntry(input: InsertEntryInput): Promise<Entry> {
  const [row] = await db()
    .insert(schema.entries)
    .values({
      entryDate: input.entryDate,
      foodLabel: input.foodLabel,
      quantityG: String(input.quantityG),
      kcal: String(input.macros.kcal),
      proteinG: String(input.macros.proteinG),
      carbsG: String(input.macros.carbsG),
      fatG: String(input.macros.fatG),
      sourceKind: input.sourceKind,
      sourceRef: input.sourceRef,
    })
    .returning();

  if (!row) {
    throw new Error("L'entrée n'a pas été écrite.");
  }
  return toEntry(row);
}

/** Supprime une entrée (FR-5). Renvoie faux si elle n'existait pas. */
export async function deleteEntry(id: number): Promise<boolean> {
  const rows = await db()
    .delete(schema.entries)
    .where(eq(schema.entries.id, id))
    .returning({ id: schema.entries.id });
  return rows.length > 0;
}

/**
 * Les dernières quantités distinctes saisies pour un aliment (FR-9).
 * Une entrée ad hoc n'a pas de référence : on retombe sur la désignation.
 */
export async function recentQuantities(
  sourceKind: SourceKind,
  sourceRef: string | null,
  foodLabel: string,
  limit = 2,
): Promise<number[]> {
  const matchesSource =
    sourceRef === null
      ? and(eq(schema.entries.sourceKind, sourceKind), eq(schema.entries.foodLabel, foodLabel))
      : and(eq(schema.entries.sourceKind, sourceKind), eq(schema.entries.sourceRef, sourceRef));

  const rows = await db()
    .select({
      quantityG: schema.entries.quantityG,
      lastUsed: sql<string>`max(${schema.entries.createdAt})`,
    })
    .from(schema.entries)
    .where(matchesSource)
    .groupBy(schema.entries.quantityG)
    .orderBy(desc(sql`max(${schema.entries.createdAt})`))
    .limit(limit);

  return rows.map((row) => Number(row.quantityG));
}
