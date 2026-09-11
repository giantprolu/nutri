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
