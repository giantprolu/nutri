import { useState } from 'react';
import { isValidNutrient } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';

/**
 * Saisie manuelle d'un produit (FR-15).
 *
 * Le seul formulaire long de l'application. Il est acceptable parce qu'il ne se
 * produit qu'une fois par produit : la fiche rejoint le cache et le scan suivant
 * la retrouve directement.
 *
 * Le code-barres est prérempli et non modifiable : il vient du décodage ou de
 * la saisie, et le changer ici ferait écrire la fiche sous une mauvaise clé.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis ScanFlow.
 */

const FIELDS = [
  { key: 'kcal', label: 'Énergie (kcal)' },
  { key: 'proteinG', label: 'Protéines (g)' },
  { key: 'carbsG', label: 'Glucides (g)' },
  { key: 'fatG', label: 'Lipides (g)' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export interface ProductFormValues {
  name: string;
  per100g: Macros;
  servingSizeG: number | null;
}

function initialField(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function ProductForm({
  barcode,
  initialName,
  initialPer100g,
  initialServingSizeG,
  submitting,
  onSubmit,
}: {
  barcode: string;
  initialName: string | null;
  initialPer100g: Partial<Macros>;
  initialServingSizeG: number | null;
  submitting: boolean;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialName ?? '');
  const [values, setValues] = useState<Record<FieldKey, string>>({
    kcal: initialField(initialPer100g.kcal),
    proteinG: initialField(initialPer100g.proteinG),
    carbsG: initialField(initialPer100g.carbsG),
    fatG: initialField(initialPer100g.fatG),
  });

  function parsed(): Macros | null {
    const macros = {} as Macros;
    for (const field of FIELDS) {
      const raw = values[field.key].trim().replace(',', '.');
      const value = Number(raw);
      if (raw === '' || !Number.isFinite(value) || !isValidNutrient(value)) {
        return null;
      }
      macros[field.key] = value;
    }
    return macros;
  }

  const macros = parsed();
  const ready = name.trim().length > 0 && macros !== null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && macros && !submitting) {
          void onSubmit({
            name: name.trim(),
            per100g: macros,
            servingSizeG: initialServingSizeG,
          });
        }
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor="product-barcode" className="text-sm text-ink-secondary">
          Code-barres
        </label>
        <input
          id="product-barcode"
          type="text"
          value={barcode}
          readOnly
          aria-readonly="true"
          className="tabular tap-target mt-2 w-full rounded-field border border-base-300 bg-base-300/40 px-4 py-3 text-ink-secondary"
        />
      </div>

      <div>
        <label htmlFor="product-name" className="text-sm text-ink-secondary">
          Nom du produit
        </label>
        <input
          id="product-name"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="tap-target mt-2 w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 outline-none focus:border-primary"
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm text-ink-secondary">Valeurs pour 100 g</legend>
        {FIELDS.map((field) => {
          const missing = initialPer100g[field.key] === undefined;
          return (
            <div key={field.key}>
              <label htmlFor={`product-${field.key}`} className="text-sm text-ink-secondary">
                {field.label}
                {missing ? <span className="ml-1 text-xs text-warning">à compléter</span> : null}
              </label>
              <input
                id={`product-${field.key}`}
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
          );
        })}
      </fieldset>

      <button
        type="submit"
        disabled={!ready || submitting}
        className="tap-target mt-2 w-full rounded-field bg-primary py-3 font-medium text-primary-content disabled:opacity-40"
      >
        {submitting ? 'Enregistrement…' : 'Continuer'}
      </button>
    </form>
  );
}
