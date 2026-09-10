import 'server-only';
import { Mistral } from '@mistralai/mistralai';
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

const SYSTEM_PROMPT = [
  "Tu identifies les aliments visibles sur une photo de repas.",
  'Réponds UNIQUEMENT par un tableau JSON de chaînes, en français.',
  'Exemple de réponse valide : ["riz blanc cuit", "blanc de poulet", "haricots verts"]',
  "N'estime jamais de quantité, de poids, de calories ni de valeur nutritionnelle.",
  "N'ajoute aucun texte avant ou après le tableau.",
  'Si aucun aliment n\'est identifiable, réponds [].',
].join(' ');

const MAX_NAMES = 12;

export type RecognizeResult =
  | { kind: 'recognized'; names: string[] }
  | { kind: 'unavailable' }
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

function parseNames(raw: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const names = parsed
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 100);

  // Un tableau d'objets ou de nombres n'est pas la réponse attendue.
  if (names.length !== parsed.length) {
    return null;
  }

  return names.slice(0, MAX_NAMES);
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

  let content: unknown;
  try {
    const response = await client.chat.complete({
      model: env.mistralModel,
      temperature: 0,
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
    content = response.choices?.[0]?.message?.content;
  } catch (error) {
    // Aucune erreur brute du SDK n'est propagée au client (AD-4).
    console.error('[recognize] appel au modele en echec', error);
    return { kind: 'unavailable' };
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
