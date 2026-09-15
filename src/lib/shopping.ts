/**
 * Liste de courses : agrégation et appariement. Fonctions pures (AD-8).
 *
 * Deux opérations vivent ici, et toutes deux devaient être vérifiables sans
 * base. L'agrégation décide de ce qu'on achète, l'appariement de ce qu'un
 * code-barres scanné vient cocher — une erreur dans l'une fait manquer un
 * ingrédient, une erreur dans l'autre coche le mauvais article.
 */

import type { Aisle } from './aisle';
import type { IngredientRefKind } from './recipe';

/** La clé d'un ingrédient : sa référence, jamais son nom. */
export function ingredientKey(refKind: IngredientRefKind, refValue: string): string {
  return `${refKind}:${refValue}`;
}

/** Ce qu'une recette réclame, une fois mis à l'échelle des parts prévues. */
export interface ShoppingNeed {
  refKind: IngredientRefKind;
  refValue: string;
  label: string;
  quantityG: number;
  unitName: string | null;
  unitGrams: number | null;
  aisle: Aisle;
}

/** Une ligne de liste : un ingrédient, tout ce que la semaine en demande. */
export interface AggregatedNeed extends ShoppingNeed {
  /** Nombre de plats qui le réclament, pour expliquer une quantité surprenante. */
  sourceCount: number;
}

/**
 * Additionne les besoins d'un même ingrédient.
 *
 * L'agrégation porte sur la référence et non sur le nom : deux recettes qui
 * écrivent « Poulet » et « Cuisses de poulet » pour la même fiche CIQUAL
 * désignent le même achat, et deux lignes séparées feraient acheter deux fois.
 * À l'inverse, un riz CIQUAL et un riz à code-barres restent deux lignes — ce
 * sont deux produits différents, et les additionner serait faux.
 *
 * Le libellé retenu est celui du premier besoin rencontré, les besoins
 * arrivant dans l'ordre du plan. L'unité n'est gardée que si tous les besoins
 * s'accordent : mélanger « 2 œufs » et « 100 g d'œuf » donnerait un compte
 * d'unités faux, et mieux vaut alors revenir aux grammes, qui sont toujours
 * justes.
 */
export function aggregateNeeds(needs: readonly ShoppingNeed[]): AggregatedNeed[] {
  const byKey = new Map<string, AggregatedNeed>();

  for (const need of needs) {
    const key = ingredientKey(need.refKind, need.refValue);
    const existing = byKey.get(key);

    if (existing === undefined) {
      byKey.set(key, { ...need, sourceCount: 1 });
      continue;
    }

    const sameUnit =
      existing.unitName === need.unitName && existing.unitGrams === need.unitGrams;

    byKey.set(key, {
      ...existing,
      quantityG: existing.quantityG + need.quantityG,
      sourceCount: existing.sourceCount + 1,
      unitName: sameUnit ? existing.unitName : null,
      unitGrams: sameUnit ? existing.unitGrams : null,
    });
  }

  return [...byKey.values()];
}

/**
 * Normalise un libellé pour la comparaison : minuscules, sans accents, et
 * découpé sur tout ce qui n'est ni lettre ni chiffre.
 *
 * Les mots de moins de trois lettres sont écartés. Ils ne portent aucune
 * information — « de », « au », « la » — et un seul d'entre eux partagé
 * suffirait sinon à apparier deux produits sans rapport.
 */
function words(label: string): string[] {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
}

/**
 * Part des mots de l'article que le nom du produit couvre, entre 0 et 1.
 *
 * La couverture est mesurée dans ce sens et non l'inverse : un produit de
 * marque porte des mots que l'article n'a pas — « Bio », « 500g », le nom du
 * fabricant — et les compter au dénominateur ferait chuter le score de la
 * bonne réponse. Ce qu'on veut savoir, c'est si le produit contient ce que
 * l'article demande.
 */
export function matchScore(productName: string, itemLabel: string): number {
  const itemWords = words(itemLabel);
  if (itemWords.length === 0) {
    return 0;
  }
  const productWords = new Set(words(productName));

  let covered = 0;
  for (const word of itemWords) {
    // La correspondance accepte le préfixe : « tomates » couvre « tomate »,
    // que la dépluralisation seule raterait dans l'autre sens.
    if (
      productWords.has(word) ||
      [...productWords].some((candidate) => candidate.startsWith(word) || word.startsWith(candidate))
    ) {
      covered += 1;
    }
  }
  return covered / itemWords.length;
}

/**
 * En deçà, l'appariement n'est pas proposé.
 *
 * La moitié des mots : « Steak haché 5 % » face à « Bœuf haché 5 % MG Charal »
 * couvre « haché » sur deux mots utiles et passe, quand « Riz » face à
 * « Galette de riz soufflé » couvre son unique mot et passerait aussi. C'est
 * pourquoi le résultat est proposé et non appliqué : le seuil filtre le bruit,
 * il ne décide pas à la place de l'utilisateur.
 */
export const MATCH_THRESHOLD = 0.5;

export interface MatchableItem {
  id: number;
  label: string;
  checkedAt: Date | null;
}

/**
 * L'article que ce produit vient probablement cocher, ou `null`.
 *
 * Les articles déjà cochés sont écartés : on ne scanne pas deux fois le même
 * rayon, et proposer un article coché ferait perdre le vrai candidat.
 */
export function bestMatch<T extends MatchableItem>(
  productName: string,
  items: readonly T[],
): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    if (item.checkedAt !== null) {
      continue;
    }
    const score = matchScore(productName, item.label);
    if (score >= MATCH_THRESHOLD && (best === null || score > best.score)) {
      best = { item, score };
    }
  }

  return best;
}
