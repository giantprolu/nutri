import { env, requireEnv } from './env';

/**
 * Session mono-utilisateur (AD-7).
 *
 * Il n'y a pas d'utilisateur derrière une session, seulement la preuve que le
 * mot de passe a été fourni. La charge utile du cookie ne contient qu'un
 * horodatage d'émission, signé en HMAC-SHA-256.
 *
 * Tout passe par Web Crypto plutôt que node:crypto : le middleware tourne en
 * Edge runtime, où node:crypto n'est pas disponible.
 */

export const SESSION_COOKIE = 'nutriperso_session';

/** 30 jours : un usage quotidien ne doit jamais redemander le mot de passe (FR-3). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new Uint8Array(signature);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/**
 * Comparaison en temps constant (FR-1).
 * La boucle parcourt toujours la longueur maximale : sortir tôt sur la première
 * différence rendrait le temps de réponse dépendant du préfixe correct.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Vérifie le mot de passe applicatif.
 * Les deux valeurs sont passées au HMAC avant comparaison, ce qui ramène des
 * chaînes de longueurs différentes à des empreintes de longueur fixe.
 */
export async function verifyPassword(candidate: string): Promise<boolean> {
  const expected = requireEnv('APP_PASSWORD');
  const secret = requireEnv('SESSION_SECRET');
  const [candidateDigest, expectedDigest] = await Promise.all([
    hmac(secret, candidate),
    hmac(secret, expected),
  ]);
  return timingSafeEqual(toBase64Url(candidateDigest), toBase64Url(expectedDigest));
}

/** Fabrique la valeur du cookie de session. */
export async function issueSessionToken(now: number = Date.now()): Promise<string> {
  const secret = requireEnv('SESSION_SECRET');
  const issuedAt = String(now);
  const signature = await hmac(secret, issuedAt);
  return `${issuedAt}.${toBase64Url(signature)}`;
}

/**
 * Valide un cookie de session : signature intacte et âge sous la limite.
 * Renvoie un booléen plutôt que de lever, la session absente étant un cas
 * nominal et non une erreur (AD-12).
 */
export async function isValidSessionToken(
  token: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const secret = env.sessionSecret;
  if (!secret) {
    return false;
  }

  const separator = token.lastIndexOf('.');
  if (separator <= 0) {
    return false;
  }
  const issuedAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const issuedAtMs = Number(issuedAt);
  if (!Number.isSafeInteger(issuedAtMs) || issuedAtMs > now) {
    return false;
  }
  if ((now - issuedAtMs) / 1000 > SESSION_MAX_AGE_SECONDS) {
    return false;
  }

  const expected = toBase64Url(await hmac(secret, issuedAt));
  return timingSafeEqual(signature, expected);
}

/**
 * Attributs du cookie, identiques à la pose et à la suppression (FR-1).
 *
 * `secure` est laissé tomber en développement. Chrome accepte un cookie
 * `Secure` sur `localhost`, qu'il traite comme une origine de confiance, mais
 * le jette sur toute autre origine en clair. Or l'application s'essaie depuis
 * un téléphone, donc sur l'IP du poste : le cookie était alors refusé en
 * silence, la session n'existait pas, et le déverrouillage renvoyait
 * indéfiniment vers /unlock sans message d'erreur. En production le déploiement
 * est en HTTPS et l'attribut reste posé.
 */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
