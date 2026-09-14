'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NavHeader } from '@/components/ScreenHeader';
import { QuantityPad } from '@/components/QuantityPad';
import { buildQuantityShortcuts, type QuantityShortcut } from '@/lib/shortcuts';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { isValidNutrient } from '@/lib/nutrition';
import type { Meal } from '@/lib/meal';
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
  { key: 'kcal', label: 'Énergie', unit: 'kcal' },
  { key: 'proteinG', label: 'Protéines', unit: 'g' },
  { key: 'carbsG', label: 'Glucides', unit: 'g' },
  { key: 'fatG', label: 'Lipides', unit: 'g' },
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
      shortcuts: buildQuantityShortcuts({ recentQuantities: recent }),
    });
  }

  async function save(quantityG: number, meal: Meal) {
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
      meal,
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
        <NavHeader
          label="Quantité"
          mode="back"
          onDismiss={() => {
            setError(null);
            setStep({ name: 'food' });
          }}
        />
        <QuantityPad
          foodLabel={step.foodLabel}
          sourceLabel="Saisie manuelle"
          per100g={step.per100g}
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
      <NavHeader label="Saisie manuelle" href="/" />

      <h1 className="display-sm mt-3">Une entrée ad hoc</h1>
      <p className="note mt-2">
        Rien n&apos;est ajouté aux tables de référence. Cette fiche ne vit que dans ton journal.
      </p>
      <hr className="rule mt-4 mb-6" />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void goToQuantity();
        }}
      >
        <label htmlFor="foodLabel" className="label">
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
          className="field mt-2 mb-6"
        />

        <fieldset>
          <legend className="kicker kicker-quiet">Valeurs pour 100 g</legend>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className="label">
                  {field.label}
                </label>
                <div className="field mt-1.5 items-baseline">
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
                    className="tabular w-full min-w-0 border-0 bg-transparent p-0 outline-none"
                  />
                  <span aria-hidden className="flex-none text-[14px] opacity-45">
                    {field.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={!foodReady} className="action mt-8">
          Continuer vers la quantité
        </button>
      </form>
    </>
  );
}
