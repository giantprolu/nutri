'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  APPEARANCES,
  APPEARANCE_HINTS,
  APPEARANCE_LABELS,
  type Appearance,
} from '@/lib/theme';

/**
 * Choix de l'apparence (DESIGN.md, écran Réglages).
 *
 * Le choix part au serveur, qui le range dans un cookie, puis la page est
 * rafraîchie. Ce détour paraît lourd pour une couleur de fond, mais c'est lui
 * qui permet au serveur de rendre le bon thème dès la première réponse : un
 * basculement fait uniquement dans le navigateur afficherait d'abord la page
 * dans le mauvais thème, le temps que le script s'exécute.
 */
export function AppearanceForm({ initial }: { initial: Appearance }) {
  const router = useRouter();
  const [appearance, setAppearance] = useState<Appearance>(initial);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Appearance) {
    if (next === appearance) {
      return;
    }
    const previous = appearance;
    // Bascule optimiste : le sélecteur répond au doigt, pas au réseau.
    setAppearance(next);
    setError(null);

    try {
      const response = await fetch('/api/appearance', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appearance: next }),
      });
      if (!response.ok) {
        setAppearance(previous);
        setError('Réglage non enregistré.');
        return;
      }
      // Le thème est posé sur <html> par le rendu serveur : il faut le refaire.
      router.refresh();
    } catch {
      setAppearance(previous);
      setError('Réglage non enregistré.');
    }
  }

  return (
    <>
      <div className="segmented" role="group" aria-label="Apparence">
        {APPEARANCES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => void choose(value)}
            aria-pressed={appearance === value}
          >
            {APPEARANCE_LABELS[value]}
          </button>
        ))}
      </div>

      <p className="note mt-3">{APPEARANCE_HINTS[appearance]}</p>

      {error ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
