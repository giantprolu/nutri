'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { QuantityPad } from '@/components/QuantityPad';
import { buildQuantityShortcuts, type QuantityShortcut } from '@/lib/shortcuts';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, searchFoods } from '@/lib/client/search';
import { formatKcal } from '@/lib/nutrition';
import type { SearchHit } from '@/lib/types';

/**
 * Recherche textuelle d'un aliment (FR-7, UJ-2).
 *
 * Aucune suggestion, aucune correction orthographique en cas d'absence de
 * résultat : la similarité trigramme absorbe déjà les fautes de frappe
 * courantes, et une suggestion de plus serait du bruit (EXPERIENCE.md).
 */

type Step =
  | { name: 'search' }
  | { name: 'quantity'; hit: SearchHit; shortcuts: QuantityShortcut[] };

const SOURCE_LABEL: Record<SearchHit['kind'], string> = {
  ciqual: 'CIQUAL',
  product: 'Scanné',
};

export function SearchFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'search' });
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Le champ reçoit le focus à l'ouverture (EXPERIENCE.md, motifs de composants).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (step.name !== 'search') {
      return;
    }
    if (term.trim().length < MIN_QUERY_LENGTH) {
      setHits(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      const outcome = await searchFoods(term, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setSearching(false);
      setHits(outcome.kind === 'hits' ? outcome.hits : []);
      setError(outcome.kind === 'error' ? 'Recherche indisponible.' : null);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, step.name]);

  async function pick(hit: SearchHit) {
    const recent = await fetchRecentQuantities(hit.kind, hit.ref, hit.name);
    setStep({
      name: 'quantity',
      hit,
      shortcuts: buildQuantityShortcuts({
        servingSizeG: hit.servingSizeG,
        recentQuantities: recent,
      }),
    });
  }

  async function save(quantityG: number) {
    if (step.name !== 'quantity') {
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await createEntry({
      foodLabel: step.hit.name,
      per100g: step.hit.per100g,
      quantityG,
      sourceKind: step.hit.kind,
      sourceRef: step.hit.ref,
    });

    if (result.kind === 'created') {
      router.replace('/');
      router.refresh();
      return;
    }

    setSubmitting(false);
    setError(result.kind === 'unauthorized' ? 'Session expirée.' : 'Enregistrement impossible.');
  }

  if (step.name === 'quantity') {
    return (
      <>
        <QuantityPad
          foodLabel={step.hit.name}
          per100g={step.hit.per100g}
          shortcuts={step.shortcuts}
          submitting={submitting}
          onSubmit={save}
        />
        {error ? (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="search" className="text-sm text-ink-secondary">
          Nom de l&apos;aliment
        </label>
        <input
          id="search"
          ref={inputRef}
          type="search"
          autoComplete="off"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="tap-target mt-2 w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 outline-none focus:border-primary"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {searching ? <p className="text-sm text-ink-secondary">Recherche…</p> : null}

      {hits !== null && hits.length === 0 && !searching ? (
        <p className="text-sm text-ink-secondary">Aucun aliment trouvé.</p>
      ) : null}

      {hits !== null && hits.length > 0 ? (
        <ul className="divide-y divide-base-300">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.ref}`}>
              <button
                type="button"
                onClick={() => void pick(hit)}
                className="tap-target flex w-full items-baseline justify-between gap-3 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{hit.name}</span>
                  <span className="tabular mt-0.5 block text-xs text-ink-secondary">
                    {formatKcal(hit.per100g.kcal)} kcal / 100 g
                  </span>
                </span>
                <span className="shrink-0 text-xs text-ink-secondary">
                  {SOURCE_LABEL[hit.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
