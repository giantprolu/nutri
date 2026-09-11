import 'server-only';
import { sql } from 'drizzle-orm';
import { db, schema } from '../client';

/**
 * Dépense d'activité mesurée.
 *
 * Santé d'Apple est la seule source. Strava a été écarté : son interface exige
 * un abonnement payant depuis juin 2026 (voir B-9 de BLOCKERS.md). La colonne
 * `source` reste en base, au cas où une autre source arriverait, mais une
 * seule valeur est acceptée aujourd'hui.
 *
 * Si une deuxième source apparaît un jour, ne pas sommer les lignes d'une
 * même journée : deux capteurs qui voient la même sortie compteraient deux
 * fois la même dépense. Il faudra en élire une, comme le fait la requête
 * ci-dessous avec son `max` par journée.
 */

export type ActivitySource = 'health';

/**
 * Écrit la dépense d'un jour pour une source. Le même jour renvoyé deux fois
 * écrase la valeur précédente : une journée en cours est réémise au fil des
 * heures, et c'est la dernière mesure qui vaut.
 */
export async function upsertDailyActivity(
  userId: number,
  day: string,
  source: ActivitySource,
  activeKcal: number,
): Promise<void> {
  await db()
    .insert(schema.dailyActivity)
    .values({ userId, day, source, activeKcal: String(activeKcal), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [
        schema.dailyActivity.userId,
        schema.dailyActivity.day,
        schema.dailyActivity.source,
      ],
      set: { activeKcal: sql`excluded.active_kcal`, updatedAt: sql`now()` },
    });
}

export interface ActivityBaseline {
  /** Moyenne journalière retenue, en kilocalories. */
  averageActiveKcal: number;
  /** Nombre de journées complètes ayant servi à la moyenne. */
  dayCount: number;
}

/**
 * Moyenne des dépenses sur la fenêtre précédant `today`, jour courant exclu.
 *
 * Une moyenne plutôt que la valeur du jour, et c'est le point important : au
 * réveil, la dépense du jour vaut zéro, et une cible qui en dépendrait
 * s'effondrerait chaque matin pour remonter le soir. La moyenne récente
 * remplace le multiplicateur deviné par un multiplicateur constaté, sans
 * introduire cette instabilité.
 */
export async function activityBaseline(
  userId: number,
  today: string,
  windowDays: number,
): Promise<ActivityBaseline> {
  // Les bornes sont calculées en JavaScript plutôt qu'en SQL : le pilote HTTP
  // envoie ses paramètres en texte, et `date - $n` n'a alors pas d'opérateur.
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - windowDays);
  const from = start.toISOString().slice(0, 10);

  const result = await db().execute<{ average: string | null; days: string }>(sql`
    SELECT avg(kcal) AS average, count(*) AS days
    FROM (
      SELECT max(active_kcal) AS kcal
      FROM daily_activity
      WHERE user_id = ${userId}
        AND day < ${today}
        AND day >= ${from}
      GROUP BY day
    ) AS per_day
  `);

  const row = result.rows[0];
  return {
    averageActiveKcal: row?.average == null ? 0 : Number(row.average),
    dayCount: Number(row?.days ?? 0),
  };
}
