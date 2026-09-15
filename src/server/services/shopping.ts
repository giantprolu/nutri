import 'server-only';
import { aisleFor, type Aisle } from '@/lib/aisle';
import { quantityForServings } from '@/lib/recipe';
import { aggregateNeeds, ingredientKey, type ShoppingNeed } from '@/lib/shopping';
import { shiftDate } from '@/lib/date';
import {
  boughtProductsFor,
  closeShoppingList,
  deleteShoppingItem,
  forgetIngredientProduct,
  groupCodesFor,
  insertShoppingItem,
  insertShoppingList,
  latestShoppingList,
  rememberIngredientProduct,
  setItemChecked,
  type ShoppingList,
} from '../db/queries/shopping';
import { listPlannedMeals } from '../db/queries/meal-plan';
import { findRecipe } from '../db/queries/recipes';
import { WEEK_LENGTH } from './meal-plan';

/**
 * Service de la liste de courses.
 *
 * Il fait deux choses : transformer un plan en liste, et retenir ce qu'on a
 * réellement acheté. La seconde est la moins visible et la plus utile — c'est
 * elle qui fait qu'un journal finit par décrire le steak haché du placard et
 * non la moyenne d'une table de composition.
 */

export type { ShoppingList };

export function currentList(userId: number): Promise<ShoppingList | null> {
  return latestShoppingList(userId);
}

/**
 * Engendre une liste depuis les plats prévus d'une période.
 *
 * Les plats déjà journalisés sont écartés : ils ont été mangés, leurs
 * ingrédients sont donc déjà achetés. Régénérer une liste en milieu de semaine
 * ne doit pas faire racheter les dîners de lundi et mardi.
 *
 * Les ingrédients sans fiche sont gardés, contrairement à ce que fait la
 * journalisation. Les deux traitements divergent parce que leurs erreurs
 * divergent : journaliser un ingrédient sans macros fausserait un total, alors
 * qu'une liste de courses n'a besoin que d'un nom et d'une quantité. Oublier
 * de l'acheter, en revanche, se paie au moment de cuisiner.
 */
export async function generateList(
  userId: number,
  fromDate: string,
  toDate: string = shiftDate(fromDate, WEEK_LENGTH - 1),
): Promise<ShoppingList | null> {
  const planned = await listPlannedMeals(userId, fromDate, toDate);
  const pending = planned.filter((entry) => entry.journaledAt === null);

  // Les recettes sont chargées une fois chacune : un plat répété trois fois
  // dans la semaine ne doit pas coûter trois lectures.
  const recipeIds = [...new Set(pending.map((entry) => entry.recipeId))];
  const recipes = new Map(
    (await Promise.all(recipeIds.map((id) => findRecipe(userId, id))))
      .filter((recipe) => recipe !== null)
      .map((recipe) => [recipe.id, recipe]),
  );

  const raw: (Omit<ShoppingNeed, 'aisle'> & { aisle: Aisle | null })[] = [];
  for (const entry of pending) {
    const recipe = recipes.get(entry.recipeId);
    if (recipe === undefined) {
      continue;
    }
    for (const ingredient of recipe.ingredients) {
      const quantityG = quantityForServings(
        ingredient.quantityG,
        recipe.servings,
        entry.servings,
      );
      if (quantityG <= 0) {
        continue;
      }
      raw.push({
        refKind: ingredient.refKind,
        refValue: ingredient.refValue,
        label: ingredient.label,
        quantityG,
        unitName: ingredient.unitName,
        unitGrams: ingredient.unitGrams,
        aisle: null,
      });
    }
  }

  if (raw.length === 0) {
    return null;
  }

  // Le rayon vient du groupe alimentaire de l'ANSES, chargé en une requête
  // pour tous les codes à la fois.
  const groups = await groupCodesFor(
    raw.filter((need) => need.refKind === 'ciqual').map((need) => need.refValue),
  );

  const needs: ShoppingNeed[] = raw.map((need) => ({
    ...need,
    aisle: aisleFor(
      need.label,
      need.refKind === 'ciqual' ? (groups.get(need.refValue) ?? null) : null,
    ),
  }));

  await insertShoppingList(userId, fromDate, toDate, aggregateNeeds(needs));
  return latestShoppingList(userId);
}

export function closeList(userId: number, listId: number): Promise<boolean> {
  return closeShoppingList(userId, listId);
}

export function removeItem(userId: number, itemId: number): Promise<boolean> {
  return deleteShoppingItem(userId, itemId);
}

export function addItem(
  userId: number,
  listId: number,
  item: {
    refKind: 'ciqual' | 'product';
    refValue: string;
    label: string;
    quantityG: number;
    aisle: Aisle;
  },
): Promise<number | null> {
  return insertShoppingItem(userId, listId, item);
}

export interface CheckItemInput {
  itemId: number;
  checked: boolean;
  /** Code-barres scanné en rayon, si l'article a été coché au scanner. */
  barcode: string | null;
  /** Référence de l'article, pour mémoriser le produit acheté. */
  refKind: 'ciqual' | 'product';
  refValue: string;
}

/**
 * Coche un article, et retient le produit scanné pour cet ingrédient.
 *
 * C'est le geste qui relie les courses au journal. Scanner le paquet qu'on met
 * dans le chariot ne fait pas que cocher une ligne : il dit quelle fiche
 * emploieront les prochains repas construits sur cet ingrédient.
 *
 * Décocher oublie la liaison. Un article décoché n'a pas été acheté, et le
 * produit qu'on avait scanné n'a donc pas à décider des macros à venir.
 */
export async function checkItem(userId: number, input: CheckItemInput): Promise<boolean> {
  const updated = await setItemChecked(userId, input.itemId, input.checked, input.barcode);
  if (!updated) {
    return false;
  }

  const key = ingredientKey(input.refKind, input.refValue);
  if (input.checked && input.barcode !== null) {
    await rememberIngredientProduct(userId, key, input.barcode);
  } else if (!input.checked) {
    await forgetIngredientProduct(userId, key);
  }
  return true;
}

/** Les produits achetés pour une série d'ingrédients, indexés par leur clé. */
export function boughtProducts(userId: number, keys: readonly string[]) {
  return boughtProductsFor(userId, keys);
}
