import 'server-only';
import { todayInParis } from '@/lib/date';
import {
  isValidReps,
  isValidSeconds,
  isValidWeight,
  MAX_SETS,
  type WorkoutSession,
  type WorkoutSet,
  type WorkoutTemplate,
} from '@/lib/workout';
import { SEED_EXERCISES, SEED_TEMPLATES } from '@/lib/workout-seed';
import {
  archiveTemplate,
  countTemplates,
  deleteSession,
  deleteSet,
  ensureSeedExercises,
  exercisesBySlug,
  findOpenSession,
  findSession,
  findTemplate,
  finishSession,
  insertSession,
  insertTemplate,
  lastPerformance,
  listExercises,
  listSessions,
  listTemplates,
  upsertSet,
} from '../db/queries/workouts';

/**
 * Service des séances.
 *
 * Deux règles y vivent, et elles sont la raison d'être du module. Une seule
 * séance peut être ouverte à la fois — on ne s'entraîne pas à deux endroits —
 * et chaque série affichée porte ce qu'on a fait la dernière fois sur le même
 * exercice. Sans la seconde, on refait chaque semaine la charge dont on se
 * souvient, c'est-à-dire la plus confortable.
 */

export type { WorkoutTemplate, WorkoutSession, WorkoutSet };

/** Nombre de séances rendues par l'historique. Un trimestre à trois par semaine. */
export const HISTORY_LIMIT = 40;

export function templatesFor(userId: number): Promise<WorkoutTemplate[]> {
  return listTemplates(userId);
}

export function templateFor(userId: number, id: number): Promise<WorkoutTemplate | null> {
  return findTemplate(userId, id);
}

export function exerciseCatalog() {
  return listExercises();
}

export function removeTemplate(userId: number, id: number): Promise<boolean> {
  return archiveTemplate(userId, id);
}

export function sessionFor(userId: number, id: number): Promise<WorkoutSession | null> {
  return findSession(userId, id);
}

export function openSessionFor(userId: number): Promise<WorkoutSession | null> {
  return findOpenSession(userId);
}

export function sessionHistory(
  userId: number,
  limit: number = HISTORY_LIMIT,
): Promise<WorkoutSession[]> {
  return listSessions(userId, limit);
}

export interface InstallProgramReport {
  created: number;
  /** Exercices du programme qu'on n'a pas su retrouver au catalogue. */
  skipped: string[];
}

/**
 * Installe le programme de départ sur un compte qui n'a encore aucune séance.
 *
 * Le catalogue d'exercices est semé d'abord, et il l'est de façon idempotente :
 * un exercice déjà présent n'est pas réécrit, pour ne pas défaire un
 * renommage. Les modèles ne sont créés que si le compte n'en a aucun, faute de
 * quoi un double appui installerait le programme deux fois.
 */
export async function installProgram(userId: number): Promise<InstallProgramReport> {
  if ((await countTemplates(userId)) > 0) {
    return { created: 0, skipped: [] };
  }

  await ensureSeedExercises(SEED_EXERCISES);

  const catalog = await exercisesBySlug(
    SEED_TEMPLATES.flatMap((template) => template.exercises.map((entry) => entry.slug)),
  );

  const report: InstallProgramReport = { created: 0, skipped: [] };

  for (const [index, template] of SEED_TEMPLATES.entries()) {
    const exercises = template.exercises
      .map((entry) => {
        const exercise = catalog.get(entry.slug);
        if (exercise === undefined) {
          report.skipped.push(entry.slug);
          return null;
        }
        return {
          exerciseId: exercise.id,
          targetSets: entry.targetSets,
          targetRepsMin: entry.targetRepsMin ?? null,
          targetRepsMax: entry.targetRepsMax ?? null,
          targetSeconds: entry.targetSeconds ?? null,
          supersetGroup: entry.supersetGroup ?? null,
          restSeconds: null,
          notes: entry.notes ?? null,
        };
      })
      .filter((entry) => entry !== null);

    // Une séance vidée de tous ses exercices n'aurait rien à afficher.
    if (exercises.length === 0) {
      continue;
    }

    await insertTemplate(
      userId,
      { name: template.name, position: index, notes: template.notes },
      exercises,
    );
    report.created += 1;
  }

  return report;
}

export type StartSessionResult =
  | { kind: 'started'; id: number }
  | { kind: 'already_open'; id: number }
  | { kind: 'not_found' };

/**
 * Ouvre une séance.
 *
 * Une séance déjà ouverte est rendue telle quelle au lieu d'en ouvrir une
 * seconde. C'est le cas nominal, pas l'exception : on pose son téléphone entre
 * deux séries, l'application se recharge, et il faut retrouver la séance là où
 * on l'a laissée plutôt que d'en commencer une vide.
 */
export async function startSession(
  userId: number,
  templateId: number | null,
): Promise<StartSessionResult> {
  const open = await findOpenSession(userId);
  if (open !== null) {
    return { kind: 'already_open', id: open.id };
  }

  if (templateId !== null && (await findTemplate(userId, templateId)) === null) {
    return { kind: 'not_found' };
  }

  return { kind: 'started', id: await insertSession(userId, templateId, todayInParis()) };
}

export function endSession(userId: number, id: number): Promise<boolean> {
  return finishSession(userId, id);
}

export function discardSession(userId: number, id: number): Promise<boolean> {
  return deleteSession(userId, id);
}

export interface SetInput {
  sessionId: number;
  exerciseId: number;
  position: number;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}

export type RecordSetResult = { kind: 'recorded' } | { kind: 'invalid' } | { kind: 'not_found' };

/**
 * Enregistre une série, ou corrige celle qui occupe ce rang.
 *
 * Une série doit porter au moins une mesure. Une ligne entièrement vide
 * gonflerait le compte des séries faites sans rien dire de ce qui a été fait,
 * et fausserait la comparaison d'une semaine à l'autre.
 */
export async function recordSet(userId: number, input: SetInput): Promise<RecordSetResult> {
  if (!Number.isInteger(input.setIndex) || input.setIndex < 1 || input.setIndex > MAX_SETS) {
    return { kind: 'invalid' };
  }
  if (input.weightKg !== null && !isValidWeight(input.weightKg)) {
    return { kind: 'invalid' };
  }
  if (input.reps !== null && !isValidReps(input.reps)) {
    return { kind: 'invalid' };
  }
  if (input.seconds !== null && !isValidSeconds(input.seconds)) {
    return { kind: 'invalid' };
  }
  if (input.reps === null && input.seconds === null) {
    return { kind: 'invalid' };
  }

  const written = await upsertSet(userId, input);
  return written ? { kind: 'recorded' } : { kind: 'not_found' };
}

export function removeSet(userId: number, setId: number): Promise<boolean> {
  return deleteSet(userId, setId);
}

/**
 * Ce qui a été fait la dernière fois sur chaque exercice d'une séance.
 *
 * La séance en cours est exclue de la référence : sans quoi « la dernière
 * fois » désignerait la série qu'on vient de terminer, et l'écran cesserait de
 * dire quoi que ce soit d'utile.
 */
export function previousPerformance(
  userId: number,
  exerciseIds: readonly number[],
  currentSessionId: number | null,
): Promise<Map<number, WorkoutSet[]>> {
  return lastPerformance(userId, exerciseIds, currentSessionId);
}
