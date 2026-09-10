'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QuantityPad, type QuantityShortcut } from '@/components/QuantityPad';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { isValidNutrient } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';

/**
 * Saisie ad hoc d'une entrée (FR-25).
 *
 * Deux étapes : la fiche pour 100 g, puis la quantité. Rien n'est ajouté au
 * cache produits ni aux aliments CIQUAL — une entrée ad hoc ne pollue aucune
 * table de référence.
 */

type Step =
  | { name: 'food' }
  | { name: 'quantity'; foodLabel: string; per100g: Macros; shortcuts: QuantityShortcut[] };

const FIELDS = [
  { key: 'kcal', label: 'Énergie (kcal)' },
  { key: 'proteinG', label: 'Protéines (g)' },
  { key: 'carbsG', label: 'Glucides (g)' },
  { key: 'fatG', label: 'Lipides (g)' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export function ManualEntryFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'food' });
  const [foodLabel, setFoodLabel] = useState('');
  const [values, setValues] = useState<Record<FieldKey, string>>({
    kcal: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parsedMacros(): Macros | null {
    const parsed = {} as Macros;
    for (const field of FIELDS) {
      const raw = values[field.key].trim().replace(',', '.');
      const value = Number(raw);
      if (raw === '' || !Number.isFinite(value) || !isValidNutrient(value)) {
        return null;
      }
      parsed[field.key] = value;
    }
    return parsed;
  }

  const macros = parsedMacros();
  const foodReady = foodLabel.trim().length > 0 && macros !== null;

  async function goToQuantity() {
    if (!macros) {
      return;
    }
    const label = foodLabel.trim();
    const recent = await fetchRecentQuantities('manual', null, label);
    setStep({
      name: 'quantity',
      foodLabel: label,
      per100g: macros,
      // Ordre fixe : dernières quantités puis 100 g (FR-9).
      shortcuts: [
        ...recent.map((grams) => ({ label: `${grams} g`, grams })),
        ...(recent.includes(100) ? [] : [{ label: '100 g', grams: 100 }]),
      ],
    });
  }

  async function save(quantityG: number) {
    if (step.name !== 'quantity') {
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await createEntry({
      foodLabel: step.foodLabel,
      per100g: step.per100g,
      quantityG,
      sourceKind: 'manual',
      sourceRef: null,
    });

    if (result.kind === 'created') {
      // Retour systématique au journal après un enregistrement (UX-DR-7).
      router.replace('/');
      router.refresh();
      return;
    }

    setSubmitting(false);
    setError(
      result.kind === 'unauthorized'
        ? 'Session expirée.'
        : result.kind === 'invalid'
          ? 'Quantité invalide.'
          : 'Enregistrement impossible.',
    );
  }

  if (step.name === 'quantity') {
    return (
      <>
        <QuantityPad
          foodLabel={step.foodLabel}
          per100g={step.per100g}
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
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void goToQuantity();
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor="foodLabel" className="text-sm text-ink-secondary">
          Désignation
        </label>
        <input
          id="foodLabel"
          name="foodLabel"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          value={foodLabel}
          onChange={(event) => setFoodLabel(event.target.value)}
          className="tap-target mt-2 w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 outline-none focus:border-primary"
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm text-ink-secondary">Valeurs pour 100 g</legend>
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="text-sm text-ink-secondary">
              {field.label}
            </label>
            <input
              id={field.key}
              name={field.key}
              type="text"
              inputMode="decimal"
              required
              autoComplete="off"
              value={values[field.key]}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, [field.key]: event.target.value }))
              }
              className="tabular tap-target mt-2 w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 outline-none focus:border-primary"
            />
          </div>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={!foodReady}
        className="tap-target mt-2 w-full rounded-field bg-primary py-3 font-medium text-primary-content disabled:opacity-40"
      >
        Continuer
      </button>
    </form>
  );
}
