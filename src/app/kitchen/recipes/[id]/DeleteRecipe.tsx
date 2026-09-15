'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteRecipe } from '@/lib/client/recipes';

/**
 * Suppression d'une recette, en deux temps.
 *
 * Le premier appui arme, le second supprime. Pas de fenêtre de confirmation
 * du navigateur : sur une application installée sur l'écran d'accueil, elle
 * apparaît comme un avertissement de page web et rompt l'illusion — sans
 * compter qu'elle bloque tout le reste tant qu'on ne l'a pas fermée.
 *
 * Supprimer une recette ne touche à aucune entrée déjà journalisée : celles-ci
 * portent leurs propres macros (AD-1) et ne référencent pas la recette.
 */
export function DeleteRecipe({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setBusy(true);
    setFailed(false);
    const outcome = await deleteRecipe(id);

    if (outcome.kind === 'deleted') {
      router.replace('/kitchen');
      router.refresh();
      return;
    }
    setBusy(false);
    setArmed(false);
    setFailed(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (armed ? void confirm() : setArmed(true))}
        onBlur={() => setArmed(false)}
        disabled={busy}
        className="action-danger mt-3"
      >
        {busy
          ? 'Suppression…'
          : armed
            ? `Confirmer la suppression de ${name}`
            : 'Supprimer la recette'}
      </button>

      {failed ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          Suppression impossible.
        </p>
      ) : null}
    </>
  );
}
