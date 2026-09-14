'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NavHeader } from '@/components/ScreenHeader';
import { QuantityPad } from '@/components/QuantityPad';
import { SearchIcon } from '@/components/icons';
import { buildQuantityShortcuts, type QuantityShortcut } from '@/lib/shortcuts';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, searchFoods } from '@/lib/client/search';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import type { Meal } from '@/lib/meal';
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
  ciqual: 'Ciqual',
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

  async function save(quantityG: number, meal: Meal) {
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
      meal,
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
        <NavHeader
          label="Quantité"
          mode="back"
          onDismiss={() => {
            setError(null);
            setStep({ name: 'search' });
          }}
        />
        <QuantityPad
          foodLabel={step.hit.name}
          sourceLabel={SOURCE_LABEL[step.hit.kind]}
          per100g={step.hit.per100g}
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

  return (
    <>
      <NavHeader label="Rechercher" href="/" />

      <div className="field field-accent">
        <SearchIcon className="h-[18px] w-[18px] flex-none" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          aria-label="Nom de l'aliment"
          placeholder="riz blanc"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[19px] outline-none"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      {searching ? <p className="kicker kicker-quiet mt-6">Recherche…</p> : null}

      {hits !== null && hits.length === 0 && !searching ? (
        <p className="note mt-6">Aucun aliment trouvé.</p>
      ) : null}

      {hits !== null && hits.length > 0 ? (
        <>
          <p className="kicker kicker-quiet mt-6 mb-2">
            {hits.length === 1 ? '1 résultat' : `${hits.length} résultats`}
          </p>
          <hr className="rule" />
          <ul>
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.ref}`}>
                <button
                  type="button"
                  onClick={() => void pick(hit)}
                  className="entry-row items-center"
                >
                  <span className="min-w-0 flex-1">
                    <span className="entry-name block">{hit.name}</span>
                    <span className="entry-meta mt-0.5 block">
                      {formatKcal(hit.per100g.kcal)} kcal · {formatGrams(hit.per100g.proteinG)} P ·{' '}
                      {formatGrams(hit.per100g.carbsG)} G · {formatGrams(hit.per100g.fatG)} L
                    </span>
                  </span>
                  <span
                    className={`kicker flex-none ${hit.kind === 'ciqual' ? 'kicker-quiet' : ''}`}
                  >
                    {SOURCE_LABEL[hit.kind]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {hits !== null && !searching ? (
        <p className="note mt-6 text-center">
          Rien ne correspond ?{' '}
          <Link href="/add/manual" className="link-accent">
            Saisis les valeurs à la main
          </Link>
        </p>
      ) : null}
    </>
  );
}
