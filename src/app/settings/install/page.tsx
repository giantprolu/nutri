import { NavHeader } from '@/components/ScreenHeader';
import { InstallGuide } from './InstallGuide';

/**
 * Installation sur l'écran d'accueil (FR-24).
 *
 * La page ne porte plus la marche à suivre : celle-ci dépend du navigateur, et
 * un texte unique se trompait deux fois sur trois — il parlait de Safari à
 * quelqu'un sur Android, et de quatre étapes à qui a déjà installé
 * l'application. Tout ce qui varie est descendu dans `InstallGuide`, qui sait
 * où il tourne.
 *
 * Elle reste permanente et non rejetable : il n'existe aucune invite
 * automatique sur iOS, et le chemin est assez obscur pour mériter un écran.
 */
export default function InstallPage() {
  return (
    <>
      <NavHeader label="Réglages" href="/settings" mode="back" />
      <h1 className="display-sm mt-3">Installer sur l&apos;écran d&apos;accueil</h1>
      <p className="note mt-2">
        Une fois installée, l&apos;application s&apos;ouvre en plein écran, sans barre
        d&apos;adresse, et garde sa session plus longtemps.
      </p>

      <InstallGuide />
    </>
  );
}
