import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Schéma Drizzle. `snake_case` en base, `camelCase` en TypeScript
 * (spine, conventions de nommage).
 *
 * Le journal, les alias et les profils appartiennent à un utilisateur et
 * portent sa clé. Les référentiels, CIQUAL et cache produits, restent communs :
 * ce sont des données publiques, les dupliquer par compte n'aurait aucun sens.
 * Toutes les colonnes nutritionnelles sont en numeric(10,3) (AD-9).
 */

/** Précision commune à toute valeur nutritionnelle (AD-9). */
const nutrient = (name: string) => numeric(name, { precision: 10, scale: 3 });

/**
 * Comptes. L'inscription est libre : aucun code d'invitation, aucune
 * vérification d'adresse, et par conséquent aucune récupération de mot de
 * passe possible, faute de service d'envoi de courriel.
 *
 * `email` est stockée normalisée en minuscules, l'unicité portant sur cette
 * forme : deux inscriptions ne doivent pas différer par une seule majuscule.
 */
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').notNull().unique(),
  /** Empreinte PBKDF2, sel et nombre de tours compris. Jamais le mot de passe. */
  passwordHash: text('password_hash').notNull(),
  /**
   * Jeton d'ingestion, pour les raccourcis iOS qui n'ont pas de cookie de
   * session. Stocké en clair, contrairement au mot de passe : l'utilisateur
   * doit pouvoir le recopier dans son raccourci. Il n'ouvre qu'une seule
   * route, en écriture, et se régénère à la demande.
   */
  ingestToken: text('ingest_token').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export type UserRow = typeof users.$inferSelect;

/**
 * Dépense d'activité mesurée, une ligne par jour et par source.
 *
 * `active_kcal` est l'énergie dépensée en plus du métabolisme de base, telle
 * que la compte Santé d'Apple. Elle s'ajoute donc au métabolisme sans le
 * recouvrir, là où un facteur d'activité le multipliait au jugé.
 *
 * La source est conservée parce que les mesures se recouvrent : une sortie
 * enregistrée sur Strava figure aussi dans Santé si la montre l'a vue. Les
 * additionner compterait deux fois la même dépense, le service en retient donc
 * une seule par jour.
 */
export const dailyActivity = pgTable(
  'daily_activity',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Jour civil, en Europe/Paris comme le journal (AD-11). */
    day: date('day').notNull(),
    /** `health` ou `strava`. */
    source: text('source').notNull(),
    activeKcal: numeric('active_kcal', { precision: 7, scale: 1 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('daily_activity_user_day_source_key').on(table.userId, table.day, table.source),
    index('daily_activity_user_day_idx').on(table.userId, table.day),
  ],
);
export type DailyActivityRow = typeof dailyActivity.$inferSelect;

/**
 * Profil corporel et objectif, un par utilisateur. Sert au calcul de la cible
 * calorique. Les mesures sont séparées du compte : elles changent souvent,
 * l'identifiant jamais.
 */
export const profiles = pgTable('profiles', {
  userId: bigint('user_id', { mode: 'number' })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** `male` ou `female`, seule distinction retenue par Mifflin-St Jeor. */
  sex: text('sex').notNull(),
  birthDate: date('birth_date').notNull(),
  heightCm: integer('height_cm').notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 1 }).notNull(),
  /** Taux de masse grasse en pourcentage, si connu. Bascule sur Katch-McArdle. */
  bodyFatPercent: numeric('body_fat_percent', { precision: 4, scale: 1 }),
  /** Une des clés de ACTIVITY_FACTORS. */
  activity: text('activity').notNull(),
  /** `lose`, `maintain` ou `gain`. */
  goal: text('goal').notNull(),
  /** Rythme visé, en pourcentage du poids par semaine. */
  ratePercentPerWeek: numeric('rate_percent_per_week', { precision: 3, scale: 2 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;

/**
 * Le journal. Une entrée porte ses propres macros, déjà multipliées par la
 * quantité, et une copie de la désignation. Aucune clé étrangère ne la relie
 * à une table de référence : l'historique ne doit jamais bouger (AD-1).
 */
export const entries = pgTable(
  'entries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Date du journal, déterminée en Europe/Paris (AD-11). */
    entryDate: date('entry_date').notNull(),
    /**
     * Repas auquel l'entrée est rattachée : `breakfast`, `lunch`, `dinner`
     * ou `snack`. Le journal se lit par repas et non à plat (DESIGN.md).
     *
     * Choisi par l'utilisateur à l'enregistrement, avec pour proposition le
     * repas correspondant à l'heure. C'est bien une colonne et non une
     * déduction à l'affichage : une entrée saisie le soir pour le déjeuner
     * oublié doit tomber au déjeuner, et l'heure de saisie ne le sait pas.
     */
    meal: text('meal').notNull().default('lunch'),
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
    // L'utilisateur est en tête de chaque index : toute lecture du journal
    // commence par lui, aucune requête ne balaie les entrées des autres.
    index('entries_user_date_idx').on(table.userId, table.entryDate),
    // Le journal d'une date se lit groupé par repas : l'index porte les trois
    // colonnes pour que le tri ne repasse pas par un balayage.
    index('entries_user_date_meal_idx').on(table.userId, table.entryDate, table.meal),
    // Le repas est contraint en base et pas seulement à la frontière HTTP :
    // les entrées sont des données de santé, et une valeur hors liste rendrait
    // un repas entier invisible au regroupement du journal.
    check(
      'entries_meal_check',
      sql`${table.meal} in ('breakfast', 'lunch', 'dinner', 'snack')`,
    ),
    // Sert les raccourcis de quantité : dernières quantités pour un aliment (FR-9).
    index('entries_user_source_idx').on(
      table.userId,
      table.sourceKind,
      table.sourceRef,
      table.createdAt,
    ),
  ],
);

export type EntryRow = typeof entries.$inferSelect;
export type NewEntryRow = typeof entries.$inferInsert;

/**
 * Cache produits (FR-14). La clé est le code-barres : un produit n'existe
 * qu'une fois, et un second scan le retrouve sans appel réseau (FR-12).
 *
 * Les valeurs sont toujours exprimées pour 100 g (AD-8). La normalisation
 * depuis Open Food Facts se fait à l'écriture, jamais à la lecture.
 */
export const products = pgTable(
  'products',
  {
    barcode: text('barcode').primaryKey(),
    name: text('name').notNull(),
    kcal100g: nutrient('kcal_100g').notNull(),
    protein100g: nutrient('protein_100g').notNull(),
    carbs100g: nutrient('carbs_100g').notNull(),
    fat100g: nutrient('fat_100g').notNull(),
    /** Portion déclarée par Open Food Facts, proposée en raccourci (FR-9). */
    servingSizeG: nutrient('serving_size_g'),
    /** `off` ou `manual` : d'où vient la fiche. */
    source: text('source').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('products_name_idx').on(table.name)],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;

/**
 * Table CIQUAL (ANSES, licence Etalab), importée depuis le CSV (FR-6).
 *
 * `isComplete` distingue les aliments exploitables : une ligne dont l'énergie
 * ou l'une des trois macros n'est pas lisible est importée quand même, pour
 * que l'import reste idempotent sur le code CIQUAL, mais exclue de la recherche.
 */
export const ciqualFoods = pgTable('ciqual_foods', {
  ciqualCode: text('ciqual_code').primaryKey(),
  name: text('name').notNull(),
  kcal100g: nutrient('kcal_100g'),
  protein100g: nutrient('protein_100g'),
  carbs100g: nutrient('carbs_100g'),
  fat100g: nutrient('fat_100g'),
  isComplete: boolean('is_complete').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CiqualFoodRow = typeof ciqualFoods.$inferSelect;
export type NewCiqualFoodRow = typeof ciqualFoods.$inferInsert;

/**
 * Alias d'aliment (FR-19) : l'association mémorisée entre un nom libre rendu
 * par le modèle de vision et l'aliment de référence choisi par l'utilisateur.
 *
 * `aliasNorm` est le nom normalisé (minuscules, sans accents) et porte
 * l'unicité : un nom libre ne porte jamais plus d'un alias.
 */
export const foodAliases = pgTable(
  'food_aliases',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    aliasNorm: text('alias_norm').notNull(),
    targetKind: text('target_kind').notNull(),
    targetRef: text('target_ref').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // L'unicité porte sur le couple, et non sur le seul nom : deux personnes
  // n'associent pas forcément « poulet » au même aliment de référence.
  (table) => [unique('food_aliases_user_alias_key').on(table.userId, table.aliasNorm)],
);

export type FoodAliasRow = typeof foodAliases.$inferSelect;
