'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CartIcon, ChevronRightIcon } from '@/components/icons';
import { chooseMeals } from '@/lib/client/basket';
import { CATALOG_GOAL_LABELS, CATALOG_GOAL_NOTES } from '@/lib/meal-catalog';
import type { Goal } from '@/lib/energy';
import { MEALS, MEAL_SHORT_LABELS, type Meal } from '@/lib/meal';
import { CatalogMealSheet } from './CatalogMealSheet';

/**
 * Un plat du catalogue tel que l'écran de choix le lit.
 *
 * Il porte tout le plat, étapes comprises, mais pour un seul objectif à la
 * fois : la page n'envoie que l'onglet ouvert, les autres arrivant par une
 * navigation. Descendre les soixante-douze plats d'un coup pour en afficher
 * vingt-quatre triplerait la charge utile sans rien montrer de plus.
 */
export interface CatalogCard {
  slug: string;
  name: string;
  slot: Meal;
  servings: number;
  prepMinutes: number;
  steps: readonly string[];
  ingredients: readonly {
    label: string;
    quantityG: number;
    unitName: string | null;
    unitGrams: number | null;
  }[];
  /** Ordre de grandeur d'une part. Les valeurs justes viennent avec la recette. */
  kcal: number;
  proteinG: number;
  /** Vrai si le plat figure déjà au panier de cette semaine. */
  inBasket: boolean;
}

/**
 * Le choix des plats de la semaine.
 *
 * Chaque ligne ne porte que le nom, et se touche à deux endroits : le rond
 * choisit, le reste ouvre le détail. Deux gestes distincts parce que ce sont
 * deux intentions — on parcourt une liste de trente plats pour reconnaître un
 * nom, et on ouvre le détail des deux ou trois dont on hésite. Empiler
 * ingrédients et durées sous chaque nom rendrait ce parcours impraticable.
 *
 * La sélection est locale tant qu'on n'a pas validé : cocher huit plats fait
 * huit écritures si chaque coche part au serveur, et l'écran devient
 * inutilisable sur une connexion moyenne. Un seul envoi à la fin, et un
 * compte-rendu de ce qui s'est réellement installé.
 *
 * Les plats déjà au panier sont montrés comme tels et ne se décochent pas
 * ici : les retirer se fait depuis le panier, où l'on voit ce qu'on enlève.
 */
export function CatalogPicker({
  weekStart,
  goal,
  meals,
  basketCount,
}: {
  weekStart: string;
  goal: Goal;
  meals: readonly CatalogCard[];
  basketCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slot, setSlot] = useState<Meal | 'all'>('all');
  const [detail, setDetail] = useState<CatalogCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = slot === 'all' ? meals : meals.filter((card) => card.slot === slot);

  function toggle(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  async function confirm() {
    if (selected.size === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    const outcome = await chooseMeals(weekStart, [...selected]);
    setBusy(false);

    if (outcome.kind !== 'chosen') {
      setError(
        outcome.kind === 'unauthorized'
          ? 'Session expirée.'
          : 'Ces plats n’ont pas pu être ajoutés.',
      );
      return;
    }

    const { report } = outcome;
    const parts = [
      report.chosen === 1 ? '1 plat au panier.' : `${report.chosen} plats au panier.`,
    ];
    // Ce qui n'a pas pu s'installer est dit, jamais tu : une recette amputée
    // d'un ingrédient donne un total trop bas, et c'est le genre d'erreur
    // qu'on ne remarque qu'après trois semaines de journal.
    if (report.failed.length > 0) {
      parts.push(`Sans fiche exploitable, donc écartés : ${report.failed.join(', ')}.`);
    }
    if (report.skippedIngredients.length > 0) {
      parts.push(
        `Ingrédients introuvables dans Ciqual et manquants : ${[
          ...new Set(report.skippedIngredients),
        ].join(', ')}.`,
      );
    }

    setSelected(new Set());
    setNotice(parts.join(' '));
    router.refresh();
  }

  return (
    <>
      <nav className="segmented mt-4" aria-label="Objectif">
        {(['lose', 'maintain', 'gain'] as const).map((candidate) => (
          <Link
            key={candidate}
            href={`/kitchen/catalog?from=${weekStart}&goal=${candidate}`}
            aria-current={goal === candidate ? 'page' : undefined}
          >
            {CATALOG_GOAL_LABELS[candidate]}
          </Link>
        ))}
      </nav>
      <p className="note mt-2">{CATALOG_GOAL_NOTES[goal]}</p>

      <div className="segmented mt-4" role="group" aria-label="Type de repas">
        <button type="button" onClick={() => setSlot('all')} aria-pressed={slot === 'all'}>
          Tout
        </button>
        {MEALS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setSlot(candidate)}
            aria-pressed={slot === candidate}
          >
            {MEAL_SHORT_LABELS[candidate]}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="note mt-3">
          {notice}
        </p>
      ) : null}

      <ul className="mt-2">
        {shown.map((card) => {
          const picked = selected.has(card.slug);
          return (
            <li
              key={card.slug}
              className="flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--color-divider)' }}
            >
              {/*
                Deux boutons frères et non l'un dans l'autre : un bouton
                imbriqué est un balisage invalide, que les lecteurs d'écran
                rendent de façon imprévisible. Le rond garde ses 44 px de
                cible, sans quoi il se touche une fois sur deux.
              */}
              <button
                type="button"
                disabled={busy || card.inBasket}
                onClick={() => toggle(card.slug)}
                aria-pressed={picked}
                aria-label={`Choisir ${card.name}`}
                className="tap-target -ml-2 flex flex-none items-center justify-center"
              >
                <span
                  aria-hidden
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[13px] leading-none font-semibold"
                  style={{
                    borderColor:
                      picked || card.inBasket ? 'var(--color-accent)' : 'var(--color-divider)',
                    color: 'var(--color-accent)',
                    opacity: card.inBasket ? 0.55 : 1,
                  }}
                >
                  {picked || card.inBasket ? '✓' : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetail(card)}
                className="flex min-w-0 flex-1 items-center gap-2 py-[13px] text-left"
                aria-haspopup="dialog"
              >
                <span
                  className="entry-name"
                  style={card.inBasket ? { opacity: 0.55 } : undefined}
                >
                  {card.name}
                </span>
                {card.inBasket ? <span className="entry-meta flex-none">Au panier</span> : null}
                <ChevronRightIcon className="h-4 w-4 flex-none opacity-40" />
              </button>
            </li>
          );
        })}
      </ul>

      {/*
        Le bouton de validation reste en bas du flux et non en position fixe :
        la liste se parcourt d'une traite, et une barre flottante mangerait la
        hauteur utile d'un téléphone pour un geste qu'on fait une fois.
      */}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy || selected.size === 0}
        className="action mt-5"
      >
        {busy
          ? 'Ajout…'
          : selected.size === 0
            ? 'Choisis des plats'
            : selected.size === 1
              ? 'Ajouter 1 plat au panier'
              : `Ajouter ${selected.size} plats au panier`}
      </button>

      {basketCount > 0 ? (
        <Link href={`/kitchen/shopping?from=${weekStart}`} className="action-quiet mt-3">
          <CartIcon className="h-4 w-4" />
          {basketCount === 1
            ? '1 plat au panier — passer aux courses'
            : `${basketCount} plats au panier — passer aux courses`}
        </Link>
      ) : null}

      <CatalogMealSheet
        card={detail}
        picked={detail !== null && selected.has(detail.slug)}
        busy={busy}
        onClose={() => setDetail(null)}
        onToggle={(slug) => {
          toggle(slug);
          setDetail(null);
        }}
      />
    </>
  );
}
