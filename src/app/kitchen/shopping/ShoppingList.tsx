'use client';

import { BarcodeIcon, RefreshCwIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomBar } from '@/components/BottomBar';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AISLES, AISLE_LABELS, type Aisle } from '@/lib/aisle';
import { formatIngredientQuantity, shoppingUnitCount } from '@/lib/recipe';
import { checkItem, generateList, removeItem } from '@/lib/client/shopping';
import { cn } from '@/lib/utils';
import type { ShoppingList as List, ShoppingItem } from '@/server/db/queries/shopping';
import { ScanToCheck } from './ScanToCheck';

/**
 * La liste de courses, rangée par rayon.
 *
 * Les articles cochés restent en place, grisés, plutôt que de descendre en bas
 * de liste ou de disparaître. Une liste qui se réordonne sous le pouce fait
 * perdre sa place au milieu d'un rayon, et c'est exactement le moment où l'on
 * ne peut pas y consacrer d'attention.
 *
 * Le scan est le geste central de cet écran, pas une commodité : il occupe la
 * barre basse. C'est lui qui relie les courses au journal, le produit scanné
 * devenant la fiche employée par les prochains repas construits sur cet
 * ingrédient.
 */

/** Ce qu'une quantité demande d'acheter, en unités si l'ingrédient s'en compte. */
function purchaseLabel(item: ShoppingItem): string {
  const count = shoppingUnitCount(item.quantityG, item.unitName, item.unitGrams);
  if (count === null || item.unitName === null) {
    return formatIngredientQuantity(item);
  }
  const plural = count >= 2 && !/[sxz]$/i.test(item.unitName) ? `${item.unitName}s` : item.unitName;
  return `${count} ${plural} (${Math.round(item.quantityG).toLocaleString('fr-FR')} g)`;
}

export function ShoppingList({ list, weekStart }: { list: List | null; weekStart: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setError(null);
    const outcome = await generateList(weekStart);
    setBusy(false);

    if (outcome.kind === 'generated') {
      router.refresh();
      return;
    }
    setError(
      outcome.kind === 'empty'
        ? 'Aucun plat au panier pour cette semaine : commence par choisir tes repas.'
        : 'La liste n’a pas pu être engendrée.',
    );
  }

  async function toggle(item: ShoppingItem, barcode: string | null) {
    setBusy(true);
    setError(null);
    const outcome = await checkItem({
      id: item.id,
      checked: item.checkedAt === null,
      barcode,
      refKind: item.refKind,
      refValue: item.refValue,
    });
    setBusy(false);

    if (outcome.kind === 'ok') {
      router.refresh();
      return;
    }
    setError('Modification impossible.');
  }

  async function drop(item: ShoppingItem) {
    setBusy(true);
    await removeItem(item.id);
    setBusy(false);
    router.refresh();
  }

  if (list === null) {
    return (
      <div className="py-8 text-center">
        <p className="mx-auto max-w-[26ch] text-lg font-semibold tracking-tight">
          La liste se déduit des plats choisis.
        </p>
        <p className="mx-auto mt-2 max-w-[32ch] text-muted-foreground">
          Les ingrédients du panier de la semaine, additionnés et rangés par rayon.
        </p>
        <div className="mx-auto mt-5 flex max-w-[260px] flex-col gap-2.5">
          <Button type="button" onClick={() => void regenerate()} disabled={busy}>
            {busy ? 'Calcul…' : 'Engendrer la liste'}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/kitchen/catalog?from=${weekStart}`}>Choisir mes repas</Link>
          </Button>
        </div>
        {error ? <ErrorAlert className="text-left">{error}</ErrorAlert> : null}
      </div>
    );
  }

  const total = list.items.length;
  const taken = list.items.filter((item) => item.checkedAt !== null).length;
  const share = total === 0 ? 0 : Math.round((taken / total) * 100);

  return (
    <>
      <Card className="mt-4">
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="tabular text-[14.5px] font-medium tracking-tight">
              {taken === total ? 'Tout est pris' : `${taken} sur ${total} pris`}
            </span>
            <span className="tabular text-muted-foreground">{share} %</span>
          </div>
          <Progress value={share} aria-label="Articles pris" className="mt-2.5" />
        </CardContent>
      </Card>

      {error ? <ErrorAlert className="mt-3">{error}</ErrorAlert> : null}

      {AISLES.map((aisle: Aisle) => {
        const items = list.items.filter((item) => item.aisle === aisle);
        if (items.length === 0) {
          return null;
        }

        return (
          <section key={aisle} aria-label={AISLE_LABELS[aisle]} className="mt-3.5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold tracking-tight">{AISLE_LABELS[aisle]}</h2>
              <span className="tabular text-muted-foreground">{items.length}</span>
            </div>

            <Card className="gap-0 overflow-hidden py-0">
              <ul>
                {items.map((item) => {
                  const done = item.checkedAt !== null;
                  const id = `shopping-item-${item.id}`;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 border-b py-1 pr-1.5 pl-4 last:border-b-0"
                    >
                      <Checkbox
                        id={id}
                        checked={done}
                        onCheckedChange={() => void toggle(item, null)}
                        disabled={busy}
                        className="size-[18px]"
                      />
                      <label
                        htmlFor={id}
                        className={cn('min-w-0 flex-1 cursor-pointer py-1.5', done && 'opacity-55')}
                      >
                        <span
                          className={cn(
                            'block truncate text-[14.5px] font-medium tracking-tight',
                            done && 'line-through',
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="tabular mt-px block text-[12.5px] text-muted-foreground">
                          {purchaseLabel(item)}
                          {/*
                            Le code-barres scanné est rappelé : c'est lui qui
                            décide désormais des macros de cet ingrédient, et
                            rien d'autre ne le dirait.
                          */}
                          {item.checkedBarcode === null ? '' : ' · scanné'}
                        </span>
                      </label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void drop(item)}
                        disabled={busy}
                        aria-label={`Retirer ${item.label} de la liste`}
                        className="text-muted-foreground"
                      >
                        <XIcon />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        );
      })}

      <Button
        type="button"
        variant="ghost"
        onClick={() => void regenerate()}
        disabled={busy}
        className="mt-5 w-full"
      >
        <RefreshCwIcon />
        Refaire la liste depuis le plan
      </Button>
      <p className="mt-1 text-center text-[12.5px] text-muted-foreground">
        Une nouvelle liste remplace celle-ci. Les plats déjà mangés en sont exclus.
      </p>

      <BottomBar>
        <Button
          type="button"
          variant="outline"
          onClick={() => setScanning(true)}
          aria-haspopup="dialog"
          className="w-full"
        >
          <BarcodeIcon />
          Scanner un article
        </Button>
      </BottomBar>

      <ScanToCheck
        open={scanning}
        items={list.items}
        onClose={() => setScanning(false)}
        onCheck={(item, barcode) => {
          setScanning(false);
          void toggle({ ...item, checkedAt: null }, barcode);
        }}
      />
    </>
  );
}
