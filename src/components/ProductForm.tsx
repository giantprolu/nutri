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
 * Le code-barres n'est pas repris ici : l'écran qui monte ce formulaire
 * l'affiche déjà en surtitre, et un champ en lecture seule de plus ne ferait
 * qu'éloigner le premier champ réellement saisissable.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis ScanFlow.
 */

const FIELDS = [
  { key: 'kcal', label: 'Énergie', unit: 'kcal' },
  { key: 'proteinG', label: 'Protéines', unit: 'g' },
  { key: 'carbsG', label: 'Glucides', unit: 'g' },
  { key: 'fatG', label: 'Lipides', unit: 'g' },
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
  initialName,
  initialPer100g,
  initialServingSizeG,
  submitting,
  onSubmit,
}: {
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
    >
      <label htmlFor="product-name" className="label">
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
        className="field mt-2 mb-6"
      />

      <fieldset>
        <legend className="kicker kicker-quiet">Valeurs pour 100 g</legend>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
          {FIELDS.map((field) => {
            const missing = initialPer100g[field.key] === undefined;
            return (
              <div key={field.key}>
                <label htmlFor={`product-${field.key}`} className="label">
                  {field.label}
                  {missing ? (
                    <span className="ml-1" style={{ color: 'var(--color-accent)' }}>
                      ·
                    </span>
                  ) : null}
                </label>
                <div className={`field mt-1.5 items-baseline ${missing ? 'field-accent' : ''}`}>
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
                    className="tabular w-full min-w-0 border-0 bg-transparent p-0 outline-none"
                  />
                  <span aria-hidden className="flex-none text-[14px] opacity-45">
                    {field.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="note mt-3">
          Les champs marqués d&apos;un point sont absents de la fiche d&apos;origine.
        </p>
      </fieldset>

      <button type="submit" disabled={!ready || submitting} className="action mt-6">
        {submitting ? 'Enregistrement…' : 'Continuer'}
      </button>
    </form>
  );
}
