import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '../client';
import type { SearchHit } from '@/lib/types';

/**
 * Recherche par similarité trigramme (FR-7, AD-6).
 *
 * L'opérateur retenu est `<%` (similarité de mot) et non `%` (similarité de
 * chaîne entière). La différence est décisive : `similarity('pates',
 * 'pates alimentaires, cuites')` vaut environ 0,28, sous le seuil par défaut
 * de 0,3, et la recherche ne remonterait donc rien. `word_similarity` mesure
 * la meilleure correspondance sur un extrait continu et vaut ici près de 1.
 *
 * L'expression `nutri_normalize(name)` est exactement celle de l'index GIN
 * créé en migration 0003. Toute divergence, même un `lower()` de plus, ferait
 * retomber le planificateur sur un balayage séquentiel.
 */

/**
 * Seuil de similarité en dessous duquel un candidat est écarté (FR-18).
 * Décision différée par le spine, fixée ici en constante nommée.
 *
 * La valeur reste alignée sur `pg_trgm.word_similarity_threshold`, dont le
 * défaut est 0,6. La descendre en dessous n'élargirait pas les résultats sans
 * régler aussi ce paramètre côté base, l'opérateur `<%` filtrant en amont.
 */
export const SIMILARITY_THRESHOLD = 0.6;

/** Aucune requête en dessous de trois caractères (FR-7). */
export const MIN_QUERY_LENGTH = 3;

const DEFAULT_LIMIT = 20;

interface SearchRow extends Record<string, unknown> {
  kind: 'ciqual' | 'product';
  ref: string;
  name: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  serving_size_g: string | null;
  similarity: number;
}

/**
 * Cherche dans les aliments CIQUAL et le cache produits (FR-7).
 * Les aliments incomplets sont exclus : leurs macros ne sont pas exploitables.
 */
export async function searchReferenceFoods(
  term: string,
  limit: number = DEFAULT_LIMIT,
): Promise<SearchHit[]> {
  if (term.trim().length < MIN_QUERY_LENGTH) {
    return [];
  }

  const needle = sql`nutri_normalize(${term.trim()})`;

  const rows = await db().execute<SearchRow>(sql`
    SELECT * FROM (
      SELECT
        'ciqual'::text AS kind,
        c.ciqual_code AS ref,
        c.name AS name,
        c.kcal_100g AS kcal,
        c.protein_100g AS protein,
        c.carbs_100g AS carbs,
        c.fat_100g AS fat,
        NULL::numeric AS serving_size_g,
        word_similarity(${needle}, nutri_normalize(c.name)) AS similarity
      FROM ciqual_foods c
      WHERE c.is_complete
        AND ${needle} <% nutri_normalize(c.name)

      UNION ALL

      SELECT
        'product'::text AS kind,
        p.barcode AS ref,
        p.name AS name,
        p.kcal_100g AS kcal,
        p.protein_100g AS protein,
        p.carbs_100g AS carbs,
        p.fat_100g AS fat,
        p.serving_size_g AS serving_size_g,
        word_similarity(${needle}, nutri_normalize(p.name)) AS similarity
      FROM products p
      WHERE ${needle} <% nutri_normalize(p.name)
    ) hits
    WHERE hits.similarity >= ${SIMILARITY_THRESHOLD}
    ORDER BY hits.similarity DESC, hits.name ASC
    LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    kind: row.kind,
    ref: row.ref,
    name: row.name,
    per100g: {
      kcal: Number(row.kcal),
      proteinG: Number(row.protein),
      carbsG: Number(row.carbs),
      fatG: Number(row.fat),
    },
    servingSizeG: row.serving_size_g === null ? null : Number(row.serving_size_g),
    similarity: Number(row.similarity),
  }));
}
