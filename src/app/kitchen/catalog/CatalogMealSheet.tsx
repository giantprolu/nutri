import { useEffect, useRef } from 'react';
import { CloseIcon } from '@/components/icons';
import { MEAL_LABELS } from '@/lib/meal';
import { formatIngredientQuantity } from '@/lib/recipe';
import type { CatalogCard } from './CatalogPicker';

/**
 * Le détail d'un plat du catalogue, avant de le choisir.
 *
 * La liste ne porte que des noms : c'est sur le nom qu'on parcourt trente
 * plats, et des ingrédients sous chacun rendraient l'écran illisible. Mais un
 * nom ne suffit pas à décider — « Bowl pois chiches et patate douce » ne dit ni
 * ce qu'il faut acheter ni combien de temps il prend. Le détail est donc à un
 * toucher, et non absent.
 *
 * Rendu dans un `<dialog>` natif, comme les autres feuilles : le navigateur
 * fournit la couche supérieure, le piège à focus et la fermeture par la touche
 * d'échappement.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis
 * `CatalogPicker`, qui la porte déjà.
 */
export function CatalogMealSheet({
  card,
  picked,
  busy,
  onClose,
  onToggle,
}: {
  /** Le plat à détailler, ou `null` quand la feuille est fermée. */
  card: CatalogCard | null;
  /** Vrai si le plat fait partie de la sélection en cours. */
  picked: boolean;
  busy: boolean;
  onClose: () => void;
  onToggle: (slug: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (card !== null && !dialog.open) {
      dialog.showModal();
    } else if (card === null && dialog.open) {
      dialog.close();
    }
  }, [card]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      aria-label={card?.name ?? 'Détail du plat'}
      className="sheet"
    >
      {card === null ? null : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="kicker">{MEAL_LABELS[card.slot]}</p>
              <h2 className="display-sm mt-1">{card.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="tap-target -mr-2 flex flex-none items-center justify-center opacity-55"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <p className="entry-meta mt-2">
            {card.prepMinutes} min
            {' · '}
            {card.servings === 1 ? '1 part' : `${card.servings} parts`}
            {' · '}≈ {card.kcal} kcal et {card.proteinG} g de protéines par part
          </p>
          {/*
            L'estimation est dite estimation. Les valeurs justes arrivent avec
            la recette installée, calculées depuis Ciqual comme partout : un
            chiffre de catalogue sert à départager deux plats, pas à compter
            une journée.
          */}
          <p className="note mt-1">Ordre de grandeur, pour départager deux plats.</p>

          <hr className="rule mt-4" />
          <p className="kicker mt-4 mb-1">Ingrédients</p>
          <ul>
            {card.ingredients.map((ingredient) => (
              <li key={ingredient.label} className="entry-row items-center">
                <span className="entry-name">{ingredient.label}</span>
                <span className="entry-meta flex-none">
                  {formatIngredientQuantity(ingredient)}
                </span>
              </li>
            ))}
          </ul>

          {card.steps.length > 0 ? (
            <>
              <p className="kicker mt-5 mb-2">Préparation</p>
              <ol className="space-y-3">
                {card.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="kicker kicker-quiet flex-none pt-1">{index + 1}</span>
                    <span className="text-[16px] leading-[1.5]">{step}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {card.inBasket ? (
            <p className="note mt-6 text-center">Ce plat est déjà au panier de la semaine.</p>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(card.slug)}
              disabled={busy}
              className="action mt-6"
            >
              {picked ? 'Retirer de ma sélection' : 'Choisir ce plat'}
            </button>
          )}
        </>
      )}
    </dialog>
  );
}
