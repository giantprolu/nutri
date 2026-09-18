'use client';

import { MinusIcon, PlusIcon, ShoppingCartIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
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
 * Régler des parts ici décide de ce qu'il faut acheter, et la liste de courses
 * ouverte de la semaine suit : monter un plat de deux à quatre parts double ce
 * que ses ingrédients réclament. Ce qui est déjà coché ou écrit à la main n'y
 * bouge pas, et une liste close ne bouge plus du tout — le détail de ce qui
 * survit vit dans `syncListToBasket`, côté serveur.
 *
 * Retirer un plat ne touche pas à la recette, qui reste au carnet.
 *
 * Le compte de parts suit le doigt et l'écriture suit derrière : chaque demi-
 * part réécrit la liste de courses côté serveur, et attendre cette réponse
 * avant d'afficher le nouveau compte rendait le réglage poussif, alors qu'on
 * le fait par petits coups répétés. Les écritures d'une même ligne sont mises
 * à la queue plutôt qu'envoyées en vrac : deux appels concurrents pourraient
 * arriver dans le désordre, et c'est le dernier parti qui doit gagner, pas le
 * dernier arrivé.
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
  /** Les parts affichées d'avance, en attendant que le serveur les confirme. */
  const [posted, setPosted] = useState<ReadonlyMap<number, number>>(new Map());
  const [refreshing, startRefresh] = useTransition();
  /** Une file par ligne, pour que les écritures gardent l'ordre des gestes. */
  const queues = useRef(new Map<number, Promise<unknown>>());

  // Le panier rendu par le serveur porte ces parts : les avances ont fait leur
  // office, et les garder ferait tenir une valeur périmée.
  useEffect(() => setPosted(new Map()), [basket]);

  function servingsOf(item: BasketItem): number {
    return posted.get(item.id) ?? item.servings;
  }

  function adjust(item: BasketItem, delta: number): void {
    const current = servingsOf(item);
    const next = Math.round((current + delta) * 10) / 10;
    if (next <= 0 || next > MAX_BASKET_SERVINGS) {
      return;
    }

    setPosted((previous) => new Map(previous).set(item.id, next));
    setError(null);

    const previous = queues.current.get(item.id) ?? Promise.resolve();
    const write = previous
      .catch(() => undefined)
      .then(async () => {
        const outcome = await setBasketServings(item.id, next);
        if (outcome.kind !== 'ok') {
          setPosted((current) => {
            const rolled = new Map(current);
            rolled.delete(item.id);
            return rolled;
          });
          setError('Modification impossible.');
          return;
        }
        // Les parts à placer et la liste de courses se recalculent au serveur.
        startRefresh(() => router.refresh());
      });

    queues.current.set(item.id, write);
  }

  async function drop(item: BasketItem) {
    setBusy(true);
    setError(null);
    const outcome = await removeFromBasket(item.id);
    setBusy(false);

    if (outcome.kind === 'ok') {
      startRefresh(() => router.refresh());
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
                const servings = servingsOf(item);
                const remaining = Math.round((servings - item.plannedServings) * 10) / 10;

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
                        {formatServings(servings)} prévues
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
                      onClick={() => adjust(item, -STEP)}
                      disabled={busy || servings <= STEP}
                      aria-label={`Retirer une demi-part de ${item.recipeName}`}
                    >
                      <MinusIcon />
                    </Button>
                    <span className="tabular w-8 text-center font-medium">
                      {servings.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => adjust(item, STEP)}
                      disabled={busy || servings >= MAX_BASKET_SERVINGS}
                      aria-label={`Ajouter une demi-part à ${item.recipeName}`}
                    >
                      <PlusIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void drop(item)}
                      disabled={busy || refreshing}
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

          <p className="mt-2 text-[12.5px] text-muted-foreground">
            La liste de courses de la semaine suit ces parts, sauf ce qui y est déjà coché.
          </p>

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
