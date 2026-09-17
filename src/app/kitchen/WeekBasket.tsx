'use client';

import { MinusIcon, PlusIcon, ShoppingCartIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <section aria-label="Mes repas de la semaine">
      <div className="flex items-center justify-between pt-[18px] pb-2">
        <h2 className="text-[13px] font-semibold tracking-tight">Mes repas de la semaine</h2>
        <Button asChild variant="link" size="sm" className="-mr-3 h-auto">
          <Link href={`/kitchen/catalog?from=${weekStart}`}>Choisir</Link>
        </Button>
      </div>

      {error ? <ErrorAlert className="mt-0 mb-2">{error}</ErrorAlert> : null}

      {basket.length === 0 ? (
        <Card>
          <div className="px-4">
            <p className="text-muted-foreground">
              Rien de choisi pour cette semaine. Le parcours commence ici : on choisit des plats,
              on achète de quoi les faire, et on décide du jour au dernier moment.
            </p>
            <Button asChild className="mt-3 w-full">
              <Link href={`/kitchen/catalog?from=${weekStart}`}>
                <PlusIcon />
                Choisir mes repas
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <ul>
              {basket.map((item) => {
                // Ce qu'il reste à mettre à table. Négatif quand on a prévu plus
                // de parts qu'on n'en a acheté : c'est dit, pas ramené à zéro.
                const remaining = Math.round((item.servings - item.plannedServings) * 10) / 10;

                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 border-b py-2.5 pr-2 pl-4 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/kitchen/recipes/${item.recipeId}`}
                        className="block truncate text-[14.5px] font-medium tracking-tight"
                      >
                        {item.recipeName}
                      </Link>
                      <p className="tabular mt-px text-[12.5px] text-muted-foreground">
                        {formatServings(item.servings)} prévues
                        {' · '}
                        {remaining <= 0
                          ? 'tout est au plan'
                          : `${formatServings(remaining)} à placer`}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void adjust(item, -STEP)}
                      disabled={busy || item.servings <= STEP}
                      aria-label={`Retirer une demi-part de ${item.recipeName}`}
                    >
                      <MinusIcon />
                    </Button>
                    <span className="tabular w-8 text-center font-medium">
                      {item.servings.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void adjust(item, STEP)}
                      disabled={busy || item.servings >= MAX_BASKET_SERVINGS}
                      aria-label={`Ajouter une demi-part à ${item.recipeName}`}
                    >
                      <PlusIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void drop(item)}
                      disabled={busy}
                      aria-label={`Retirer ${item.recipeName} du panier`}
                      className="text-muted-foreground"
                    >
                      <XIcon />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="mt-2.5 flex gap-2">
            <Button asChild className="flex-[1.4]">
              <Link href={`/kitchen/shopping?from=${weekStart}`}>
                <ShoppingCartIcon />
                Liste de courses
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/kitchen/catalog?from=${weekStart}`}>
                <PlusIcon />
                D’autres plats
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
