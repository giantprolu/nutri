'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QuantityPad } from '@/components/QuantityPad';
import { buildQuantityShortcuts, type QuantityShortcut } from '@/lib/shortcuts';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { prepareImage } from '@/lib/client/image';
import { recognizePhoto } from '@/lib/client/recognize';
import { fetchCandidates, rememberAlias, type CandidatesForName } from '@/lib/client/aliases';
import { formatKcal } from '@/lib/nutrition';
import type { Candidate } from '@/lib/types';

/**
 * Reconnaissance d'aliments par photo (FR-17 à FR-19, UJ-3).
 *
 * Ce parcours est volontairement plus long que le scan et la recherche. C'est
 * le chemin de dernier recours et il n'a pas à être optimisé : le modèle nomme,
 * l'utilisateur tranche, et le choix est mémorisé pour la fois suivante.
 *
 * En cas d'échec, la photo reste affichée et la recherche textuelle est
 * proposée sans perdre le contexte (EXPERIENCE.md, motifs d'état).
 */

type Step =
  | { name: 'capture' }
  | { name: 'working'; preview: string; label: string }
  | { name: 'failed'; preview: string; message: string }
  | { name: 'resolving'; preview: string; pending: CandidatesForName[] }
  | {
      name: 'quantity';
      preview: string;
      pending: CandidatesForName[];
      recognizedName: string;
      candidate: Candidate;
      shortcuts: QuantityShortcut[];
    };

export function PhotoFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'capture' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const prepared = await prepareImage(file);
    if (prepared.kind === 'unreadable') {
      setStep({ name: 'capture' });
      setError('Image illisible.');
      return;
    }

    const preview = prepared.dataUrl;
    setStep({ name: 'working', preview, label: 'Reconnaissance…' });

    const outcome = await recognizePhoto(preview);
    if (outcome.kind !== 'names') {
      setStep({
        name: 'failed',
        preview,
        message:
          outcome.kind === 'too_large'
            ? 'Image trop lourde.'
            : outcome.kind === 'bad_format'
              ? 'Réponse du modèle inexploitable.'
              : 'Reconnaissance indisponible.',
      });
      return;
    }

    if (outcome.names.length === 0) {
      setStep({ name: 'failed', preview, message: 'Aucun aliment identifié.' });
      return;
    }

    setStep({ name: 'working', preview, label: 'Recherche des correspondances…' });
    const results = await fetchCandidates(outcome.names);
    setStep({ name: 'resolving', preview, pending: results });
  }

  async function pick(entry: CandidatesForName, candidate: Candidate) {
    if (step.name !== 'resolving') {
      return;
    }
    const recent = await fetchRecentQuantities(candidate.kind, candidate.ref, candidate.name);
    setStep({
      name: 'quantity',
      preview: step.preview,
      pending: step.pending.filter((item) => item.name !== entry.name),
      recognizedName: entry.name,
      candidate,
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
    const pending = step.pending.filter((item) => item.name !== entry.name);
    finishOrContinue(pending, step.preview);
  }

  function finishOrContinue(pending: CandidatesForName[], preview: string) {
    if (pending.length === 0) {
      // Tous les noms traités ou ignorés : retour au journal (UX-DR-7).
      router.replace('/');
      router.refresh();
      return;
    }
    setStep({ name: 'resolving', preview, pending });
  }

  async function save(quantityG: number) {
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
    });

    if (result.kind !== 'created') {
      setSubmitting(false);
      setError(result.kind === 'unauthorized' ? 'Session expirée.' : 'Enregistrement impossible.');
      return;
    }

    // La mémorisation ne conditionne pas l'entrée : son échec est silencieux.
    await rememberAlias(step.recognizedName, step.candidate.kind, step.candidate.ref);

    setSubmitting(false);
    finishOrContinue(step.pending, step.preview);
  }

  if (step.name === 'capture') {
    return (
      <div className="flex flex-col gap-4">
        <label
          htmlFor="photo"
          className="tap-target flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-box border border-dashed border-base-300 bg-base-200 p-6 text-center"
        >
          <span className="text-sm font-medium">Prendre une photo du repas</span>
          <span className="mt-1 text-xs text-ink-secondary">
            Le modèle nomme les aliments. Tu choisis et tu pèses.
          </span>
        </label>
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
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* La photo reste affichée pendant tout le parcours, y compris en échec. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={step.preview}
        alt="Photo du repas"
        className="w-full max-w-full rounded-box object-cover"
      />

      {step.name === 'working' ? (
        <p className="text-sm text-ink-secondary">{step.label}</p>
      ) : null}

      {step.name === 'failed' ? (
        <div role="alert" className="rounded-box border border-base-300 bg-base-200 p-4">
          <p className="text-sm">{step.message}</p>
          <Link
            href="/add/search"
            className="tap-target mt-3 inline-flex items-center text-sm text-primary"
          >
            Chercher par nom
          </Link>
        </div>
      ) : null}

      {step.name === 'resolving'
        ? step.pending.map((entry) => (
            <section
              key={entry.name}
              className="rounded-box border border-base-300 bg-base-200 p-4"
            >
              <h2 className="text-sm font-medium">{entry.name}</h2>

              {entry.candidates.length === 0 ? (
                <>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Aucun aliment correspondant.
                  </p>
                  <Link
                    href="/add/search"
                    className="tap-target mt-2 inline-flex items-center text-sm text-primary"
                  >
                    Chercher par nom
                  </Link>
                </>
              ) : (
                <ul className="mt-2 divide-y divide-base-300">
                  {entry.candidates.map((candidate) => (
                    <li key={`${candidate.kind}-${candidate.ref}`}>
                      <button
                        type="button"
                        onClick={() => void pick(entry, candidate)}
                        className="tap-target flex w-full items-baseline justify-between gap-3 py-3 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{candidate.name}</span>
                          <span className="tabular mt-0.5 block text-xs text-ink-secondary">
                            {formatKcal(candidate.per100g.kcal)} kcal / 100 g
                          </span>
                        </span>
                        {candidate.fromAlias ? (
                          <span className="shrink-0 text-xs text-ink-secondary">déjà choisi</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => skip(entry)}
                className="tap-target mt-2 w-full rounded-field border border-base-300 py-3 text-sm"
              >
                Ignorer
              </button>
            </section>
          ))
        : null}

      {step.name === 'quantity' ? (
        <QuantityPad
          foodLabel={step.candidate.name}
          per100g={step.candidate.per100g}
          shortcuts={step.shortcuts}
          submitting={submitting}
          onSubmit={save}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
