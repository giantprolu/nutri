import 'server-only';
import { MAX_BASKET_SERVINGS } from '@/lib/basket';
import {
  deleteBasketItem,
  insertBasketItem,
  installedCatalogSlugs,
  listBasket,
  updateBasketServings,
  type BasketItem,
} from '../db/queries/basket';

/**
 * Service du panier de la semaine.
 *
 * Il ne fait presque rien, et c'est voulu : le panier est une liste de choix,
 * pas un calcul. Ce qu'il déclenche — l'installation des recettes, la liste de
 * courses, le plan — vit dans les services qui en ont la charge.
 */

export type { BasketItem };
export { MAX_BASKET_SERVINGS };

export function basketFor(userId: number, weekStart: string): Promise<BasketItem[]> {
  return listBasket(userId, weekStart);
}

/** Les recettes déjà installées depuis le catalogue, indexées par `slug`. */
export function installedFor(userId: number): Promise<Map<string, number>> {
  return installedCatalogSlugs(userId);
}

export type BasketAddResult =
  | { kind: 'added'; id: number }
  | { kind: 'invalid' }
  | { kind: 'not_found' };

/**
 * Met une recette du carnet au panier de la semaine.
 *
 * Distinct de `chooseCatalogMeals`, qui part d'un `slug` et installe la
 * recette au passage. Ici elle existe déjà — c'est la sienne, écrite à la
 * main — et il n'y a rien à installer. Sans cette porte, une recette écrite à
 * la main ne pourrait jamais rejoindre la liste de courses, puisque celle-ci
 * se déduit du panier.
 */
export async function addRecipeToBasket(
  userId: number,
  weekStart: string,
  recipeId: number,
  servings: number,
): Promise<BasketAddResult> {
  if (!Number.isFinite(servings) || servings <= 0 || servings > MAX_BASKET_SERVINGS) {
    return { kind: 'invalid' };
  }
  const id = await insertBasketItem(userId, weekStart, recipeId, servings);
  // `null` signifie que la recette n'est pas la sienne : introuvable, et non
  // interdit, pour ne pas confirmer l'existence d'une recette d'un autre compte.
  return id === null ? { kind: 'not_found' } : { kind: 'added', id };
}

export type BasketUpdateResult = 'updated' | 'invalid' | 'not_found';

export async function setBasketServings(
  userId: number,
  id: number,
  servings: number,
): Promise<BasketUpdateResult> {
  if (!Number.isFinite(servings) || servings <= 0 || servings > MAX_BASKET_SERVINGS) {
    return 'invalid';
  }
  return (await updateBasketServings(userId, id, servings)) ? 'updated' : 'not_found';
}

export function removeFromBasket(userId: number, id: number): Promise<boolean> {
  return deleteBasketItem(userId, id);
}
