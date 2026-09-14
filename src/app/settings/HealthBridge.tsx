'use client';

import { useState } from 'react';
import { formatRelativeJournalDate } from '@/lib/date';

/**
 * Pont vers Santé d'Apple, par l'app Raccourcis (FR-27).
 *
 * HealthKit n'est ouvert qu'aux applications natives iOS : aucune page web n'y
 * accède, et il n'existe pas d'API web équivalente. Raccourcis est le seul
 * chemin qui ne passe pas par l'App Store, puisqu'il sait à la fois lire un
 * échantillon de santé et appeler une adresse web.
 *
 * Le jeton n'est affiché qu'au moment où il est fabriqué. Il n'est pas secret
 * au même titre qu'un mot de passe, il n'ouvre qu'une route en écriture, mais
 * le réafficher en permanence inviterait à le laisser traîner.
 */
export interface BridgeStatus {
  /** Dernière journée reçue, formatée pour l'affichage. */
  lastDay: string | null;
  lastKcal: number | null;
  /** Journées complètes retenues dans la moyenne, et cette moyenne. */
  dayCount: number;
  averageKcal: number;
  /** Nombre de journées requis avant que la cible bascule. */
  requiredDays: number;
}

const STEPS = [
  'Fabrique un jeton ci-dessous et copie-le.',
  'Dans Raccourcis, ajoute « Rechercher des échantillons de l’app Santé », type Énergie active, sur aujourd’hui.',
  'Ajoute « Calculer les statistiques », opération Somme, sur les valeurs.',
  'Ajoute « Obtenir le contenu de l’URL », et non « de la page web », sur l’adresse ci-dessous. Touche « Afficher plus » pour déplier les réglages : méthode POST, en-tête x-ingest-token valant le jeton, corps JSON avec un champ Nombre activeKcal valant la somme.',
  'Dans Automatisation, déclenche-le chaque soir à 23 h 55.',
];

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-[13px]"
      style={{ borderBottom: '1px solid var(--color-divider)' }}
    >
      <dt className="text-[15px] opacity-70">{label}</dt>
      <dd className="tabular text-[15px]">{value}</dd>
    </div>
  );
}

export function HealthBridge({
  hasToken,
  status,
}: {
  hasToken: boolean;
  status: BridgeStatus;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Lue au rendu client : l'adresse dépend de l'origine d'où la page est
  // ouverte, et c'est celle-là qu'il faut recopier dans le raccourci.
  const endpoint =
    typeof window === 'undefined' ? '/api/activity' : `${window.location.origin}/api/activity`;

  async function generate() {
    setPending(true);
    try {
      const response = await fetch('/api/ingest-token', { method: 'POST' });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { token: string };
      setToken(body.token);
    } finally {
      setPending(false);
    }
  }

  const missing = status.requiredDays - status.dayCount;

  return (
    <>
      <p className="note mt-2">
        Un raccourci iOS envoie ton énergie active du jour. La cible passe alors sur ta dépense
        réelle, moyennée sur quatorze jours, au lieu du niveau d&apos;activité déclaré. Il faut
        au moins trois journées envoyées pour que la bascule se fasse.
      </p>

      <hr className="rule mt-4" />

      <p className="kicker kicker-quiet mt-4 mb-2 block">État</p>
      <dl>
        <Line
          label="Dernière journée reçue"
          value={
            status.lastDay === null
              ? '—'
              : `${formatRelativeJournalDate(status.lastDay)}${
                  status.lastKcal === null ? '' : ` · ${Math.round(status.lastKcal)} kcal`
                }`
          }
        />
        <Line
          label="Moyenne retenue"
          value={
            status.dayCount === 0
              ? '—'
              : `${Math.round(status.averageKcal)} kcal sur ${status.dayCount} j`
          }
        />
      </dl>
      <p className="note mt-2">
        {status.dayCount >= status.requiredDays
          ? 'La cible suit ta dépense mesurée.'
          : `Encore ${missing} journée${missing > 1 ? 's' : ''} avant que la cible bascule sur la mesure.`}
      </p>

      <p className="kicker kicker-quiet mt-6 mb-2 block">Mode d&apos;emploi</p>
      <hr className="rule" />
      <ol>
        {STEPS.map((step, index) => (
          <li key={step} className="mode-row items-baseline">
            <span className="kicker flex-none">{index + 1}</span>
            <span className="flex-1 text-[15px] leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      <p className="label mt-6 block">Adresse à appeler</p>
      <p className="tabular field mt-2 h-auto break-all py-2 text-[13px]">{endpoint}</p>

      {token ? (
        <>
          <p className="label mt-6 block">Ton jeton, à copier maintenant</p>
          <p className="tabular field mt-2 h-auto break-all py-2 text-[13px]">{token}</p>
          <p className="note mt-2">
            Il ne sera plus affiché. En refabriquer un annule celui-ci.
          </p>
        </>
      ) : null}

      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="action action-quiet mt-6"
      >
        {pending
          ? 'Fabrication…'
          : hasToken || token
            ? 'Fabriquer un nouveau jeton'
            : 'Fabriquer un jeton'}
      </button>
    </>
  );
}
