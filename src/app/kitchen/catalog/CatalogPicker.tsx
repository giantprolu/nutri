'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CartIcon } from '@/components/icons';
import { chooseMeals } from '@/lib/client/basket';
import { CATALOG_GOAL_LABELS, CATALOG_GOAL_NOTES } from '@/lib/meal-catalog';
import type { Goal } from '@/lib/energy';
import { MEALS, MEAL_LABELS, MEAL_SHORT_LABELS, type Meal } from '@/lib/meal';

/**
 * Un plat du catalogue tel que l'écran de choix le lit.
 *
 * Bien plus léger que `CatalogMeal` : ni étapes ni ingrédients détaillés. On
 * choisit un plat sur son nom, son temps et ses calories, et la recette
 * complète n'a de sens qu'une fois installée.
 */
export interface CatalogCard {
  slug: string;
  name: string;
  slot: Meal;
  servings: number;
  prepMinutes: number;
  ingredientCount: number;
  /** Ordre de grandeur d'une part. Les valeurs justes viennent avec la recette. */
  kcal: number;
  proteinG: number;
  /** Vrai si le plat figure déjà au panier de cette semaine. */
  inBasket: boolean;
}

/**
 * Le choix des plats de la semaine.
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
  cards,
  basketCount,
}: {
  weekStart: string;
  goal: Goal;
  cards: Record<Goal, CatalogCard[]>;
  basketCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slot, setSlot] = useState<Meal | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const meals = cards[goal];
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
            <li key={card.slug}>
              <button
                type="button"
                disabled={busy || card.inBasket}
                onClick={() => toggle(card.slug)}
                aria-pressed={picked}
                className="entry-row w-full items-center text-left"
                style={card.inBasket ? { opacity: 0.55 } : undefined}
              >
                <span className="min-w-0 flex-1">
                  <span className="entry-name block">{card.name}</span>
                  <span className="entry-meta mt-0.5 block">
                    {MEAL_LABELS[card.slot]}
                    {' · '}
                    {card.prepMinutes} min
                    {' · '}
                    {card.servings === 1 ? '1 part' : `${card.servings} parts`}
                    {' · '}
                    {card.ingredientCount} ingrédients
                  </span>
                </span>
                <span className="flex-none text-right">
                  <span className="entry-kcal block">≈ {card.kcal} kcal</span>
                  <span className="entry-meta mt-0.5 block">
                    {card.inBasket ? 'Au panier' : `${card.proteinG} g de protéines`}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="ml-3 flex h-6 w-6 flex-none items-center justify-center rounded-full border"
                  style={{
                    borderColor: picked ? 'var(--color-accent)' : 'var(--color-divider)',
                    color: 'var(--color-accent)',
                  }}
                >
                  {picked ? '✓' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="note mt-4">
        Les calories affichées sont un ordre de grandeur, pour départager deux plats. Les valeurs
        exactes arrivent avec la recette, calculées depuis Ciqual.
      </p>

      {/*
        Le bouton de validation reste en bas du flux et non en position fixe :
        la liste se parcourt d'une traite, et une barre flottante mangerait la
        hauteur utile d'un téléphone pour un geste qu'on fait une fois.
      */}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy || selected.size === 0}
        className="action mt-4"
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
    </>
  );
}
