import type { Metadata } from 'next';
import { UnlockForm } from './UnlockForm';

export const metadata: Metadata = { title: 'NutriPerso' };

/**
 * Écran de déverrouillage (FR-1, UJ-6).
 * Seule surface accessible sans session, avec les ressources statiques.
 */
export default function UnlockPage() {
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center">
      <h1 className="text-2xl font-semibold tracking-tight">NutriPerso</h1>
      <p className="mt-1 mb-8 text-sm text-ink-secondary">
        Saisis le mot de passe pour déverrouiller.
      </p>
      <UnlockForm />
    </div>
  );
}
