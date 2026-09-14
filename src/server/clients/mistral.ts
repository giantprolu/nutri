import 'server-only';
import { Mistral } from '@mistralai/mistralai';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { env, requireEnv } from '../env';

/**
 * Client du modèle de vision (FR-17, AD-4).
 *
 * Seul module de l'application autorisé à importer le SDK Mistral. La clé
 * n'a pas de préfixe `NEXT_PUBLIC_` et ne franchit jamais la frontière
 * serveur : le navigateur envoie une image à /api/recognize et reçoit un
 * tableau de chaînes, rien d'autre.
 *
 * Le rôle du modèle est volontairement étroit : nommer des aliments. Il
 * n'estime ni quantité ni calories, parce qu'un modèle de vision n'a aucun
 * moyen fiable d'évaluer la masse d'une portion sur une image.
 */

/**
 * Le modèle nomme pour une base précise, et la consigne le dit.
 *
 * Sans ces règles de nommage, le modèle rendait des libellés de carte de
 * restaurant — « émincé de volaille et son riz parfumé » — que la recherche
 * CIQUAL ne pouvait pas rapprocher de « Poulet, blanc, cuit ». Un plat composé
 * rendu d'un bloc était pire encore : aucune ligne CIQUAL ne porte une recette
 * entière, alors que chacun de ses ingrédients y figure.
 */
const SYSTEM_PROMPT = [
  "Tu identifies les aliments visibles sur une photo de repas. Ces noms serviront à",
  "retrouver chaque aliment dans la table CIQUAL de l'Anses, dont les libellés sont",
  'génériques et au singulier.',
  '',
  'Règles de nommage, impératives :',
  "- Décompose un plat composé en ses ingrédients principaux, un par entrée. Une pizza",
  "  donne « pâte à pizza », « fromage », « tomate ». Un couscous donne « semoule »,",
  '  « agneau », « carotte ».',
  "- Chaque nom fait un à trois mots : l'aliment de base, puis sa cuisson ou sa forme",
  '  quand elle est visible. « riz cuit », « poulet rôti », « haricot vert », « pain complet ».',
  "- Emploie le mot courant et générique du français, au singulier. Jamais de marque,",
  "  de nom de recette, ni d'adjectif d'aspect. Écris « poulet », pas « émincé de volaille",
  '  fermière ». Écris « tomate », pas « tomate bien mûre ».',
  '- Ne nomme ni la vaisselle, ni les couverts, ni la nappe, ni le décor.',
  '- Au plus huit entrées, les plus nourrissantes en premier.',
  '',
  "N'estime jamais de quantité, de poids, de calories ni de valeur nutritionnelle :",
  "l'utilisateur pèse lui-même.",
  '',
  'Réponds par un objet JSON de la forme {"aliments": ["riz cuit", "poulet rôti"]}.',
  'Si aucun aliment n\'est identifiable, réponds {"aliments": []}.',
].join('\n');

const MAX_NAMES = 12;

/** De quoi énumérer une dizaine de noms courts, pas de quoi disserter. */
const MAX_TOKENS = 400;

export type RecognizeResult =
  | { kind: 'recognized'; names: string[] }
  | { kind: 'unavailable' }
  | { kind: 'quota_exceeded' }
  | { kind: 'bad_format' };

/**
 * Le modèle encadre parfois sa réponse dans un bloc de code, malgré la
 * consigne. On retire ces délimiteurs avant d'analyser, plutôt que de
 * traiter une réponse par ailleurs correcte comme un échec.
 */
function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/**
 * Retient les chaînes exploitables d'un tableau.
 *
 * Une entrée aberrante au milieu d'une réponse par ailleurs bonne est écartée,
 * là où l'ancienne version rejetait la réponse entière : perdre les six
 * aliments corrects d'une photo parce que le septième est un nombre n'aidait
 * personne, et se présentait à l'utilisateur comme une panne du modèle.
 */
function usableNames(items: readonly unknown[]): string[] {
  const names = items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 100);

  // Le modèle répète parfois un ingrédient vu à deux endroits de l'assiette.
  const unique = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, name);
    }
  }

  return [...unique.values()].slice(0, MAX_NAMES);
}

/**
 * Extrait la liste de noms d'une réponse.
 *
 * Trois formes sont acceptées : l'objet demandé, un tableau nu, et un objet à
 * clé unique portant un tableau. Le mode JSON garantit du JSON valide, pas la
 * forme exacte, et un modèle qui rend `["riz"]` au lieu de `{"aliments":
 * ["riz"]}` a fait le travail utile.
 */
function parseNames(raw: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    return usableNames(parsed);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const candidate = record.aliments ?? record.foods ?? Object.values(record)[0];
  return Array.isArray(candidate) ? usableNames(candidate) : null;
}

/** Vrai pour les pannes qu'une seconde tentative immédiate peut lever. */
function isTransient(error: unknown): boolean {
  if (error instanceof MistralError) {
    return error.statusCode >= 500;
  }
  // Coupure réseau ou délai dépassé : pas de réponse HTTP du tout.
  return true;
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof MistralError && (error.statusCode === 429 || error.statusCode === 402);
}

export async function recognizeFoods(
  imageDataUrl: string,
): Promise<RecognizeResult> {
  let apiKey: string;
  try {
    apiKey = requireEnv('MISTRAL_API_KEY');
  } catch {
    // Clé absente : blocage de configuration, pas une panne du service (B-3).
    return { kind: 'unavailable' };
  }

  const client = new Mistral({ apiKey });

  async function ask(): Promise<unknown> {
    const response = await client.chat.complete({
      model: env.mistralModel,
      temperature: 0,
      maxTokens: MAX_TOKENS,
      responseFormat: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Quels aliments vois-tu ?' },
            { type: 'image_url', imageUrl: imageDataUrl },
          ],
        },
      ],
    });
    return response.choices?.[0]?.message?.content;
  }

  let content: unknown;
  try {
    content = await ask();
  } catch (error) {
    if (isQuotaExceeded(error)) {
      // Distinguer le quota de la panne : l'un se règle sur le compte Mistral,
      // l'autre passe tout seul. Les confondre laissait l'utilisateur réessayer
      // une photo qui ne pouvait pas aboutir.
      console.error('[recognize] quota du modele epuise', error);
      return { kind: 'quota_exceeded' };
    }
    if (!isTransient(error)) {
      console.error('[recognize] appel au modele refuse', error);
      return { kind: 'unavailable' };
    }
    // Une seule seconde tentative : au-delà, l'utilisateur attend trop
    // longtemps devant une photo pour un service qui ne revient pas.
    try {
      content = await ask();
    } catch (retryError) {
      // Aucune erreur brute du SDK n'est propagée au client (AD-4).
      console.error('[recognize] appel au modele en echec', retryError);
      return isQuotaExceeded(retryError)
        ? { kind: 'quota_exceeded' }
        : { kind: 'unavailable' };
    }
  }

  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .map((chunk) =>
              typeof chunk === 'object' && chunk !== null && 'text' in chunk
                ? String((chunk as { text: unknown }).text)
                : '',
            )
            .join('')
        : '';

  const names = parseNames(text);
  return names === null ? { kind: 'bad_format' } : { kind: 'recognized', names };
}
