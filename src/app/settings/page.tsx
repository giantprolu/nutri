import Link from 'next/link';
import { cookies } from 'next/headers';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ChevronRightIcon } from '@/components/icons';
import { LockButton } from './LockButton';
import { currentUserId } from '@/server/guard';
import { hasIngestToken } from '@/server/db/queries/users';
import { bridgeStatus, targetFor } from '@/server/services/profile';
import { APP_VERSION } from '@/lib/version';
import { formatStampDate } from '@/lib/date';
import { formatKcal } from '@/lib/nutrition';
import { getCiqualStatus } from '@/server/db/queries/ciqual';
import { APPEARANCE_LABELS, THEME_COOKIE, readAppearance } from '@/lib/theme';

export const dynamic = 'force-dynamic';

/** Repli quand la base est injoignable : l'écran doit survivre à une panne. */
const EMPTY_STATUS = {
  lastDay: null,
  lastKcal: null,
  dayCount: 0,
  typicalKcal: 0,
  peakKcal: 0,
  requiredDays: 3,
};

/**
 * L'état de la table de référence est indicatif : une base injoignable ne doit
 * pas emporter tout l'écran, dont le reste ne dépend d'aucune donnée (AD-12).
 */
async function readCiqual(): Promise<{ count: string; lastImport: string }> {
  try {
    const status = await getCiqualStatus();
    return {
      count: status.count.toLocaleString('fr-FR'),
      lastImport:
        status.lastImportedAt === null ? 'jamais' : formatStampDate(status.lastImportedAt),
    };
  } catch {
    return { count: '—', lastImport: 'indisponible' };
  }
}

/** Une rangée du sommaire : intitulé, précision, état à droite. */
function Row({
  href,
  label,
  hint,
  value,
  accent = false,
}: {
  href: string;
  label: string;
  hint: string;
  value?: string;
  accent?: boolean;
}) {
  return (
    <li>
      <Link href={href} className="mode-row" style={{ paddingBlock: '17px' }}>
        <span className="flex-1">
          <strong>{label}</strong>
          <small>{hint}</small>
        </span>
        {value ? (
          <span className={`kicker flex-none ${accent ? '' : 'kicker-quiet'}`}>{value}</span>
        ) : null}
        <ChevronRightIcon className="h-4 w-4 flex-none opacity-40" />
      </Link>
    </li>
  );
}

/**
 * Écran de réglages (FR-24).
 *
 * Un sommaire, et non plus un empilement de cartes : chaque sujet a son écran,
 * et cette page ne porte que ce qui tient sur une ligne. La procédure
 * d'installation, longue et permanente, y gagne de ne plus occuper le premier
 * tiers de l'écran à chaque visite.
 */
export default async function SettingsPage() {
  const userId = await currentUserId();
  const store = await cookies();
  const appearance = readAppearance(store.get(THEME_COOKIE)?.value);

  const [ciqual, tokenExists, status, target] = await Promise.all([
    readCiqual(),
    userId === null ? Promise.resolve(false) : hasIngestToken(userId),
    userId === null
      ? Promise.resolve(EMPTY_STATUS)
      : bridgeStatus(userId).catch(() => EMPTY_STATUS),
    userId === null ? Promise.resolve(null) : targetFor(userId).catch(() => null),
  ]);

  const bridgeLabel = !tokenExists
    ? 'Inactif'
    : status.dayCount >= status.requiredDays
      ? 'Actif'
      : 'En attente';

  const bridgeHint = !tokenExists
    ? 'Raccourci iOS · aucun jeton'
    : status.dayCount === 0
      ? 'Raccourci iOS · aucune journée reçue'
      : `Raccourci iOS · ${status.dayCount} ${status.dayCount > 1 ? 'jours reçus' : 'jour reçu'}`;

  return (
    <>
      <ScreenHeader title="Réglages" kicker={`NutriPerso ${APP_VERSION}`} />

      <ul>
        <Row
          href="/profile"
          label="Mon objectif"
          hint="Mesures, activité, cible quotidienne"
          {...(target === null ? {} : { value: formatKcal(target.targetKcal), accent: true })}
        />
        <Row
          href="/settings/health"
          label="Activité depuis Santé"
          hint={bridgeHint}
          value={bridgeLabel}
          accent={bridgeLabel === 'Actif'}
        />
        <Row
          href="/settings/install"
          label="Installer sur l'écran d'accueil"
          hint="Un bouton sur Android, trois gestes sur iPhone"
        />
        <Row
          href="/settings/appearance"
          label="Apparence"
          hint="Clair, sombre, ou le réglage du système"
          value={APPEARANCE_LABELS[appearance]}
        />
      </ul>

      <p className="kicker kicker-quiet mt-6 mb-2 block">Table de référence</p>
      <hr className="rule" />
      <dl>
        <div
          className="flex justify-between py-[13px]"
          style={{ borderBottom: '1px solid var(--color-divider)' }}
        >
          <dt className="text-[15px] opacity-70">Aliments Ciqual</dt>
          <dd className="tabular text-[15px]">{ciqual.count}</dd>
        </div>
        <div className="flex justify-between py-[13px]">
          <dt className="text-[15px] opacity-70">Dernier import</dt>
          <dd className="tabular text-[15px]">{ciqual.lastImport}</dd>
        </div>
      </dl>

      <LockButton />
    </>
  );
}
