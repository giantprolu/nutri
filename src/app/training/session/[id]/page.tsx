import { notFound } from 'next/navigation';
import { requireUserId } from '@/server/guard';
import {
  previousPerformance,
  sessionFor,
  templateFor,
} from '@/server/services/workouts';
import type { WorkoutSet } from '@/lib/workout';
import { SessionRunner } from './SessionRunner';

export const dynamic = 'force-dynamic';

/**
 * Une séance, en cours ou terminée.
 *
 * La performance précédente est chargée ici et non dans le composant client :
 * c'est une lecture de base, et la faire depuis le navigateur ajouterait un
 * aller-retour au moment précis où l'on veut voir sa charge, entre deux séries.
 */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    notFound();
  }

  const session = await sessionFor(userId, id);
  if (session === null) {
    notFound();
  }

  const template =
    session.templateId === null ? null : await templateFor(userId, session.templateId);
  const exercises = template?.exercises ?? [];

  const previous = await previousPerformance(
    userId,
    exercises.map((entry) => entry.exercise.id),
    session.id,
  );

  // La carte devient un objet simple : une Map ne traverse pas la frontière
  // serveur/client, qui sérialise en JSON.
  const previousByExercise: Record<number, WorkoutSet[]> = {};
  for (const [exerciseId, sets] of previous) {
    previousByExercise[exerciseId] = sets;
  }

  return (
    <SessionRunner session={session} exercises={exercises} previous={previousByExercise} />
  );
}
