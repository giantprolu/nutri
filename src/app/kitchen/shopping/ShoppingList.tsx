'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarcodeIcon, CloseIcon } from '@/components/icons';
import { AISLES, AISLE_LABELS, type Aisle } from '@/lib/aisle';
import { formatIngredientQuantity, shoppingUnitCount } from '@/lib/recipe';
import { checkItem, generateList, removeItem } from '@/lib/client/shopping';
import Link from 'next/link';
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
 * Le scan est le geste central de cet écran, pas une commodité. C'est lui qui
 * relie les courses au journal : le produit scanné devient la fiche employée
 * par les prochains repas construits sur cet ingrédient.
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
        <p className="mx-auto max-w-[26ch] text-[23px] leading-[1.35] font-semibold">
          La liste se déduit des plats choisis.
        </p>
        <p className="note mx-auto mt-3 max-w-[32ch]">
          Les ingrédients du panier de la semaine, additionnés et rangés par rayon.
        </p>
        <button
          type="button"
          onClick={() => void regenerate()}
          disabled={busy}
          className="action mx-auto mt-6 max-w-[260px]"
        >
          {busy ? 'Calcul…' : 'Engendrer la liste'}
        </button>
        <Link href={`/kitchen/catalog?from=${weekStart}`} className="action-quiet mx-auto mt-3 max-w-[260px]">
          Choisir mes repas
        </Link>
        {error ? (
          <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const remaining = list.items.filter((item) => item.checkedAt === null).length;

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <p className="kicker">
          {remaining === 0
            ? 'Tout est pris'
            : `${remaining} article${remaining > 1 ? 's' : ''} à prendre`}
        </p>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="chip"
          aria-haspopup="dialog"
        >
          <BarcodeIcon className="mr-2 h-4 w-4" />
          Scanner
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      {AISLES.map((aisle: Aisle) => {
        const items = list.items.filter((item) => item.aisle === aisle);
        if (items.length === 0) {
          return null;
        }

        return (
          <section key={aisle} className="mt-3">
            <div className="meal-head">
              <span>{AISLE_LABELS[aisle]}</span>
              <span className="kicker">{items.length}</span>
            </div>

            <ul>
              {items.map((item) => {
                const done = item.checkedAt !== null;
                return (
                  <li key={item.id} className="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => void toggle(item, null)}
                      disabled={busy}
                      aria-pressed={done}
                      className="entry-row flex-1 items-center"
                      style={done ? { opacity: 0.45 } : undefined}
                    >
                      <span className="min-w-0 flex-1 text-left">
                        <span
                          className="entry-name block"
                          style={done ? { textDecoration: 'line-through' } : undefined}
                        >
                          {item.label}
                        </span>
                        <span className="entry-meta mt-0.5 block">
                          {purchaseLabel(item)}
                          {/*
                            Le code-barres scanné est rappelé : c'est lui qui
                            décide désormais des macros de cet ingrédient, et
                            rien d'autre ne le dirait.
                          */}
                          {item.checkedBarcode === null ? '' : ' · scanné'}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void drop(item)}
                      disabled={busy}
                      aria-label={`Retirer ${item.label} de la liste`}
                      className="tap-target flex flex-none items-center justify-center"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => void regenerate()}
        disabled={busy}
        className="action-quiet mt-6"
      >
        Refaire la liste depuis le plan
      </button>
      <p className="note mt-2 text-center">
        Une nouvelle liste remplace celle-ci. Les plats déjà mangés en sont exclus.
      </p>

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
