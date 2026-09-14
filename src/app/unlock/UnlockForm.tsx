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
  const remaining = MIN_PASSWORD_LENGTH - password.length;

  return (
    <form onSubmit={submit}>
      <label htmlFor="email" className="label">
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
        className="field mt-2 mb-6"
      />

      <label htmlFor="password" className="label">
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
        className="field field-accent mt-2 tracking-[0.3em]"
      />

      {isRegister ? (
        <p className="note mt-2">
          {tooShort
            ? `Encore ${remaining} caractère${remaining > 1 ? 's' : ''}.`
            : `${MIN_PASSWORD_LENGTH} caractères minimum. Aucune récupération n'est possible : note-le.`}
        </p>
      ) : null}

      {error ? (
        <p
          id="password-error"
          role="alert"
          className="mt-2 text-[15px]"
          style={{ color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || email.length === 0 || password.length === 0 || tooShort}
        className="action mt-6"
      >
        {pending ? 'Vérification…' : isRegister ? 'Créer le compte' : 'Se connecter'}
      </button>

      <div className="mt-2 flex min-h-12 items-center justify-center">
        <button
          type="button"
          onClick={() => switchMode(isRegister ? 'login' : 'register')}
          className="link-accent text-[15px]"
        >
          {isRegister ? "J'ai déjà un compte" : 'Créer un compte'}
        </button>
      </div>
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
