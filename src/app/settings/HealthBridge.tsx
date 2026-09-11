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
  const endpoint = typeof window === 'undefined' ? '/api/activity' : `${window.location.origin}/api/activity`;

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

  return (
    <section className="mt-4 rounded-box border border-base-300 bg-base-200 p-4">
      <h2 className="text-sm font-medium">Activité depuis Santé</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Un raccourci iOS envoie ton énergie active du jour. La cible passe alors sur ta
        dépense réelle, moyennée sur quatorze jours, au lieu du niveau d&apos;activité
        déclaré. Il faut au moins trois journées envoyées pour que la bascule se fasse.
      </p>

      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-secondary">
        <li>Fabrique un jeton ci-dessous et copie-le.</li>
        <li>
          Dans Raccourcis, ajoute « Rechercher des échantillons de l&apos;app Santé »,
          type Énergie active, sur aujourd&apos;hui.
        </li>
        <li>Ajoute « Calculer les statistiques », opération Somme, sur les valeurs.</li>
        <li>
          Ajoute « Obtenir le contenu de l&apos;URL », et non « de la page web », sur
          l&apos;adresse ci-dessous. Touche « Afficher plus » pour déplier les réglages :
          méthode POST, en-tête <code>x-ingest-token</code> valant le jeton, corps JSON
          avec un champ Nombre <code>activeKcal</code> valant la somme.
        </li>
        <li>Dans Automatisation, déclenche-le chaque soir à 23 h 55.</li>
      </ol>

      <p className="tabular mt-3 break-all rounded-field bg-base-300 p-3 text-xs">{endpoint}</p>

      <div className="mt-4 border-t border-base-300 pt-3">
        <h3 className="text-sm font-medium">État</h3>
        {status.lastDay === null ? (
          <p className="mt-1 text-sm text-ink-secondary">
            Aucune journée reçue pour l&apos;instant.
          </p>
        ) : (
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-ink-secondary">Dernière journée reçue</dt>
              <dd className="tabular">
                {formatRelativeJournalDate(status.lastDay)}
                {status.lastKcal === null ? '' : ` · ${Math.round(status.lastKcal)} kcal`}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-ink-secondary">Moyenne retenue</dt>
              <dd className="tabular">
                {status.dayCount === 0
                  ? '—'
                  : `${Math.round(status.averageKcal)} kcal sur ${status.dayCount} j`}
              </dd>
            </div>
          </dl>
        )}

        <p className="mt-2 text-xs text-ink-secondary">
          {status.dayCount >= status.requiredDays
            ? 'La cible suit ta dépense mesurée.'
            : `Encore ${status.requiredDays - status.dayCount} journée${
                status.requiredDays - status.dayCount > 1 ? 's' : ''
              } avant que la cible bascule sur la mesure.`}
        </p>
      </div>

      {token ? (
        <>
          <p className="mt-3 text-sm">Ton jeton, à copier maintenant :</p>
          <p className="tabular mt-1 break-all rounded-field bg-base-300 p-3 text-xs">{token}</p>
          <p className="mt-2 text-xs text-ink-secondary">
            Il ne sera plus affiché. En refabriquer un annule celui-ci.
          </p>
        </>
      ) : null}

      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="tap-target mt-3 w-full rounded-field border border-base-300 py-3 text-sm disabled:opacity-40"
      >
        {pending
          ? 'Fabrication…'
          : hasToken || token
            ? 'Fabriquer un nouveau jeton'
            : 'Fabriquer un jeton'}
      </button>
    </section>
  );
}
