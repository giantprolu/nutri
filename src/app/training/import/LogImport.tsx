'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExerciseSheet, type SheetExercise } from '@/components/ExerciseSheet';
import { NavHeader } from '@/components/ScreenHeader';
import {
  analyseWorkoutLog,
  saveWrittenSession,
  type AnalysedLinePayload,
} from '@/lib/client/training';
import { formatSet } from '@/lib/workout';

/**
 * Saisie d'une séance écrite à la main.
 *
 * Personne ne remplit une grille pendant qu'il s'entraîne. On note sa séance
 * en trois lignes, dans la langue de la salle, et c'est ce texte-là qu'il faut
 * accepter :
 *
 *     Chest press machine 4X12 27.5kg - 20 kg - 27.5 kg - 20 kg
 *
 * L'écran travaille en deux temps. La lecture propose un rapprochement avec le
 * catalogue et n'écrit rien ; l'enregistrement n'a lieu qu'après confirmation.
 * Un exercice mal reconnu se valide d'un geste distrait, alors qu'il se
 * corrige difficilement une fois la séance en base.
 *
 * Les séries lues ne sont pas modifiables ici, volontairement. Corriger une
 * charge dans une grille de confirmation demanderait autant de champs que la
 * saisie qu'on cherche justement à éviter : on corrige le texte, et on relit.
 */

const EXAMPLE = `Chest press machine 4X12 27.5kg - 20 kg - 27.5 kg - 20 kg
shoulder press machine 3X10 50 - 42.5 - 35
pec deck 2X12 et 1X10 (echec) 6-6-6`;

const WARNINGS: Record<AnalysedLinePayload['warning'], string | null> = {
  none: null,
  no_sets: 'Aucune série reconnue sur cette ligne.',
  weight_count: 'Le nombre de charges ne correspond pas au nombre de séries.',
};

/** L'exercice retenu pour une ligne : un identifiant, ou la création. */
type Choice = { kind: 'catalog'; id: number } | { kind: 'new' };

function initialChoice(line: AnalysedLinePayload): Choice {
  return line.matchedExerciseId === null
    ? { kind: 'new' }
    : { kind: 'catalog', id: line.matchedExerciseId };
}

export function LogImport({ today }: { today: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sessionDate, setSessionDate] = useState(today);
  const [lines, setLines] = useState<AnalysedLinePayload[] | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [kept, setKept] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<SheetExercise | null>(null);

  async function analyse() {
    if (text.trim() === '') {
      return;
    }
    setBusy(true);
    setError(null);
    const outcome = await analyseWorkoutLog(text);
    setBusy(false);

    if (outcome.kind === 'error') {
      setError('La séance n’a pas pu être lue. Réessaie dans un instant.');
      return;
    }
    if (outcome.lines.length === 0) {
      setError('Aucun exercice reconnu dans ce texte.');
      return;
    }

    setLines(outcome.lines);
    setChoices(outcome.lines.map(initialChoice));
    // Une ligne sans série est un titre ou une note : décochée d'emblée, mais
    // laissée visible, parce que la décocher en silence ferait croire à une
    // perte de données.
    setKept(outcome.lines.map((line) => line.sets.length > 0));
  }

  async function save() {
    if (lines === null) {
      return;
    }
    const payload = lines
      .map((line, index) => ({ line, choice: choices[index]!, keep: kept[index] === true }))
      .filter((entry) => entry.keep && entry.line.sets.length > 0)
      .map((entry) => ({
        exerciseId: entry.choice.kind === 'catalog' ? entry.choice.id : null,
        name: entry.line.name,
        sets: entry.line.sets,
      }));

    if (payload.length === 0) {
      setError('Aucune ligne retenue.');
      return;
    }

    setBusy(true);
    setError(null);
    const outcome = await saveWrittenSession({ sessionDate, lines: payload });
    setBusy(false);

    if (outcome.kind === 'error') {
      setError('La séance n’a pas pu être enregistrée.');
      return;
    }
    router.push(`/training/session/${outcome.id}`);
    router.refresh();
  }

  return (
    <>
      <NavHeader label="Sport" href="/training" mode="back" />

      <h1 className="display-sm">Saisir une séance</h1>
      <p className="note mt-1">
        Recopie ta séance telle que tu l’as notée, une ligne par exercice. Le nom,
        les séries, puis les charges dans l’ordre.
      </p>

      <label htmlFor="log" className="label mt-5">
        Ta séance
      </label>
      <textarea
        id="log"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        placeholder={EXAMPLE}
        spellCheck={false}
        className="field w-full"
      />

      <button
        type="button"
        onClick={() => void analyse()}
        disabled={busy || text.trim() === ''}
        className="action mt-3"
      >
        {busy && lines === null ? 'Lecture…' : 'Lire la séance'}
      </button>

      {error ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      {lines !== null ? (
        <>
          <hr className="rule mt-6" />
          <p className="kicker mt-4 mb-1">Ce qui a été lu</p>

          <ul>
            {lines.map((line, index) => {
              const choice = choices[index]!;
              const warning = WARNINGS[line.warning];
              const keep = kept[index] === true;
              const chosen =
                choice.kind === 'catalog'
                  ? (line.candidates.find((candidate) => candidate.id === choice.id) ?? null)
                  : null;

              return (
                <li key={index} className="py-3">
                  <div className="flex items-start gap-3">
                    <label className="flex min-w-0 flex-1 items-start gap-2">
                      <input
                        type="checkbox"
                        checked={keep}
                        disabled={line.sets.length === 0}
                        onChange={(event) =>
                          setKept((current) =>
                            current.map((value, position) =>
                              position === index ? event.target.checked : value,
                            ),
                          )
                        }
                        className="mt-1 flex-none"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="entry-name block">{line.name}</span>
                        <span className="entry-meta mt-0.5 block">{line.raw}</span>
                      </span>
                    </label>
                  </div>

                  {line.sets.length > 0 ? (
                    <p className="entry-meta tabular mt-1">
                      {line.sets.map((set) => formatSet(set)).join(' · ')}
                    </p>
                  ) : null}

                  {warning !== null ? (
                    <p className="note mt-1" style={{ color: 'var(--color-danger)' }}>
                      {warning}
                    </p>
                  ) : null}

                  {line.sets.length > 0 ? (
                    <>
                      <label htmlFor={`exercise-${index}`} className="sr-only">
                        Exercice correspondant à {line.name}
                      </label>
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          id={`exercise-${index}`}
                          className="field min-w-0 flex-1"
                          value={choice.kind === 'new' ? 'new' : String(choice.id)}
                          onChange={(event) =>
                            setChoices((current) =>
                              current.map((value, position) =>
                                position === index
                                  ? event.target.value === 'new'
                                    ? { kind: 'new' }
                                    : { kind: 'catalog', id: Number(event.target.value) }
                                  : value,
                              ),
                            )
                          }
                        >
                          {line.candidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                          <option value="new">Créer « {line.name} »</option>
                        </select>

                        {/*
                          La photo du candidat retenu, à un toucher. C'est en
                          confirmant un rapprochement qu'on en a le plus besoin :
                          « rowing » propose quatre exercices, et les noms seuls
                          ne suffisent pas à trancher.
                        */}
                        {chosen === null ? null : (
                          <button
                            type="button"
                            onClick={() => setShown(chosen)}
                            aria-label={`Voir ${chosen.name}`}
                            className="chip flex-none"
                          >
                            Voir
                          </button>
                        )}
                      </div>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <label htmlFor="session-date" className="label mt-4">
            Jour de la séance
          </label>
          <input
            id="session-date"
            type="date"
            value={sessionDate}
            max={today}
            onChange={(event) => setSessionDate(event.target.value)}
            className="field w-full tabular"
          />

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="action mt-4"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer la séance'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLines(null);
              setError(null);
            }}
            disabled={busy}
            className="action-quiet mt-3"
          >
            Corriger le texte
          </button>
        </>
      ) : null}

      <ExerciseSheet exercise={shown} onClose={() => setShown(null)} />
    </>
  );
}
