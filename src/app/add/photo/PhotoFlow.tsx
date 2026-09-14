'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { NavHeader } from '@/components/ScreenHeader';
import { QuantityPad } from '@/components/QuantityPad';
import { CameraIcon, SearchIcon } from '@/components/icons';
import { buildQuantityShortcuts, type QuantityShortcut } from '@/lib/shortcuts';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { prepareImage } from '@/lib/client/image';
import { recognizePhoto } from '@/lib/client/recognize';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, searchFoods } from '@/lib/client/search';
import { fetchCandidates, rememberAlias, type CandidatesForName } from '@/lib/client/aliases';
import { formatKcal } from '@/lib/nutrition';
import type { Meal } from '@/lib/meal';
import type { Candidate, SearchHit } from '@/lib/types';

/**
 * Reconnaissance d'aliments par photo (FR-17 à FR-19, UJ-3).
 *
 * Ce parcours est volontairement plus long que le scan et la recherche. C'est
 * le chemin de dernier recours et il n'a pas à être optimisé : le modèle nomme,
 * l'utilisateur tranche, et le choix est mémorisé pour la fois suivante.
 *
 * Règle de conception de cet écran : l'utilisateur n'est jamais laissé sans
 * recours. Le modèle se trompe de nom, ne voit rien, ou n'est pas joignable —
 * dans les trois cas la photo reste affichée et la recherche manuelle est à
 * portée de doigt, sur place.
 */

type Step =
  | { name: 'capture' }
  | { name: 'working'; preview: string; label: string }
  | { name: 'failed'; preview: string; message: string; retryable: boolean }
  | { name: 'resolving'; preview: string; pending: CandidatesForName[]; done: number }
  | {
      name: 'quantity';
      preview: string;
      pending: CandidatesForName[];
      done: number;
      recognizedName: string;
      candidate: Candidate;
      /** La fiche telle qu'elle était, pour revenir sur le choix sans la reconstruire. */
      origin: CandidatesForName;
      shortcuts: QuantityShortcut[];
    };

const SOURCE_LABEL: Record<Candidate['kind'], string> = {
  ciqual: 'Ciqual',
  product: 'Scanné',
};

/**
 * Le modèle nomme parfois deux fois le même ingrédient, vu à deux endroits de
 * l'assiette. Sans cette déduplication, deux fiches identiques s'affichaient et
 * en traiter une retirait les deux, le filtrage se faisant sur le nom.
 */
function distinct(names: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (key !== '' && !seen.has(key)) {
      seen.set(key, name.trim());
    }
  }
  return [...seen.values()];
}

function CandidateRow({
  name,
  kcal,
  badge,
  onPick,
}: {
  name: string;
  kcal: number;
  badge?: string;
  onPick: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onPick} className="entry-row items-center">
        <span className="min-w-0 flex-1">
          <span className="entry-name block">{name}</span>
          <span className="entry-meta mt-0.5 block">{formatKcal(kcal)} kcal / 100 g</span>
        </span>
        {badge ? <span className="kicker flex-none">{badge}</span> : null}
      </button>
    </li>
  );
}

/**
 * Une fiche par nom reconnu : les candidats du modèle, et un champ de recherche
 * pour reprendre la main quand aucun ne convient.
 *
 * Le champ est replié tant qu'il y a des candidats, et déplié d'emblée quand il
 * n'y en a aucun : dans ce cas l'utilisateur n'a rien d'autre à faire, et lui
 * demander un geste de plus pour découvrir son seul recours serait gratuit.
 */
function NameCard({
  entry,
  onPick,
  onSkip,
}: {
  entry: CandidatesForName;
  onPick: (recognizedName: string, candidate: Candidate) => void;
  onSkip: () => void;
}) {
  const fieldId = useId();
  const empty = entry.candidates.length === 0;
  const [searching, setSearching] = useState(empty);
  const [term, setTerm] = useState(empty ? entry.name : '');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [pendingSearch, setPendingSearch] = useState(false);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    if (!searching || term.trim().length < MIN_QUERY_LENGTH) {
      setHits(null);
      setPendingSearch(false);
      return;
    }

    const controller = new AbortController();
    setPendingSearch(true);
    const timer = setTimeout(async () => {
      const outcome = await searchFoods(term, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setPendingSearch(false);
      setSearchError(outcome.kind === 'error');
      setHits(outcome.kind === 'hits' ? outcome.hits : []);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, searching]);

  return (
    <section className="pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="display-sm text-[23px]">«&nbsp;{entry.name}&nbsp;»</h2>
        <button type="button" onClick={onSkip} className="kicker kicker-quiet tap-target flex-none">
          Ignorer
        </button>
      </div>

      {empty ? (
        <p className="note mt-2">
          Aucun aliment correspondant. Cherche-le sous un autre nom.
        </p>
      ) : (
        <ul className="mt-2">
          {entry.candidates.map((candidate) => (
            <CandidateRow
              key={`${candidate.kind}-${candidate.ref}`}
              name={candidate.name}
              kcal={candidate.per100g.kcal}
              {...(candidate.fromAlias ? { badge: 'Déjà choisi' } : {})}
              onPick={() => onPick(entry.name, candidate)}
            />
          ))}
        </ul>
      )}

      {searching ? (
        <div className="mt-3">
          <label htmlFor={fieldId} className="label">
            Chercher un autre nom
          </label>
          <div className="field field-accent mt-1.5 text-[17px]">
            <SearchIcon className="h-[17px] w-[17px] flex-none" />
            <input
              id={fieldId}
              type="search"
              autoComplete="off"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Ex. : riz, poulet, pain complet"
              className="w-full min-w-0 border-0 bg-transparent p-0 text-[17px] outline-none"
            />
          </div>

          {pendingSearch ? <p className="kicker kicker-quiet mt-2">Recherche…</p> : null}

          {searchError ? (
            <p role="alert" className="note mt-2" style={{ color: 'var(--color-danger)' }}>
              Recherche indisponible.
            </p>
          ) : null}

          {hits !== null && hits.length === 0 && !pendingSearch && !searchError ? (
            <p className="note mt-2">Aucun aliment trouvé.</p>
          ) : null}

          {hits !== null && hits.length > 0 ? (
            <ul className="mt-1">
              {hits.map((hit) => (
                <CandidateRow
                  key={`hit-${hit.kind}-${hit.ref}`}
                  name={hit.name}
                  kcal={hit.per100g.kcal}
                  onPick={() => onPick(entry.name, { ...hit, fromAlias: false })}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="note mt-3">
          <button type="button" onClick={() => setSearching(true)} className="link-accent">
            Aucun ne convient, chercher moi-même
          </button>
        </p>
      )}
    </section>
  );
}

export function PhotoFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'capture' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(preview: string) {
    setStep({ name: 'working', preview, label: 'Reconnaissance…' });

    const outcome = await recognizePhoto(preview);
    if (outcome.kind !== 'names') {
      const message =
        outcome.kind === 'too_large'
          ? 'Image trop lourde.'
          : outcome.kind === 'bad_format'
            ? 'Réponse du modèle inexploitable.'
            : outcome.kind === 'quota_exceeded'
              ? 'Le quota du modèle est épuisé. Rien à réessayer tant que le compte n’a pas de crédit.'
              : 'Reconnaissance indisponible.';
      setStep({
        name: 'failed',
        preview,
        message,
        retryable: outcome.kind !== 'quota_exceeded' && outcome.kind !== 'too_large',
      });
      return;
    }

    const names = distinct(outcome.names);
    if (names.length === 0) {
      setStep({
        name: 'failed',
        preview,
        message: 'Aucun aliment identifié sur cette photo.',
        retryable: true,
      });
      return;
    }

    setStep({ name: 'working', preview, label: 'Recherche des correspondances…' });
    const results = await fetchCandidates(names);
    setStep({ name: 'resolving', preview, pending: results, done: 0 });
  }

  async function handleFile(file: File) {
    setError(null);
    const prepared = await prepareImage(file);
    if (prepared.kind === 'unreadable') {
      setStep({ name: 'capture' });
      setError('Image illisible.');
      return;
    }
    await analyze(prepared.dataUrl);
  }

  async function pick(recognizedName: string, candidate: Candidate) {
    if (step.name !== 'resolving') {
      return;
    }
    const origin = step.pending.find((item) => item.name === recognizedName);
    if (!origin) {
      return;
    }
    const recent = await fetchRecentQuantities(candidate.kind, candidate.ref, candidate.name);
    setStep({
      name: 'quantity',
      preview: step.preview,
      pending: step.pending.filter((item) => item.name !== recognizedName),
      done: step.done,
      recognizedName,
      candidate,
      origin,
      shortcuts: buildQuantityShortcuts({
        servingSizeG: candidate.servingSizeG,
        recentQuantities: recent,
      }),
    });
  }

  /** Ignorer un nom ne crée aucune entrée et passe au suivant (FR-18). */
  function skip(entry: CandidatesForName) {
    if (step.name !== 'resolving') {
      return;
    }
    finishOrContinue(
      step.pending.filter((item) => item.name !== entry.name),
      step.preview,
      step.done,
    );
  }

  /** Revenir au choix de l'aliment sans perdre les autres noms en attente. */
  function cancelQuantity() {
    if (step.name !== 'quantity') {
      return;
    }
    setError(null);
    // Le nom en cours reprend sa place, avec tous ses candidats : revenir sur un
    // choix sert précisément à en examiner un autre.
    setStep({
      name: 'resolving',
      preview: step.preview,
      pending: [step.origin, ...step.pending],
      done: step.done,
    });
  }

  function finishOrContinue(pending: CandidatesForName[], preview: string, done: number) {
    if (pending.length === 0) {
      // Tous les noms traités ou ignorés : retour au journal (UX-DR-7).
      router.replace('/');
      router.refresh();
      return;
    }
    setStep({ name: 'resolving', preview, pending, done });
  }

  async function save(quantityG: number, meal: Meal) {
    if (step.name !== 'quantity') {
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await createEntry({
      foodLabel: step.candidate.name,
      per100g: step.candidate.per100g,
      quantityG,
      sourceKind: step.candidate.kind,
      sourceRef: step.candidate.ref,
      meal,
    });

    if (result.kind !== 'created') {
      setSubmitting(false);
      setError(result.kind === 'unauthorized' ? 'Session expirée.' : 'Enregistrement impossible.');
      return;
    }

    // La mémorisation ne conditionne pas l'entrée : son échec est silencieux.
    await rememberAlias(step.recognizedName, step.candidate.kind, step.candidate.ref);

    setSubmitting(false);
    finishOrContinue(step.pending, step.preview, step.done + 1);
  }

  if (step.name === 'capture') {
    return (
      <>
        <NavHeader label="Photo" href="/" />
        <label
          htmlFor="photo"
          className="action mt-6 min-h-32 cursor-pointer flex-col gap-2 py-6 text-center"
        >
          <CameraIcon className="h-6 w-6" />
          Prendre une photo du repas
        </label>
        <p className="note mt-3 text-center">
          Le modèle nomme les aliments. Tu choisis et tu pèses.
        </p>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />
        {error ? (
          <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
      </>
    );
  }

  if (step.name === 'quantity') {
    return (
      <>
        <NavHeader label="Quantité" mode="back" onDismiss={cancelQuantity} />
        <QuantityPad
          foodLabel={step.candidate.name}
          sourceLabel={SOURCE_LABEL[step.candidate.kind]}
          per100g={step.candidate.per100g}
          shortcuts={step.shortcuts}
          submitting={submitting}
          onSubmit={save}
        />
        {error ? (
          <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
      </>
    );
  }

  const remaining = step.name === 'resolving' ? step.pending.length : 0;

  return (
    <>
      <NavHeader label="Photo" href="/" />

      {/* La photo reste affichée pendant tout le parcours, y compris en échec. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={step.preview}
        alt="Photo du repas"
        className="plate mt-2 max-h-56 w-full object-cover"
      />

      {step.name === 'working' ? <p className="note mt-3">{step.label}</p> : null}

      {step.name === 'failed' ? (
        <div role="alert" className="pt-4">
          <p className="text-[16px]">{step.message}</p>
          <div className="mt-4 flex flex-col gap-2">
            {step.retryable ? (
              <button
                type="button"
                onClick={() => void analyze(step.preview)}
                className="action action-quiet"
              >
                Réessayer
              </button>
            ) : null}
            <Link href="/add/search" className="action">
              Chercher par nom
            </Link>
          </div>
        </div>
      ) : null}

      {step.name === 'resolving' ? (
        <>
          <p className="note mt-3">
            <span className="tabular">{remaining}</span>
            {remaining === 1 ? ' aliment à traiter' : ' aliments à traiter'}
            {step.done > 0 ? (
              <>
                {' · '}
                <span className="tabular">{step.done}</span>
                {step.done === 1 ? ' déjà enregistré' : ' déjà enregistrés'}
              </>
            ) : null}
          </p>
          <hr className="rule mt-4" />
          {step.pending.map((entry) => (
            <NameCard
              key={entry.name}
              entry={entry}
              onPick={(name, candidate) => void pick(name, candidate)}
              onSkip={() => skip(entry)}
            />
          ))}
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
