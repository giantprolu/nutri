import {
  bigserial,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Schéma Drizzle. `snake_case` en base, `camelCase` en TypeScript
 * (spine, conventions de nommage).
 *
 * Aucune table ne porte de notion de propriétaire (AD-7).
 * Toutes les colonnes nutritionnelles sont en numeric(10,3) (AD-9).
 */

/** Précision commune à toute valeur nutritionnelle (AD-9). */
const nutrient = (name: string) => numeric(name, { precision: 10, scale: 3 });

/**
 * Le journal. Une entrée porte ses propres macros, déjà multipliées par la
 * quantité, et une copie de la désignation. Aucune clé étrangère ne la relie
 * à une table de référence : l'historique ne doit jamais bouger (AD-1).
 */
export const entries = pgTable(
  'entries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** Date du journal, déterminée en Europe/Paris (AD-11). */
    entryDate: date('entry_date').notNull(),
    /** Désignation figée au moment de l'enregistrement (AD-1). */
    foodLabel: text('food_label').notNull(),
    quantityG: nutrient('quantity_g').notNull(),
    kcal: nutrient('kcal').notNull(),
    proteinG: nutrient('protein_g').notNull(),
    carbsG: nutrient('carbs_g').notNull(),
    fatG: nutrient('fat_g').notNull(),
    /** `ciqual`, `product` ou `manual`. Diagnostic et raccourcis, jamais affichage. */
    sourceKind: text('source_kind').notNull(),
    /** Code CIQUAL ou code-barres. Null pour une entrée ad hoc (FR-25). */
    sourceRef: text('source_ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('entries_entry_date_idx').on(table.entryDate),
    // Sert les raccourcis de quantité : dernières quantités pour un aliment (FR-9).
    index('entries_source_idx').on(table.sourceKind, table.sourceRef, table.createdAt),
  ],
);

export type EntryRow = typeof entries.$inferSelect;
export type NewEntryRow = typeof entries.$inferInsert;
