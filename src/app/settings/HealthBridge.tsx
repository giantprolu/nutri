'use client';

import { useState } from 'react';

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
export function HealthBridge({ hasToken }: { hasToken: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        déclaré.
      </p>

      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-secondary">
        <li>Fabrique un jeton ci-dessous et copie-le.</li>
        <li>Dans Raccourcis, crée un raccourci avec « Obtenir des échantillons de santé ».</li>
        <li>Choisis Énergie active, sur aujourd&apos;hui, et calcule la somme.</li>
        <li>
          Ajoute « Obtenir le contenu de » avec l&apos;adresse ci-dessous, en POST, corps
          JSON <code>activeKcal</code>, et l&apos;en-tête <code>Authorization</code> valant{' '}
          <code>Bearer</code> suivi du jeton.
        </li>
        <li>Programme-le chaque soir dans Automatisation.</li>
      </ol>

      <p className="tabular mt-3 break-all rounded-field bg-base-300 p-3 text-xs">
        POST /api/activity
      </p>

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
