/**
 * Import de la table CIQUAL de l'ANSES (FR-6).
 *
 * Idempotent : relancer le script ne crée aucun doublon et met à jour les
 * lignes existantes sur le code CIQUAL.
 *
 * Le CSV de l'ANSES a trois particularités qui font échouer un import naïf :
 * la virgule décimale, les valeurs de trace (« traces », « < 0,1 ») et les
 * valeurs absentes (« - »). Elles sont normalisées ici, jamais à la lecture.
 *
 * Lancement : npm run import:ciqual -- data/ciqual.csv
 * Voir B-4 de BLOCKERS.md : le fichier n'est pas versionné.
 */
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../src/server/db/schema';

import { mapColumns, parseNutrient, isCompleteRow } from './ciqual-parse';

const DEFAULT_PATH = 'data/ciqual.csv';

async function main(): Promise<void> {
  const path = process.argv[2] ?? DEFAULT_PATH;

  if (!existsSync(path)) {
    console.error(
      `Fichier introuvable : ${path}\n` +
        'Telecharge la table de composition depuis ciqual.anses.fr, place-la ' +
        `dans ${DEFAULT_PATH}, puis relance. Voir B-4 de BLOCKERS.md.`,
    );
    process.exitCode = 1;
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL n'est pas configuree. Voir B-2 de BLOCKERS.md.");
    process.exitCode = 1;
    return;
  }

  // Le CSV de l'ANSES est publié en séparateur point-virgule.
  const rows = parse(readFileSync(path), {
    columns: true,
    delimiter: [';', ','],
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  const first = rows[0];
  if (!first) {
    console.error('Le fichier ne contient aucune ligne.');
    process.exitCode = 1;
    return;
  }

  const mapping = mapColumns(Object.keys(first));
  if (!mapping.ok) {
    console.error(`Colonnes introuvables dans le CSV : ${mapping.missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const columns = mapping.columns;

  const db = drizzle(neon(databaseUrl), { schema });
  let imported = 0;
  let incomplete = 0;
  const batch: (typeof schema.ciqualFoods.$inferInsert)[] = [];

  for (const row of rows) {
    const code = row[columns.code]?.trim();
    const name = row[columns.name]?.trim();
    if (!code || !name) {
      continue;
    }

    const kcal = parseNutrient(row[columns.kcal]);
    const protein = parseNutrient(row[columns.protein]);
    const carbs = parseNutrient(row[columns.carbs]);
    const fat = parseNutrient(row[columns.fat]);
    const isComplete = isCompleteRow({ kcal, protein, carbs, fat });

    if (!isComplete) {
      incomplete += 1;
    }

    batch.push({
      ciqualCode: code,
      name,
      kcal100g: kcal === null ? null : String(kcal),
      protein100g: protein === null ? null : String(protein),
      carbs100g: carbs === null ? null : String(carbs),
      fat100g: fat === null ? null : String(fat),
      isComplete,
      updatedAt: new Date(),
    });
  }

  // Par lots : une seule requête par ligne saturerait la connexion HTTP Neon.
  const CHUNK = 200;
  for (let index = 0; index < batch.length; index += CHUNK) {
    const chunk = batch.slice(index, index + CHUNK);
    await db
      .insert(schema.ciqualFoods)
      .values(chunk)
      .onConflictDoUpdate({
        target: schema.ciqualFoods.ciqualCode,
        set: {
          name: sql`excluded.name`,
          kcal100g: sql`excluded.kcal_100g`,
          protein100g: sql`excluded.protein_100g`,
          carbs100g: sql`excluded.carbs_100g`,
          fat100g: sql`excluded.fat_100g`,
          isComplete: sql`excluded.is_complete`,
          updatedAt: sql`now()`,
        },
      });
    imported += chunk.length;
  }

  console.log(
    `${imported} aliments importes depuis ${path}` +
      (incomplete > 0 ? `, dont ${incomplete} incomplets exclus de la recherche` : ''),
  );
}

await main();
