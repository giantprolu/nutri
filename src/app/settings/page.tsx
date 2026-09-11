import { ScreenHeader } from '@/components/ScreenHeader';
import { LockButton } from './LockButton';
import { APP_VERSION } from '@/lib/version';
import Link from 'next/link';
import { formatStampDate } from '@/lib/date';
import { getCiqualStatus } from '@/server/db/queries/ciqual';

export const dynamic = 'force-dynamic';

/**
 * L'état de la table de référence est indicatif : une base injoignable ne doit
 * pas emporter tout l'écran, dont le reste ne dépend d'aucune donnée (AD-12).
 */
async function readCiqualLine(): Promise<string> {
  try {
    const status = await getCiqualStatus();
    if (status.lastImportedAt === null) {
      return 'jamais';
    }
    return `${status.count} aliments, ${formatStampDate(status.lastImportedAt)}`;
  } catch {
    return 'indisponible';
  }
}

/**
 * Écran de réglages (FR-24).
 * La procédure d'installation est permanente et non rejetable : iOS ne permet
 * aucune invite automatique, et le chemin est assez obscur pour être rappelé.
 */
export default async function SettingsPage() {
  const ciqualLine = await readCiqualLine();

  return (
    <>
      <ScreenHeader title="Réglages" />

      <section className="rounded-box border border-base-300 bg-base-200 p-4">
        <h2 className="text-sm font-medium">Installer sur l&apos;écran d&apos;accueil</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-secondary">
          <li>Ouvre NutriPerso dans Safari.</li>
          <li>Touche le bouton Partager, en bas de l&apos;écran.</li>
          <li>Choisis « Sur l&apos;écran d&apos;accueil ».</li>
          <li>Valide. L&apos;application s&apos;ouvrira sans barre d&apos;adresse.</li>
        </ol>
      </section>

      <Link
        href="/profile"
        className="tap-target mt-4 block rounded-box border border-base-300 bg-base-200 p-4"
      >
        <h2 className="text-sm font-medium">Mon objectif</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Mesures, activité et objectif. Sert à calculer la cible quotidienne.
        </p>
      </Link>

      <section className="mt-4 rounded-box border border-base-300 bg-base-200 p-4">
        <h2 className="text-sm font-medium">Session</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Le verrouillage supprime le cookie et redemande le mot de passe.
        </p>
        <div className="mt-3">
          <LockButton />
        </div>
      </section>

      <dl className="mt-4 rounded-box border border-base-300 bg-base-200 p-4 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-ink-secondary">Version</dt>
          <dd className="tabular">{APP_VERSION}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <dt className="text-ink-secondary">Dernier import CIQUAL</dt>
          <dd className="tabular text-ink-secondary">{ciqualLine}</dd>
        </div>
      </dl>
    </>
  );
}
