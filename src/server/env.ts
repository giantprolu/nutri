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
  APP_PASSWORD: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  MISTRAL_API_KEY: z.string().min(1).optional(),
  MISTRAL_MODEL: z.string().min(1).default('pixtral-12b-2409'),
  OFF_USER_AGENT: z
    .string()
    .min(1)
    .default('NutriPerso/0.1 (usage personnel; https://github.com/giantprolu/nutri-perso)'),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function read(): Env {
  if (cached) {
    return cached;
  }
  const parsed = schema.safeParse(process.env);
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
  get appPassword(): string | undefined {
    return read().APP_PASSWORD;
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
  get offUserAgent(): string {
    return read().OFF_USER_AGENT;
  },
};

/**
 * Exigée à l'usage, pas au démarrage : le build doit passer sans secret
 * (B-2, B-3 de BLOCKERS.md), la requête qui en a besoin échoue explicitement.
 */
export function requireEnv(name: 'DATABASE_URL' | 'APP_PASSWORD' | 'SESSION_SECRET' | 'MISTRAL_API_KEY'): string {
  const value = read()[name];
  if (!value) {
    throw new Error(`${name} n'est pas configurée.`);
  }
  return value;
}
