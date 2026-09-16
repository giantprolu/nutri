'use client';

import { useEffect, useState } from 'react';
import {
  INSTALL_HEADLINES,
  INSTALL_STEPS,
  detectPlatform,
  isStandalone,
  type InstallPlatform,
} from '@/lib/install';
import {
  hasNativePrompt,
  promptInstall,
  watchNativePrompt,
  type InstallOutcome,
} from '@/lib/client/install';

/**
 * L'écran d'installation, qui s'adapte à l'endroit où il tourne.
 *
 * Il y a deux mondes, et un seul écran pour les deux. Sur Chromium — Android
 * et bureau — un bouton ouvre la boîte de dialogue native, et l'installation
 * tient en un geste. Sur iOS, il n'existe aucune API : Apple n'émet pas
 * `beforeinstallprompt`, et rien, ni bibliothèque ni astuce, ne permet de
 * poser une icône à la place de l'utilisateur. Le seul service qu'on puisse
 * rendre est de montrer le bon chemin.
 *
 * La détection est faite après le montage et non au rendu serveur. La chaîne
 * d'agent est disponible côté serveur, mais l'état d'installation ne l'est
 * pas : le rendu serait alors mis en cache pour quelqu'un dont l'application
 * est déjà installée, à qui l'on répéterait une marche à suivre inutile.
 *
 * Tant que la détection n'a rien rendu, l'écran n'affiche rien plutôt qu'un
 * repli : montrer les étapes iOS pendant une fraction de seconde à quelqu'un
 * sur Android est pire que d'attendre.
 */

/** Le carré surmonté d'une flèche du menu Partager d'iOS, redessiné. */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

export function InstallGuide() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [installed, setInstalled] = useState(false);
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<InstallOutcome | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
    setInstalled(isStandalone());
    setNative(hasNativePrompt());

    // L'invite peut arriver après l'ouverture de l'écran, et disparaître après
    // une installation réussie : les deux doivent se voir sans recharger.
    return watchNativePrompt(() => {
      setNative(hasNativePrompt());
      setInstalled(isStandalone());
    });
  }, []);

  async function install() {
    setBusy(true);
    setOutcome(null);
    const result = await promptInstall();
    setBusy(false);
    setOutcome(result);
    setNative(hasNativePrompt());
  }

  if (platform === null) {
    return null;
  }

  if (installed) {
    return (
      <div className="py-8 text-center">
        <p className="mx-auto max-w-[26ch] text-[23px] leading-[1.35] font-semibold">
          C’est déjà fait.
        </p>
        <p className="note mx-auto mt-3 max-w-[32ch]">
          Tu lis cette page depuis l’application installée. Son icône est sur ton écran
          d’accueil.
        </p>
      </div>
    );
  }

  const steps = INSTALL_STEPS[platform];
  const isApple = platform === 'ios-safari' || platform === 'ios-other';

  return (
    <>
      {native ? (
        <>
          <p className="note mt-4">
            Ce navigateur sait installer l’application tout seul. Un seul geste suffit.
          </p>
          <button
            type="button"
            onClick={() => void install()}
            disabled={busy}
            className="action mt-4"
          >
            {busy ? 'Installation…' : 'Installer NutriPerso'}
          </button>
          {outcome === 'dismissed' ? (
            <p role="status" className="note mt-3">
              Installation annulée. Tu peux la reprendre par le menu du navigateur, ci-dessous.
            </p>
          ) : null}
          {outcome === 'unavailable' ? (
            <p role="status" className="note mt-3">
              Le navigateur n’a pas ouvert la boîte de dialogue. Passe par le menu, ci-dessous.
            </p>
          ) : null}

          <hr className="rule mt-6" />
          <p className="kicker mt-4 mb-1">Ou à la main</p>
        </>
      ) : (
        <>
          {/*
            La limite est dite franchement plutôt que contournée. Beaucoup de
            sites affichent un bouton « Installer » qui ne fait qu'ouvrir une
            notice : sur iPhone, c'est une promesse qu'aucun navigateur ne
            peut tenir, et mieux vaut l'annoncer que la laisser découvrir.
          */}
          <p className="note mt-4">
            {platform === 'in-app'
              ? 'Cette page s’affiche dans le navigateur intégré d’une autre application, qui ne sait pas installer d’application web.'
              : isApple
                ? 'Sur iPhone et iPad, aucun site ne peut poser son icône tout seul : Apple réserve ce geste à l’utilisateur. Il tient en trois touchers.'
                : 'Ce navigateur n’ouvre pas de boîte de dialogue d’installation. Elle se fait par son menu.'}
          </p>

          <hr className="rule mt-6" />
          <p className="kicker mt-4 mb-1">{INSTALL_HEADLINES[platform]}</p>
        </>
      )}

      <ol>
        {steps.map((step, index) => (
          <li key={step} className="mode-row items-baseline">
            <span className="kicker flex-none">{index + 1}</span>
            <span className="flex-1 text-[16px]">
              {step}
              {/*
                L'icône est rappelée dans la ligne qui la nomme : « le bouton
                Partager » ne désigne rien pour qui ne l'a jamais cherché, et
                c'est exactement l'étape où l'on abandonne.
              */}
              {platform === 'ios-safari' && index === 0 ? (
                <ShareIcon className="ml-1.5 inline-block h-[18px] w-[18px] align-text-bottom" />
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      {platform === 'ios-safari' ? (
        <p className="note mt-4">
          Sur iPhone, le bouton Partager est au bas de l’écran ; sur iPad, en haut à droite de la
          barre d’adresse.
        </p>
      ) : null}
    </>
  );
}
