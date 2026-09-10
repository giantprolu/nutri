'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Verrouillage de session : supprime le cookie et renvoie au déverrouillage (FR-3). */
export function LockButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function lock() {
    setPending(true);
    try {
      await fetch('/api/session', { method: 'DELETE' });
      router.replace('/unlock');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={lock}
      disabled={pending}
      className="tap-target w-full rounded-field border border-base-300 py-3 text-sm font-medium text-error disabled:opacity-40"
    >
      {pending ? 'Verrouillage…' : 'Verrouiller'}
    </button>
  );
}
