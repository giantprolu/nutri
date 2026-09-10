'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Le champ reçoit le focus à l'ouverture (EXPERIENCE.md, motifs d'état).
 * Le message d'échec est factuel et ne distingue pas les causes (UX-DR-5).
 */
export function UnlockForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.replace('/');
        router.refresh();
        return;
      }

      setError(
        response.status === 401
          ? 'Mot de passe incorrect.'
          : "L'application n'est pas configurée.",
      );
    } catch {
      setError('Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="password" className="text-sm text-ink-secondary">
        Mot de passe
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? 'password-error' : undefined}
        className="tap-target w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 text-base outline-none focus:border-primary"
      />

      {error ? (
        <p id="password-error" role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="tap-target mt-2 w-full rounded-field bg-primary py-3 font-medium text-primary-content disabled:opacity-40"
      >
        {pending ? 'Vérification…' : 'Déverrouiller'}
      </button>
    </form>
  );
}
