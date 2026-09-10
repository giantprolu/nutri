import type { Macros, OffLookup, OffPartialProduct } from '../types';

/**
 * Interrogation d'Open Food Facts (FR-13).
 *
 * AD-2 : cet appel part du NAVIGATEUR, jamais d'une route serveur. La limite
 * d'Open Food Facts est de 15 requêtes par minute et par adresse IP ; passer
 * par une fonction Vercel mutualiserait l'IP et consommerait ce quota pour
 * tous les appels de la plateforme.
 *
 * AD-3 : l'API répond HTTP 200 même quand le produit est introuvable. Le seul
 * indicateur exploitable est le champ `status` du corps, dont la valeur 1
 * signifie que le produit a été trouvé. Un `response.ok` ici serait un bug.
 *
 * Ce module est le seul de l'application autorisé à joindre ce domaine.
 */

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';

/** Restreint la charge utile : sans ce paramètre, une fiche pèse plusieurs centaines de kilo-octets. */
const FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'generic_name_fr',
  'brands',
  'serving_quantity',
  'serving_size',
  'nutriments',
].join(',');

/** Au-delà, on bascule sur le parcours de produit inconnu (FR-13). */
const TIMEOUT_MS = 8000;

/**
 * Identification de l'application, exigée par les conditions d'usage de l'API.
 *
 * L'en-tête est `X-User-Agent` et non `User-Agent` : les navigateurs
 * interdisent de surcharger `User-Agent` depuis fetch, et Open Food Facts
 * documente cette variante pour les clients JavaScript.
 *
 * La valeur est en dur : `src/server/env.ts` ne franchit pas la frontière
 * serveur, et ce n'est pas un secret.
 */
const USER_AGENT_COMMENT =
  'NutriPerso/0.1 (usage personnel; https://github.com/giantprolu/nutri-perso)';

interface OffNutriments {
  'energy-kcal_100g'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

interface OffPayload {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    product_name_fr?: string;
    generic_name_fr?: string;
    brands?: string;
    serving_quantity?: number | string;
    serving_size?: string;
    nutriments?: OffNutriments;
  };
}

function toFiniteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

/** Le français d'abord : la base est multilingue et `product_name` peut être anglais. */
function pickName(product: NonNullable<OffPayload['product']>): string | null {
  const candidates = [
    product.product_name_fr,
    product.product_name,
    product.generic_name_fr,
  ];
  const name = candidates.find((value) => typeof value === 'string' && value.trim() !== '');
  if (!name) {
    return null;
  }
  const brand = product.brands?.split(',')[0]?.trim();
  return brand && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${name.trim()} — ${brand}`
    : name.trim();
}

/**
 * L'énergie est parfois absente en kcal et présente en kilojoules.
 * La conversion est faite ici, à l'écriture, jamais à la lecture (AD-8).
 */
function pickKcal(nutriments: OffNutriments): number | undefined {
  const kcal = toFiniteNumber(nutriments['energy-kcal_100g']);
  if (kcal !== undefined) {
    return kcal;
  }
  const kj = toFiniteNumber(nutriments.energy_100g);
  return kj === undefined ? undefined : Math.round((kj / 4.184) * 1000) / 1000;
}

function pickServingSize(product: NonNullable<OffPayload['product']>): number | null {
  const quantity = toFiniteNumber(product.serving_quantity);
  if (quantity !== undefined && quantity > 0) {
    return quantity;
  }
  // `serving_size` est du texte libre : « 30 g », « 1 pot (125g) ».
  const match = product.serving_size?.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  const parsed = match?.[1] === undefined ? undefined : toFiniteNumber(match[1]);
  return parsed !== undefined && parsed > 0 ? parsed : null;
}

/**
 * Résout un code-barres auprès d'Open Food Facts.
 * Renvoie une variante plutôt que de lever (AD-12) : l'interface doit pouvoir
 * distinguer « inconnu » de « fiche incomplète » de « service injoignable ».
 */
export async function lookupBarcode(barcode: string): Promise<OffLookup> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}/${barcode}.json?fields=${FIELDS}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'X-User-Agent': USER_AGENT_COMMENT },
    });
  } catch (error) {
    return {
      kind: 'error',
      reason: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timeout);
  }

  let payload: OffPayload;
  try {
    payload = (await response.json()) as OffPayload;
  } catch {
    return { kind: 'error', reason: 'malformed' };
  }

  // AD-3 : le succès se lit ici, pas dans response.ok.
  if (payload.status !== 1 || !payload.product) {
    return { kind: 'not_found' };
  }

  const product = payload.product;
  const nutriments = product.nutriments ?? {};
  const name = pickName(product);
  const servingSizeG = pickServingSize(product);

  const per100g: Partial<Macros> = {
    kcal: pickKcal(nutriments),
    proteinG: toFiniteNumber(nutriments.proteins_100g),
    carbsG: toFiniteNumber(nutriments.carbohydrates_100g),
    fatG: toFiniteNumber(nutriments.fat_100g),
  };

  const complete =
    name !== null &&
    per100g.kcal !== undefined &&
    per100g.proteinG !== undefined &&
    per100g.carbsG !== undefined &&
    per100g.fatG !== undefined;

  if (!complete) {
    const partial: OffPartialProduct = { barcode, name, per100g, servingSizeG };
    return { kind: 'incomplete', partial };
  }

  return {
    kind: 'found',
    product: {
      barcode,
      name,
      per100g: per100g as Macros,
      servingSizeG,
    },
  };
}
