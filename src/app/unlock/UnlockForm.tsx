'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Connexion et inscription sur le même écran (FR-1).
 *
 * Un seul formulaire à deux modes plutôt que deux pages : les champs sont les
 * mêmes, et l'inscription étant libre, la bascule doit coûter un geste.
 *
 * Le message d'échec de connexion ne distingue jamais l'adresse inconnue du
 * mot de passe faux (UX-DR-5). L'inscription, elle, doit dire que l'adresse
 * est prise, sans quoi on ne peut pas corriger sa saisie.
 */

/** Aligné sur MIN_PASSWORD_LENGTH côté serveur, qui reste l'autorité. */
const MIN_PASSWORD_LENGTH = 10;

type Mode = 'login' | 'register';

export function UnlockForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(mode === 'login' ? '/api/session' : '/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.replace('/');
        router.refresh();
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      setError(readMessage(body) ?? "L'application n'est pas configurée.");
    } catch {
      setError('Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  const isRegister = mode === 'register';
  const tooShort = isRegister && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="email" className="text-sm text-ink-secondary">
        Adresse
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoFocus
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="tap-target w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 text-base outline-none focus:border-primary"
      />

      <label htmlFor="password" className="text-sm text-ink-secondary">
        Mot de passe
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        required
        minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? 'password-error' : undefined}
        className="tap-target w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 text-base outline-none focus:border-primary"
      />

      {isRegister ? (
        <p className="text-sm text-ink-secondary">
          {tooShort
            ? `Encore ${MIN_PASSWORD_LENGTH - password.length} caractère${
                MIN_PASSWORD_LENGTH - password.length > 1 ? 's' : ''
              }.`
            : `${MIN_PASSWORD_LENGTH} caractères minimum. Aucune récupération n'est possible : notez-le.`}
        </p>
      ) : null}

      {error ? (
        <p id="password-error" role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || email.length === 0 || password.length === 0 || tooShort}
        className="tap-target mt-2 w-full rounded-field bg-primary py-3 font-medium text-primary-content disabled:opacity-40"
      >
        {pending ? 'Vérification…' : isRegister ? 'Créer le compte' : 'Se connecter'}
      </button>

      <button
        type="button"
        onClick={() => switchMode(isRegister ? 'login' : 'register')}
        className="tap-target text-sm text-ink-secondary underline underline-offset-4"
      >
        {isRegister ? "J'ai déjà un compte" : 'Créer un compte'}
      </button>
    </form>
  );
}

/** Le message du serveur quand il y en a un : lui seul sait pourquoi il refuse. */
function readMessage(body: unknown): string | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object' &&
    (body as { error: unknown }).error !== null
  ) {
    const { message } = (body as { error: { message?: unknown } }).error;
    return typeof message === 'string' ? message : null;
  }
  return null;
}
