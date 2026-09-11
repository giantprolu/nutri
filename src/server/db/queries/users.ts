import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '../client';

/**
 * Accès aux comptes.
 *
 * L'adresse est toujours ramenée en minuscules avant lecture comme avant
 * écriture, et l'unicité en base porte sur cette forme. Sans cela, deux
 * inscriptions différant d'une majuscule créeraient deux comptes distincts
 * que leur propriétaire croirait être le même.
 */

/** Forme canonique d'une adresse, seule stockée et seule comparée. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface UserAccount {
  id: number;
  email: string;
  passwordHash: string;
  ingestToken: string | null;
}

export async function findUserByEmail(email: string): Promise<UserAccount | null> {
  const [row] = await db()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizeEmail(email)))
    .limit(1);
  return row ?? null;
}

export type CreateUserResult =
  | { kind: 'created'; user: UserAccount }
  | { kind: 'email_taken' };

/**
 * Crée un compte. Le doublon est détecté par la contrainte d'unicité plutôt
 * que par une lecture préalable : entre le test et l'écriture, une seconde
 * inscription pourrait passer. C'est la base qui tranche, pas le code.
 */
export async function createUser(
  email: string,
  passwordHash: string,
): Promise<CreateUserResult> {
  const [row] = await db()
    .insert(schema.users)
    .values({ email: normalizeEmail(email), passwordHash })
    .onConflictDoNothing({ target: schema.users.email })
    .returning();

  return row ? { kind: 'created', user: row } : { kind: 'email_taken' };
}

/**
 * L'utilisateur désigné par un jeton d'ingestion.
 *
 * Le jeton est comparé en base et non en mémoire : une comparaison de chaînes
 * côté application sortirait au premier caractère différent, et l'index
 * unique de Postgres ne dépend pas du contenu comparé.
 */
export async function findUserByIngestToken(token: string): Promise<UserAccount | null> {
  const [row] = await db()
    .select()
    .from(schema.users)
    .where(eq(schema.users.ingestToken, token))
    .limit(1);
  return row ?? null;
}

/**
 * Fabrique un jeton pour l'utilisateur et remplace celui qui existait.
 * Remplacer plutôt que conserver : c'est ce qui rend la révocation possible
 * quand un raccourci a été partagé par erreur.
 */
export async function rotateIngestToken(userId: number): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const token = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

  await db().update(schema.users).set({ ingestToken: token }).where(eq(schema.users.id, userId));
  return token;
}

/** Vrai si un jeton existe déjà, sans le révéler. */
export async function hasIngestToken(userId: number): Promise<boolean> {
  const [row] = await db()
    .select({ token: schema.users.ingestToken })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return row?.token != null;
}
