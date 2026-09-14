import { NavHeader } from '@/components/ScreenHeader';

/**
 * Procédure d'installation sur l'écran d'accueil (FR-24).
 *
 * Permanente et non rejetable : iOS ne permet aucune invite automatique, et le
 * chemin est assez obscur pour mériter d'être rappelé. Elle a désormais son
 * écran plutôt que le haut des réglages, où elle se relisait chaque fois.
 */
const STEPS = [
  'Ouvre NutriPerso dans Safari.',
  'Touche le bouton Partager, en bas de l’écran.',
  'Choisis « Sur l’écran d’accueil ».',
  'Valide. L’application s’ouvrira sans barre d’adresse.',
];

export default function InstallPage() {
  return (
    <>
      <NavHeader label="Réglages" href="/settings" mode="back" />
      <h1 className="display-sm mt-3">Installer sur l&apos;écran d&apos;accueil</h1>
      <p className="note mt-2">
        Une fois installée, l&apos;application s&apos;ouvre en plein écran et garde sa session
        plus longtemps.
      </p>
      <hr className="rule mt-4" />

      <ol>
        {STEPS.map((step, index) => (
          <li key={step} className="mode-row items-baseline">
            <span className="kicker flex-none">{index + 1}</span>
            <span className="flex-1 text-[16px]">{step}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
