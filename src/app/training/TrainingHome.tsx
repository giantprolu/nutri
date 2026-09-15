'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { installProgram, startSession } from '@/lib/client/training';
import {
  formatPrescription,
  groupBySuperset,
  sessionVolume,
  type WorkoutSession,
  type WorkoutTemplate,
} from '@/lib/workout';
import { formatRelativeJournalDate } from '@/lib/date';

/**
 * L'accueil du Sport : la séance en cours s'il y en a une, les trois séances
 * du programme, et ce qu'on a fait récemment.
 *
 * La séance ouverte passe avant tout le reste. C'est le cas nominal d'un usage
 * en salle : on pose son téléphone entre deux séries, l'application se
 * recharge, et il faut retrouver la séance là où on l'a laissée sans la
 * chercher.
 */
export function TrainingHome({
  templates,
  openSession,
  history,
}: {
  templates: readonly WorkoutTemplate[];
  openSession: WorkoutSession | null;
  history: readonly WorkoutSession[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[] | null>(null);

  async function install() {
    setBusy(true);
    setError(null);
    const outcome = await installProgram();
    setBusy(false);

    if (outcome.kind === 'error') {
      setError('Installation impossible. Réessaie dans un instant.');
      return;
    }
    if (outcome.skipped.length > 0) {
      setSkipped(outcome.skipped);
    }
    router.refresh();
  }

  async function begin(templateId: number) {
    setBusy(true);
    setError(null);
    const outcome = await startSession(templateId);
    setBusy(false);

    if (outcome.kind === 'started') {
      router.push(`/training/session/${outcome.id}`);
      return;
    }
    setError('La séance n’a pas pu être ouverte.');
  }

  if (templates.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="mx-auto max-w-[26ch] text-[23px] leading-[1.35] font-semibold">
          Trois séances en rotation sur la semaine.
        </p>
        <p className="note mx-auto mt-3 max-w-[32ch]">
          Poussée, tirage, haut du corps et cardio. Modifiables et supprimables ensuite.
        </p>
        <button
          type="button"
          onClick={() => void install()}
          disabled={busy}
          className="action mx-auto mt-6 max-w-[260px]"
        >
          {busy ? 'Installation…' : 'Installer ce programme'}
        </button>

        {error ? (
          <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
        {skipped !== null ? (
          <p className="note mx-auto mt-4 max-w-[34ch]">
            Exercices non installés : {skipped.join(', ')}.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {openSession !== null ? (
        <>
          <div className="aside-accent mt-4">
            <p className="kicker">Séance en cours</p>
            <p className="mt-1 text-[19px] font-semibold">
              {openSession.templateName ?? 'Séance libre'}
            </p>
            <p className="entry-meta mt-1">
              {openSession.sets.length === 0
                ? 'Aucune série enregistrée'
                : `${openSession.sets.length} série${openSession.sets.length > 1 ? 's' : ''} · ${sessionVolume(openSession.sets).toLocaleString('fr-FR')} kg soulevés`}
            </p>
            <Link href={`/training/session/${openSession.id}`} className="action mt-3">
              Reprendre
            </Link>
          </div>
          <hr className="rule mt-5" />
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      <p className="kicker mt-4 mb-1">Le programme</p>

      <ul>
        {templates.map((template) => (
          <li key={template.id} className="py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="entry-name">{template.name}</p>
                <p className="entry-meta mt-0.5">
                  {template.exercises.length} exercice
                  {template.exercises.length > 1 ? 's' : ''}
                  {template.notes === null ? '' : ` · ${template.notes}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void begin(template.id)}
                disabled={busy || openSession !== null}
                className="chip flex-none"
              >
                Commencer
              </button>
            </div>

            {/*
              Les exercices sont listés à plat sous leur séance : on veut voir
              ce qu'on va faire avant de s'engager, sans une navigation de plus.
              Les supersets sont marqués, c'est leur seule particularité utile
              au moment du coup d'œil.
            */}
            <ul className="mt-2">
              {groupBySuperset(template.exercises).map((block, index) => (
                <li key={index} className="flex items-baseline justify-between py-1">
                  <span className="min-w-0 flex-1 text-[15px]">
                    {block.map((entry) => entry.exercise.name).join(' + ')}
                    {block.length > 1 ? (
                      <span className="kicker kicker-quiet ml-2">superset</span>
                    ) : null}
                  </span>
                  <span className="entry-meta tabular flex-none">
                    {formatPrescription(block[0]!)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {history.length > 0 ? (
        <>
          <hr className="rule mt-4" />
          <p className="kicker mt-4 mb-1">Dernières séances</p>
          <ul>
            {history.map((session) => (
              <li key={session.id}>
                <Link href={`/training/session/${session.id}`} className="entry-row items-center">
                  <span className="min-w-0 flex-1">
                    <span className="entry-name block">
                      {session.templateName ?? 'Séance libre'}
                    </span>
                    <span className="entry-meta mt-0.5 block first-letter:uppercase">
                      {formatRelativeJournalDate(session.sessionDate)}
                      {session.finishedAt === null ? ' · non terminée' : ''}
                    </span>
                  </span>
                  <span className="entry-kcal flex-none">
                    {sessionVolume(session.sets).toLocaleString('fr-FR')} kg
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
