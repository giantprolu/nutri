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
  /**
   * Cible fixée à la main, en kilocalories. `null` tant que l'utilisateur
   * laisse le calcul décider.
   *
   * Elle existe parce qu'aucune équation ne bat trois semaines de pesée. Celui
   * qui a constaté que sa cible calculée le fait grossir doit pouvoir la
   * corriger sans mentir sur son poids ou son niveau d'activité pour obtenir le
   * chiffre qu'il sait juste. Renseignée, elle l'emporte sur tout le reste.
   */
  manualTargetKcal: integer('manual_target_kcal'),
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
  /**
   * Groupe alimentaire de l'ANSES (`alim_grp_code`), sur deux caractères.
   *
   * Importé pour une seule raison : ranger un ingrédient au bon rayon de la
   * liste de courses. Le classement de l'ANSES vaut mieux qu'une liste de
   * mots-clés écrite à la main, et il est déjà dans le CSV.
   *
   * Nullable : les lignes importées avant l'ajout de la colonne ne l'ont pas,
   * et un réimport suffit à les remplir.
   */
  groupCode: text('group_code'),
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

/**
 * Une recette. Elle appartient à un utilisateur, comme le journal : ce qu'on
 * mange et ce qu'on prévoit de manger sont la même donnée de santé.
 *
 * Contrairement à une entrée, elle ne porte aucune valeur nutritionnelle. Ses
 * macros sont recalculées depuis les références de ses ingrédients à chaque
 * lecture. AD-1 fige le passé, pas les intentions : corriger un ingrédient mal
 * saisi doit corriger les repas à venir, et ne toucher à aucun repas déjà
 * journalisé.
 */
export const recipes = pgTable(
  'recipes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Nombre de parts que produit la recette telle qu'elle est écrite. */
    servings: numeric('servings', { precision: 4, scale: 1 }).notNull().default('1'),
    /**
     * Les étapes, dans l'ordre. Un tableau de texte plutôt qu'une table :
     * une étape n'a ni identité ni existence hors de sa recette, et rien ne
     * la référencera jamais.
     */
    steps: text('steps').array().notNull().default(sql`'{}'::text[]`),
    prepMinutes: integer('prep_minutes'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // L'utilisateur est en tête, comme partout ailleurs : aucune lecture ne
    // balaie les recettes des autres.
    index('recipes_user_name_idx').on(table.userId, table.name),
  ],
);

export type RecipeRow = typeof recipes.$inferSelect;
export type NewRecipeRow = typeof recipes.$inferInsert;

/**
 * Un ingrédient de recette : une référence, une quantité, et de quoi
 * l'afficher.
 *
 * `refKind` et `refValue` désignent la même chose que `sourceKind` et
 * `sourceRef` d'une entrée, à une valeur près : `manual` n'est pas admis. Un
 * ingrédient sans référence porterait ses propres macros et ouvrirait un
 * second chemin de calcul pour un gain nul — la table CIQUAL couvre les
 * aliments de base, et une fiche manuelle a sa place dans `products`.
 *
 * Aucune clé étrangère vers `ciqual_foods` ni `products` : la référence est
 * résolue à la lecture, et une fiche devenue introuvable doit rendre un
 * ingrédient signalé, pas une écriture impossible.
 */
export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    recipeId: bigint('recipe_id', { mode: 'number' })
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    /** Rang dans la liste, tel que l'utilisateur l'a ordonné. */
    position: integer('position').notNull(),
    refKind: text('ref_kind').notNull(),
    refValue: text('ref_value').notNull(),
    /** Désignation affichée, recopiée à la création puis librement modifiable. */
    label: text('label').notNull(),
    quantityG: nutrient('quantity_g').notNull(),
    /**
     * Unité usuelle, quand l'ingrédient se compte plutôt qu'il ne se pèse.
     * « Œufs — 300 g » n'est pas une ligne de liste de courses ; « 6 œufs »
     * en est une. Les grammes restent la source de vérité des macros, l'unité
     * n'est qu'une lecture.
     */
    unitName: text('unit_name'),
    unitGrams: nutrient('unit_grams'),
  },
  (table) => [
    index('recipe_ingredients_recipe_idx').on(table.recipeId, table.position),
    // Contrainte en base et pas seulement à la frontière HTTP : une valeur
    // hors liste rendrait l'ingrédient irrésolvable et le total muet.
    check('recipe_ingredients_ref_kind_check', sql`${table.refKind} in ('ciqual', 'product')`),
  ],
);

export type RecipeIngredientRow = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredientRow = typeof recipeIngredients.$inferInsert;

/**
 * Le plan de la semaine : un plat, un jour, un repas, un nombre de parts.
 *
 * `meal` reprend la liste de `@/lib/meal`, celle des entrées du journal. Le
 * plan et le journal parlent des mêmes repas : un dîner prévu doit tomber au
 * dîner une fois mangé, et deux listes de repas finiraient par diverger.
 *
 * `journaledAt` est la garde contre la double journalisation. Marquer un plat
 * mangé crée une entrée par ingrédient ; le marquer deux fois compterait deux
 * fois le repas, et rien dans les totaux ne le signalerait. La colonne porte
 * l'horodatage plutôt qu'un booléen : savoir *quand* le plat a été journalisé
 * permet de comprendre après coup une journée qui semble mal comptée.
 *
 * La clé étrangère vers `recipes` est en cascade : supprimer une recette
 * retire ce qu'elle avait de prévu. Les entrées déjà journalisées, elles, ne
 * bougent pas — elles portent leurs propres macros (AD-1) et ne référencent
 * ni le plan ni la recette.
 */
export const mealPlanEntries = pgTable(
  'meal_plan_entries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Jour prévu, en Europe/Paris comme le journal (AD-11). */
    planDate: date('plan_date').notNull(),
    meal: text('meal').notNull(),
    recipeId: bigint('recipe_id', { mode: 'number' })
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    /** Nombre de parts prévues, qui n'est pas celui de la recette. */
    servings: numeric('servings', { precision: 4, scale: 1 }).notNull().default('1'),
    journaledAt: timestamp('journaled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // L'utilisateur est en tête : une semaine se lit toujours pour quelqu'un.
    index('meal_plan_user_date_idx').on(table.userId, table.planDate),
    check(
      'meal_plan_meal_check',
      sql`${table.meal} in ('breakfast', 'lunch', 'dinner', 'snack')`,
    ),
  ],
);

export type MealPlanEntryRow = typeof mealPlanEntries.$inferSelect;
export type NewMealPlanEntryRow = typeof mealPlanEntries.$inferInsert;
