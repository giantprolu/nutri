'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LockIcon } from '@/components/icons';

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
    <button type="button" onClick={lock} disabled={pending} className="action action-danger mt-6">
      <LockIcon className="h-4 w-4" />
      {pending ? 'Verrouillage…' : 'Verrouiller la session'}
    </button>
  );
}
