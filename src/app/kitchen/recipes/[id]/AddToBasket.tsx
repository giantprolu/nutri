'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CartIcon } from '@/components/icons';
import { addRecipeToBasket } from '@/lib/client/basket';

/**
 * Mettre cette recette au panier de la semaine en cours.
 *
 * Le geste existe pour les recettes écrites à la main. Celles du catalogue y
 * entrent au moment du choix ; sans ce bouton, une recette personnelle ne
 * pourrait jamais rejoindre la liste de courses, qui se déduit du panier.
 *
 * Les parts proposées sont celles de la recette : on cuisine ce qu'elle
 * produit, et c'est au panier qu'on ajuste ensuite si la semaine en demande
 * le double.
 */
export function AddToBasket({
  recipeId,
  servings,
  weekStart,
  alreadyChosen,
}: {
  recipeId: number;
  servings: number;
  weekStart: string;
  alreadyChosen: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    const outcome = await addRecipeToBasket({ weekStart, recipeId, servings });
    setBusy(false);

    if (outcome.kind === 'added') {
      router.refresh();
      return;
    }
    setError(
      outcome.kind === 'unauthorized'
        ? 'Session expirée.'
        : 'Ce plat n’a pas pu être mis au panier.',
    );
  }

  if (alreadyChosen) {
    return <p className="note mt-4 text-center">Ce plat est au panier de la semaine.</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void add()}
        disabled={busy}
        className="action-quiet mt-3"
      >
        <CartIcon className="h-4 w-4" />
        {busy ? 'Ajout…' : 'Mettre au panier de la semaine'}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
