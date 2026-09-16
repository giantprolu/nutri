'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExerciseSheet, type SheetExercise } from '@/components/ExerciseSheet';
import { NavHeader } from '@/components/ScreenHeader';
import { discardSession, finishSession, recordSet } from '@/lib/client/training';
import {
  bestSet,
  formatPrescription,
  formatSet,
  sessionVolume,
  type TemplateExercise,
  type WorkoutSession,
  type WorkoutSet,
} from '@/lib/workout';

/**
 * Exécution d'une séance, série par série.
 *
 * Chaque série affiche ce qui a été fait la dernière fois sur le même
 * exercice. C'est toute la raison d'être du module : sans ce rappel, on refait
 * chaque semaine la charge dont on se souvient, c'est-à-dire la plus
 * confortable, et la progression s'arrête sans qu'on s'en aperçoive.
 *
 * Les valeurs sont préremplies avec la dernière performance, pas laissées
 * vides. En salle, entre deux séries, on veut valider un chiffre déjà là, pas
 * en saisir deux au clavier. Le geste ordinaire devient une confirmation.
 *
 * Une série déjà enregistrée reste modifiable : on corrige une charge mal
 * saisie sur place, et l'écriture remplace la valeur au lieu d'ajouter une
 * série fantôme au volume.
 */

/** L'état local d'une case de la grille, avant enregistrement. */
interface Draft {
  weightKg: string;
  reps: string;
  seconds: string;
  /**
   * La série est allée jusqu'à l'échec musculaire.
   *
   * Jamais préremplie depuis la dernière fois, contrairement aux chiffres :
   * l'échec est un fait de la série qu'on vient de faire, pas une consigne.
   * Le reporter d'une semaine sur l'autre inventerait un effort.
   */
  toFailure: boolean;
}

function draftKey(exerciseId: number, setIndex: number): string {
  return `${exerciseId}:${setIndex}`;
}

/** Ce qu'on propose dans une case vide : la dernière performance, ou la consigne. */
function initialDraft(
  entry: TemplateExercise,
  previous: WorkoutSet | null,
): Draft {
  if (entry.exercise.kind === 'hold' || entry.exercise.kind === 'cardio') {
    return {
      weightKg: '',
      reps: '',
      seconds: String(previous?.seconds ?? entry.targetSeconds ?? ''),
      toFailure: false,
    };
  }
  return {
    weightKg: previous?.weightKg === null || previous === null ? '' : String(previous.weightKg),
    // La borne haute de la fourchette, pas la basse : c'est elle qu'on vise,
    // et l'atteindre sur toutes les séries est le signal qu'il faut charger.
    reps: String(previous?.reps ?? entry.targetRepsMax ?? entry.targetRepsMin ?? ''),
    seconds: '',
    toFailure: false,
  };
}

export function SessionRunner({
  session,
  exercises,
  previous,
}: {
  session: WorkoutSession;
  /** Les exercices prescrits. Vide pour une séance libre. */
  exercises: readonly TemplateExercise[];
  /** Ce qui a été fait la dernière fois, par identifiant d'exercice. */
  previous: Record<number, WorkoutSet[]>;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<SheetExercise | null>(null);

  const doneSets = new Map(
    session.sets.map((set) => [draftKey(set.exerciseId, set.setIndex), set]),
  );

  function readDraft(entry: TemplateExercise, setIndex: number): Draft {
    const key = draftKey(entry.exercise.id, setIndex);
    const existing = drafts[key];
    if (existing !== undefined) {
      return existing;
    }

    const recorded = doneSets.get(key);
    if (recorded !== undefined) {
      return {
        weightKg: recorded.weightKg === null ? '' : String(recorded.weightKg),
        reps: recorded.reps === null ? '' : String(recorded.reps),
        seconds: recorded.seconds === null ? '' : String(recorded.seconds),
        toFailure: recorded.toFailure,
      };
    }

    const history = previous[entry.exercise.id] ?? [];
    return initialDraft(entry, history[setIndex - 1] ?? bestSet(history));
  }

  function patch(key: string, change: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? { weightKg: '', reps: '', seconds: '', toFailure: false }),
        ...change,
      },
    }));
  }

  async function save(entry: TemplateExercise, setIndex: number) {
    const draft = readDraft(entry, setIndex);
    const isTimed = entry.exercise.kind === 'hold' || entry.exercise.kind === 'cardio';

    setBusy(true);
    setError(null);
    const outcome = await recordSet({
      sessionId: session.id,
      exerciseId: entry.exercise.id,
      position: entry.position,
      setIndex,
      weightKg: isTimed || draft.weightKg.trim() === '' ? null : Number(draft.weightKg),
      reps: isTimed || draft.reps.trim() === '' ? null : Number(draft.reps),
      seconds: isTimed && draft.seconds.trim() !== '' ? Number(draft.seconds) : null,
      toFailure: draft.toFailure,
    });
    setBusy(false);

    if (outcome.kind === 'ok') {
      router.refresh();
      return;
    }
    setError('Série non enregistrée. Vérifie les valeurs.');
  }

  async function finish() {
    setBusy(true);
    const outcome = await finishSession(session.id);
    setBusy(false);
    if (outcome.kind === 'ok') {
      router.replace('/training');
      router.refresh();
      return;
    }
    setError('La séance n’a pas pu être terminée.');
  }

  async function discard() {
    setBusy(true);
    await discardSession(session.id);
    setBusy(false);
    router.replace('/training');
    router.refresh();
  }

  const closed = session.finishedAt !== null;

  return (
    <>
      <NavHeader label="Sport" href="/training" mode="back" />

      <h1 className="display-sm">{session.templateName ?? 'Séance libre'}</h1>
      <p className="kicker kicker-quiet mt-1">
        {session.sets.length} série{session.sets.length > 1 ? 's' : ''} ·{' '}
        {sessionVolume(session.sets).toLocaleString('fr-FR')} kg soulevés
        {closed ? ' · terminée' : ''}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      {exercises.length === 0 ? (
        <p className="note mt-6">
          Cette séance ne suit aucun modèle : ses séries ne peuvent pas être préremplies.
        </p>
      ) : null}

      {exercises.map((entry) => {
        const history = previous[entry.exercise.id] ?? [];
        const reference = bestSet(history);
        const isTimed = entry.exercise.kind === 'hold' || entry.exercise.kind === 'cardio';

        return (
          <section key={entry.id} className="mt-5">
            {/*
              Le nom ouvre la fiche, ici aussi. C'est en salle, devant la
              machine, qu'on a le plus besoin de vérifier qu'on est au bon
              appareil — et c'est le seul endroit où l'on ne peut pas aller
              chercher l'information ailleurs sans perdre sa place.
            */}
            <div className="meal-head">
              <button
                type="button"
                onClick={() => setShown(entry.exercise)}
                className="link-accent text-left"
              >
                {entry.exercise.name}
              </button>
              <span className="kicker tabular">{formatPrescription(entry)}</span>
            </div>

            {entry.notes !== null ? <p className="note mb-1">{entry.notes}</p> : null}

            {reference !== null ? (
              <p className="entry-meta mb-2">
                La dernière fois : {formatSet(reference)}
                {history.length > 1 ? ` sur ${history.length} séries` : ''}
              </p>
            ) : (
              <p className="entry-meta mb-2">Première fois sur cet exercice.</p>
            )}

            <ul>
              {Array.from({ length: entry.targetSets }, (_, index) => index + 1).map(
                (setIndex) => {
                  const key = draftKey(entry.exercise.id, setIndex);
                  const recorded = doneSets.get(key);
                  const draft = readDraft(entry, setIndex);

                  return (
                    <li key={setIndex} className="flex items-center gap-2 py-1.5">
                      <span
                        className="kicker kicker-quiet tabular w-[54px] flex-none"
                        style={recorded ? { color: 'var(--color-accent)' } : undefined}
                      >
                        {recorded ? '■' : '□'} S{setIndex}
                      </span>

                      {isTimed ? (
                        <label className="flex flex-1 items-center gap-2">
                          <span className="sr-only">
                            Durée de la série {setIndex} en secondes
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={draft.seconds}
                            onChange={(event) => patch(key, { seconds: event.target.value })}
                            className="field w-full text-right text-[17px]"
                          />
                          <span className="entry-meta flex-none">s</span>
                        </label>
                      ) : (
                        <>
                          <label className="flex flex-1 items-center gap-1">
                            <span className="sr-only">
                              Charge de la série {setIndex} en kilogrammes
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.5}
                              value={draft.weightKg}
                              onChange={(event) => patch(key, { weightKg: event.target.value })}
                              className="field w-full text-right text-[17px]"
                            />
                            <span className="entry-meta flex-none">kg</span>
                          </label>
                          <span className="entry-meta flex-none">×</span>
                          <label className="flex w-[72px] flex-none items-center gap-1">
                            <span className="sr-only">
                              Répétitions de la série {setIndex}
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={draft.reps}
                              onChange={(event) => patch(key, { reps: event.target.value })}
                              className="field w-full text-right text-[17px]"
                            />
                          </label>
                        </>
                      )}

                      {/*
                        L'échec se marque au moment où il a lieu, d'un appui,
                        et non dans un écran de correction : « 6 répétitions »
                        et « 6 répétitions à l'échec » ne demandent pas la même
                        charge la semaine suivante, et c'est cette différence
                        qui rend la ligne relisible.
                      */}
                      <button
                        type="button"
                        onClick={() => patch(key, { toFailure: !draft.toFailure })}
                        disabled={busy || closed}
                        aria-pressed={draft.toFailure}
                        aria-label={`Série ${setIndex} menée à l'échec`}
                        className="chip flex-none"
                      >
                        éch.
                      </button>

                      <button
                        type="button"
                        onClick={() => void save(entry, setIndex)}
                        disabled={busy || closed}
                        aria-label={`Enregistrer la série ${setIndex} de ${entry.exercise.name}`}
                        className="chip flex-none"
                      >
                        {recorded ? 'Corriger' : 'Valider'}
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          </section>
        );
      })}

      {!closed ? (
        <>
          <hr className="rule mt-6" />
          <button
            type="button"
            onClick={() => void finish()}
            disabled={busy}
            className="action mt-4"
          >
            Terminer la séance
          </button>
          <button
            type="button"
            onClick={() => void discard()}
            disabled={busy}
            className="action-danger mt-3"
          >
            Abandonner sans enregistrer
          </button>
        </>
      ) : null}

      <ExerciseSheet exercise={shown} onClose={() => setShown(null)} />
    </>
  );
}
