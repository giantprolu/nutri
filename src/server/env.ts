import 'server-only';
import { z } from 'zod';

/**
 * Unique lecture de process.env de l'application (spine, conventions).
 * Validée au premier accès : une variable manquante casse tôt et clairement,
 * plutôt que de produire une erreur obscure au fond d'une requête.
 *
 * Aucune de ces valeurs ne porte le préfixe NEXT_PUBLIC_ : rien de ce fichier
 * ne doit atteindre le navigateur (AD-4, NFR-2).
 */

const schema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  MISTRAL_API_KEY: z.string().min(1).optional(),
  // Fournisseur du modele de vision. Mistral par defaut, pour ne rien changer
  // aux installations existantes ; « gemini » bascule sur l'API Google.
  VISION_PROVIDER: z.enum(['mistral', 'gemini']).default('mistral'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  // gemini-2.5-flash repond 404 aux comptes crees recemment, Google renvoyant
  // explicitement vers gemini-3.6-flash (verifie le 14/09/2026). Les modeles
  // les plus recents, eux, repondent souvent 503 sur le palier gratuit.
  GEMINI_MODEL: z.string().min(1).default('gemini-3.6-flash'),
  // pixtral-12b-2409 a disparu du catalogue Mistral, vérifié le 11/09/2026
  // sur /v1/models. mistral-small-latest reste le modèle de vision le moins
  // cher, mais il nomme grossièrement une assiette composée : le défaut est
  // mistral-medium-latest, dont la lecture d'image est nettement meilleure et
  // dont le coût reste négligeable à quelques photos par jour. Repasser au
  // petit modèle ne demande que cette variable.
  MISTRAL_MODEL: z.string().min(1).default('mistral-medium-latest'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OFF_USER_AGENT: z
    .string()
    .min(1)
    .default('NutriPerso/0.1 (usage personnel; https://github.com/giantprolu/nutri-perso)'),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/**
 * Une variable déclarée sans valeur arrive comme chaîne vide, pas comme
 * absente. C'est le cas courant sur Vercel, où la case existe dès que le nom
 * est saisi. Sans ce nettoyage, `.default()` ne s'applique jamais et une seule
 * case laissée vide fait échouer toute la configuration, donc la connexion.
 */
function withoutEmpty(source: Record<string, string | undefined>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function read(): Env {
  if (cached) {
    return cached;
  }
  const parsed = schema.safeParse(withoutEmpty(process.env));
  if (!parsed.success) {
    throw new Error(
      `Configuration invalide : ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')} ${issue.message}`)
        .join(', ')}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export const env = {
  get databaseUrl(): string | undefined {
    return read().DATABASE_URL;
  },
  get sessionSecret(): string | undefined {
    return read().SESSION_SECRET;
  },
  get mistralApiKey(): string | undefined {
    return read().MISTRAL_API_KEY;
  },
  get mistralModel(): string {
    return read().MISTRAL_MODEL;
  },
  get visionProvider(): 'mistral' | 'gemini' {
    return read().VISION_PROVIDER;
  },
  get geminiApiKey(): string | undefined {
    return read().GEMINI_API_KEY;
  },
  get geminiModel(): string {
    return read().GEMINI_MODEL;
  },
  get offUserAgent(): string {
    return read().OFF_USER_AGENT;
  },
  /** Vrai sur Vercel, faux sous `next dev`. Sert aux attributs du cookie. */
  get isProduction(): boolean {
    return read().NODE_ENV === 'production';
  },
};

/**
 * Exigée à l'usage, pas au démarrage : le build doit passer sans secret
 * (B-2, B-3 de BLOCKERS.md), la requête qui en a besoin échoue explicitement.
 */
export function requireEnv(
  name: 'DATABASE_URL' | 'SESSION_SECRET' | 'MISTRAL_API_KEY' | 'GEMINI_API_KEY',
): string {
  const value = read()[name];
  if (!value) {
    throw new Error(`${name} n'est pas configurée.`);
  }
  return value;
}
