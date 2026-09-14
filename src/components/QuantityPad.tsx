import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_QUANTITY_G, formatGrams, formatKcal, scaleMacros } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';
import { MEALS, MEAL_SHORT_LABELS, type Meal, mealForHour } from '@/lib/meal';
import { hourInParis } from '@/lib/date';
import type { QuantityShortcut } from '@/lib/shortcuts';

/**
 * Écran de quantité (FR-8, FR-9). Étape terminale commune aux quatre chemins
 * d'ajout : saisie ad hoc, scan, recherche et reconnaissance photo s'y branchent.
 *
 * Deux choses vivent en bas, sous un filet, dans une barre qui ne défile pas :
 * le repas et l'enregistrement. Toute cible tactile fréquente vit dans les deux
 * tiers inférieurs (UX-DR-3), et ces deux-là closent le geste.
 *
 * Le repas est présélectionné d'après l'heure, jamais imposé : c'est une
 * proposition qui tombe juste assez souvent pour que le geste ordinaire soit
 * une simple validation.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis des
 * écrans qui la portent déjà. La poser en ferait une frontière serveur/client
 * où le rappel `onSubmit` devrait être une Server Action.
 */

export type { QuantityShortcut };

export function QuantityPad({
  foodLabel,
  sourceLabel,
  per100g,
  shortcuts,
  submitting,
  onSubmit,
}: {
  foodLabel: string;
  /** Provenance de la fiche : « Ciqual », « Scanné », « Saisie manuelle ». */
  sourceLabel: string;
  per100g: Macros;
  shortcuts: readonly QuantityShortcut[];
  submitting: boolean;
  onSubmit: (quantityG: number, meal: Meal) => void | Promise<void>;
}) {
  const [raw, setRaw] = useState('');
  const [meal, setMeal] = useState<Meal>(() => mealForHour(hourInParis()));
  const inputRef = useRef<HTMLInputElement>(null);

  // Le champ reçoit le focus à l'ouverture (EXPERIENCE.md, motifs de composants).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quantity = Number(raw);
  const error = useMemo(() => {
    if (raw.trim() === '') {
      return null;
    }
    if (!/^\d+$/.test(raw.trim())) {
      return 'Saisis un nombre entier de grammes.';
    }
    if (quantity <= 0) {
      return 'La quantité doit être supérieure à zéro.';
    }
    if (quantity >= MAX_QUANTITY_G) {
      return `La quantité doit rester sous ${MAX_QUANTITY_G} g.`;
    }
    return null;
  }, [raw, quantity]);

  const valid = raw.trim() !== '' && error === null;
  const preview = valid ? scaleMacros(per100g, quantity) : null;

  return (
    <form
      id="quantity-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !submitting) {
          void onSubmit(quantity, meal);
        }
      }}
    >
      <div className="pt-4">
        <p className="kicker">{sourceLabel} · pour 100 g</p>
        <h2 className="display-sm mt-1.5">{foodLabel}</h2>
        <p className="tabular note mt-2">
          {formatKcal(per100g.kcal)} kcal · {formatGrams(per100g.proteinG)} P ·{' '}
          {formatGrams(per100g.carbsG)} G · {formatGrams(per100g.fatG)} L
        </p>
      </div>

      <hr className="rule my-4" />

      {shortcuts.length > 0 ? (
        <>
          <p className="label">Quantités habituelles</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quantités habituelles">
            {shortcuts.map((shortcut) => (
              <button
                key={`${shortcut.label}-${shortcut.grams}`}
                type="button"
                // Renseigne le champ sans valider : l'utilisateur garde la main (FR-9).
                onClick={() => setRaw(String(shortcut.grams))}
                aria-pressed={raw === String(shortcut.grams)}
                className="chip"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <label htmlFor="quantity" className="label mt-6 block">
        Quantité en grammes
      </label>
      <div className="field field-accent mt-2 items-baseline gap-2">
        <input
          id="quantity"
          ref={inputRef}
          name="quantity"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'quantity-error' : undefined}
          className="figure w-full min-w-0 border-0 bg-transparent p-0 text-[48px] leading-[1.1] outline-none"
        />
        <span aria-hidden className="text-[17px] opacity-50">
          g
        </span>
      </div>

      {error ? (
        <p id="quantity-error" role="alert" className="mt-2 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="aside-accent mt-6">
          <p className="kicker kicker-quiet">Soit, dans le journal</p>
          <p className="figure mt-1 text-[33px] leading-tight">
            {formatKcal(preview.kcal)} kcal
          </p>
          <p className="tabular note mt-0.5">
            {formatGrams(preview.proteinG)} g P · {formatGrams(preview.carbsG)} g G ·{' '}
            {formatGrams(preview.fatG)} g L
          </p>
        </div>
      ) : null}

      {/* Réserve la hauteur de la barre basse, qui ne défile pas. */}
      <div aria-hidden className="h-[150px]" />

      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-divider)',
        }}
      >
        <div className="mx-auto max-w-lg px-4 pt-4 pb-[calc(18.4px+env(safe-area-inset-bottom,0px))]">
          <p className="label mb-2 block" id="meal-label">
            Repas
          </p>
          <div className="segmented mb-3" role="group" aria-labelledby="meal-label">
            {MEALS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMeal(value)}
                aria-pressed={meal === value}
              >
                {MEAL_SHORT_LABELS[value]}
              </button>
            ))}
          </div>

          <button type="submit" disabled={!valid || submitting} className="action">
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </form>
  );
}
