import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_QUANTITY_G, formatGrams, formatKcal, scaleMacros } from '@/lib/nutrition';
import type { Macros } from '@/lib/types';
import type { QuantityShortcut } from '@/lib/shortcuts';

/**
 * Pavé de quantité (FR-8, FR-9). Étape terminale commune aux trois chemins
 * d'ajout : saisie ad hoc, scan, recherche et reconnaissance photo s'y branchent.
 *
 * Ancré en bas de l'écran, au-dessus du clavier : toute cible tactile fréquente
 * vit dans les deux tiers inférieurs (UX-DR-3).
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis des
 * écrans qui la portent déjà. La poser en ferait une frontière serveur/client
 * où le rappel `onSubmit` devrait être une Server Action.
 */

export type { QuantityShortcut };

export function QuantityPad({
  foodLabel,
  per100g,
  shortcuts,
  submitting,
  onSubmit,
}: {
  foodLabel: string;
  per100g: Macros;
  shortcuts: readonly QuantityShortcut[];
  submitting: boolean;
  onSubmit: (quantityG: number) => void | Promise<void>;
}) {
  const [raw, setRaw] = useState('');
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
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !submitting) {
          void onSubmit(quantity);
        }
      }}
      className="flex flex-col gap-4"
    >
      <div className="rounded-box border border-base-300 bg-base-200 p-4">
        <p className="text-sm font-medium">{foodLabel}</p>
        <p className="tabular mt-1 text-xs text-ink-secondary">
          {formatKcal(per100g.kcal)} kcal · {formatGrams(per100g.proteinG)} P ·{' '}
          {formatGrams(per100g.carbsG)} G · {formatGrams(per100g.fatG)} L, pour 100 g
        </p>
      </div>

      {shortcuts.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quantités habituelles">
          {shortcuts.map((shortcut) => (
            <button
              key={`${shortcut.label}-${shortcut.grams}`}
              type="button"
              // Renseigne le champ sans valider : l'utilisateur garde la main (FR-9).
              onClick={() => setRaw(String(shortcut.grams))}
              className="tap-target rounded-field border border-base-300 bg-base-200 px-4 text-sm"
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      ) : null}

      <div>
        <label htmlFor="quantity" className="text-sm text-ink-secondary">
          Quantité en grammes
        </label>
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
          className="tabular tap-target mt-2 w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 text-lg outline-none focus:border-primary"
        />
        {error ? (
          <p id="quantity-error" role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        ) : null}
      </div>

      {preview ? (
        <p className="tabular text-sm text-ink-secondary">
          Soit {formatKcal(preview.kcal)} kcal · {formatGrams(preview.proteinG)} g P ·{' '}
          {formatGrams(preview.carbsG)} g G · {formatGrams(preview.fatG)} g L
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="tap-target w-full rounded-field bg-primary py-3 font-medium text-primary-content disabled:opacity-40"
      >
        {submitting ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}
