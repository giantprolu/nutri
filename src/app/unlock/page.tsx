import type { Metadata } from 'next';
import { UnlockForm } from './UnlockForm';

export const metadata: Metadata = { title: 'NutriPerso' };

/**
 * Écran de déverrouillage (FR-1, UJ-6).
 * Seule surface accessible sans session, avec les ressources statiques.
 */
export default function UnlockPage() {
  return (
    <div className="flex min-h-[88dvh] flex-col justify-center pb-16">
      <p className="kicker">Registre alimentaire</p>
      <h1 className="figure mt-2 text-[46px]">NutriPerso</h1>
      <hr className="rule mt-4 mb-3" />
      <p className="note mb-8">
        Chacun son compte, son journal et sa cible. Connecte-toi, ou crée le tien.
      </p>
      <UnlockForm />
    </div>
  );
}
