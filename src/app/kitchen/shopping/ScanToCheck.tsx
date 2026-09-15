import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { ScannerView } from '@/app/add/scan/ScannerView';
import { resolveBarcode } from '@/lib/client/products';
import { bestMatch, type MatchableItem } from '@/lib/shopping';
import type { ShoppingItem } from '@/server/db/queries/shopping';

/**
 * Scan d'un produit en rayon pour cocher un article.
 *
 * Le viseur est celui du parcours d'ajout au journal, monté ici tel quel : il
 * porte déjà le zoom, la torche, la mise au point continue et la saisie
 * manuelle en repli, qui font la différence entre un décodage en une seconde
 * et un échec attribué à l'application.
 *
 * Le rapprochement est proposé, jamais appliqué d'office. Le score de
 * similarité suffit à écarter le bruit mais pas à trancher : « Riz » couvre
 * aussi bien « Riz basmati » que « Galette de riz soufflé », et c'est
 * l'utilisateur qui tient le paquet.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis
 * ShoppingList, qui la porte déjà.
 */

type Step =
  | { name: 'scanning' }
  | { name: 'resolving' }
  /** Produit reconnu, article proposé — ou aucun, à choisir dans la liste. */
  | { name: 'matched'; barcode: string; productName: string; suggested: ShoppingItem | null }
  | { name: 'unknown'; barcode: string };

export function ScanToCheck({
  open,
  items,
  onClose,
  onCheck,
}: {
  open: boolean;
  items: readonly ShoppingItem[];
  onClose: () => void;
  onCheck: (item: ShoppingItem, barcode: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>({ name: 'scanning' });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      setStep({ name: 'scanning' });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleBarcode(barcode: string) {
    setStep({ name: 'resolving' });
    const resolved = await resolveBarcode(barcode);

    if (resolved.kind !== 'cached' && resolved.kind !== 'fetched') {
      // Produit inconnu d'Open Food Facts : l'article se coche quand même, et
      // c'est le bon comportement. On l'a bel et bien mis dans le chariot ;
      // seule la fiche manque, et elle ne sert qu'aux macros.
      setStep({ name: 'unknown', barcode });
      return;
    }

    const match = bestMatch(resolved.product.name, items as readonly MatchableItem[]);
    setStep({
      name: 'matched',
      barcode,
      productName: resolved.product.name,
      suggested: match === null ? null : (match.item as ShoppingItem),
    });
  }

  const pending = items.filter((item) => item.checkedAt === null);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      aria-label="Scanner un produit"
      className="sheet"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="kicker">En rayon</p>
          <h2 className="display-sm mt-1">Scanner un produit</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="tap-target -mr-2 flex items-center justify-center opacity-55"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <hr className="rule mt-3" />

      {step.name === 'scanning' ? (
        <div className="mt-3">
          <ScannerView onBarcode={(barcode) => void handleBarcode(barcode)} />
        </div>
      ) : null}

      {step.name === 'resolving' ? (
        <p className="kicker kicker-quiet py-6 text-center">Lecture de la fiche…</p>
      ) : null}

      {step.name === 'matched' || step.name === 'unknown' ? (
        <>
          <p className="mt-4 text-[19px] leading-[1.3] font-semibold">
            {step.name === 'matched' ? step.productName : 'Produit inconnu'}
          </p>
          <p className="note mt-1">
            {step.name === 'matched'
              ? step.suggested === null
                ? 'Aucun article ne lui ressemble. Choisis celui qu’il coche.'
                : 'Article proposé, à confirmer.'
              : 'Aucune fiche pour ce code-barres. Coche quand même l’article qu’il concerne.'}
          </p>

          {step.name === 'matched' && step.suggested !== null ? (
            <button
              type="button"
              onClick={() => onCheck(step.suggested as ShoppingItem, step.barcode)}
              className="action mt-4"
            >
              Cocher « {step.suggested.label} »
            </button>
          ) : null}

          <p className="kicker kicker-quiet mt-5 mb-1">
            {step.name === 'matched' && step.suggested !== null
              ? 'Ou un autre article'
              : 'Articles à prendre'}
          </p>
          <hr className="rule" />

          {pending.length === 0 ? (
            <p className="note py-4">Tout est déjà coché.</p>
          ) : (
            <ul>
              {pending
                .filter(
                  (item) => !(step.name === 'matched' && item.id === step.suggested?.id),
                )
                .map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onCheck(item, step.barcode)}
                      className="entry-row items-center"
                    >
                      <span className="entry-name flex-1">{item.label}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setStep({ name: 'scanning' })}
            className="action-quiet mt-4"
          >
            Scanner un autre produit
          </button>
        </>
      ) : null}
    </dialog>
  );
}
