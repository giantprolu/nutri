'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CartIcon, CloseIcon, PlusIcon } from '@/components/icons';
import { removeFromBasket, setBasketServings } from '@/lib/client/basket';
import { MAX_BASKET_SERVINGS } from '@/lib/basket';
import type { BasketItem } from '@/server/db/queries/basket';

/**
 * Le panier de la semaine, en tête de la Cuisine.
 *
 * Il répond à une question que le plan ne posait pas : qu'est-ce que j'ai
 * acheté, et qu'en reste-t-il à manger ? Un plat prévu pour quatre parts dont
 * deux sont déjà au plan le dit ici, et nulle part ailleurs — le plan, lui,
 * montre des jours, pas des restes.
 *
 * Retirer un plat ne touche ni à la recette ni à la liste de courses déjà
 * engendrée. La liste est un instantané : elle ne suit pas le panier une fois
 * imprimée, sans quoi elle se réécrirait pendant qu'on fait les courses.
 */

/** Pas d'un réglage de parts. Un demi-plat se mange, un quart ne se cuisine pas. */
const STEP = 0.5;

function formatServings(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return rounded > 1 ? `${text} parts` : `${text} part`;
}

export function WeekBasket({
  weekStart,
  basket,
}: {
  weekStart: string;
  basket: readonly BasketItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function adjust(item: BasketItem, delta: number) {
    const next = Math.round((item.servings + delta) * 10) / 10;
    if (next <= 0 || next > MAX_BASKET_SERVINGS) {
      return;
    }
    setBusy(true);
    setError(null);
    const outcome = await setBasketServings(item.id, next);
    setBusy(false);

    if (outcome.kind === 'ok') {
      router.refresh();
      return;
    }
    setError('Modification impossible.');
  }

  async function drop(item: BasketItem) {
    setBusy(true);
    setError(null);
    const outcome = await removeFromBasket(item.id);
    setBusy(false);

    if (outcome.kind === 'ok') {
      router.refresh();
      return;
    }
    setError('Suppression impossible.');
  }

  return (
    <section className="mt-4">
      <div className="meal-head">
        <span>Mes repas de la semaine</span>
        <Link href={`/kitchen/catalog?from=${weekStart}`} className="kicker link-accent">
          Choisir
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      {basket.length === 0 ? (
        <>
          <p className="note py-2">
            Rien de choisi pour cette semaine. Le parcours commence ici : on choisit des plats,
            on achète de quoi les faire, et on décide du jour au dernier moment.
          </p>
          <Link href={`/kitchen/catalog?from=${weekStart}`} className="action mt-2">
            <PlusIcon className="h-4 w-4" />
            Choisir mes repas
          </Link>
        </>
      ) : (
        <>
          <ul>
            {basket.map((item) => {
              // Ce qu'il reste à mettre à table. Négatif quand on a prévu plus
              // de parts qu'on n'en a acheté : c'est dit, pas ramené à zéro.
              const remaining = Math.round((item.servings - item.plannedServings) * 10) / 10;

              return (
                <li key={item.id} className="py-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/kitchen/recipes/${item.recipeId}`}
                        className="entry-name block"
                      >
                        {item.recipeName}
                      </Link>
                      <p className="entry-meta mt-0.5">
                        {formatServings(item.servings)} prévues
                        {' · '}
                        {remaining <= 0
                          ? 'tout est au plan'
                          : `${formatServings(remaining)} à placer`}
                      </p>
                    </div>

                    <div className="flex flex-none items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void adjust(item, -STEP)}
                        disabled={busy || item.servings <= STEP}
                        aria-label={`Retirer une demi-part de ${item.recipeName}`}
                        className="tap-target flex items-center justify-center text-[19px]"
                      >
                        −
                      </button>
                      <span className="tabular w-[46px] text-center text-[15px]">
                        {item.servings.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => void adjust(item, STEP)}
                        disabled={busy || item.servings >= MAX_BASKET_SERVINGS}
                        aria-label={`Ajouter une demi-part à ${item.recipeName}`}
                        className="tap-target flex items-center justify-center text-[19px]"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => void drop(item)}
                        disabled={busy}
                        aria-label={`Retirer ${item.recipeName} du panier`}
                        className="tap-target flex items-center justify-center"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link href={`/kitchen/shopping?from=${weekStart}`} className="action mt-3">
            <CartIcon className="h-4 w-4" />
            Faire la liste de courses
          </Link>
          <Link href={`/kitchen/catalog?from=${weekStart}`} className="action-quiet mt-2">
            <PlusIcon className="h-4 w-4" />
            Ajouter d’autres plats
          </Link>
        </>
      )}
    </section>
  );
}
