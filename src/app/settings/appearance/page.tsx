import { cookies } from 'next/headers';
import { NavHeader } from '@/components/ScreenHeader';
import { THEME_COOKIE, readAppearance } from '@/lib/theme';
import { AppearanceForm } from './AppearanceForm';

export const dynamic = 'force-dynamic';

/**
 * Apparence claire ou sombre.
 *
 * « Auto » est le défaut et le reste : c'est le seul réglage qui suit la
 * personne d'une application à l'autre, et qui bascule tout seul le soir sur
 * les téléphones réglés ainsi. Les deux autres existent pour ceux dont le
 * système ne dit pas ce qu'ils veulent lire.
 */
export default async function AppearancePage() {
  const store = await cookies();
  const appearance = readAppearance(store.get(THEME_COOKIE)?.value);

  return (
    <>
      <NavHeader label="Réglages" href="/settings" mode="back" />
      <h1 className="display-sm mt-3">Apparence</h1>
      <p className="note mt-2">
        Par défaut, l&apos;application suit le réglage clair ou sombre de ton téléphone.
      </p>
      <hr className="rule mt-4 mb-6" />

      <AppearanceForm initial={appearance} />
    </>
  );
}
