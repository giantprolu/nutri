import Link from 'next/link';
import { ChevronLeftIcon, CloseIcon } from './icons';

/**
 * Les deux en-têtes de l'application.
 *
 * `ScreenHeader` coiffe les trois destinations de la barre d'onglets : un
 * surtitre, un titre au corps d'affichage, un filet. Rien n'y est cliquable,
 * le tiers supérieur de l'écran ne portant aucune cible tactile (UX-DR-3).
 *
 * `NavHeader` coiffe les écrans qu'on ouvre puis qu'on quitte. Il ne porte que
 * la sortie, à gauche, et le nom de l'écran au centre — jamais de titre au
 * corps d'affichage : le titre d'un tel écran, c'est son contenu.
 */

export function ScreenHeader({
  title,
  kicker,
}: {
  title: string;
  kicker?: string;
}) {
  return (
    <header>
      <div className="pt-4 pb-3">
        {kicker ? <p className="kicker first-letter:uppercase">{kicker}</p> : null}
        <h1 className="display">{title}</h1>
      </div>
      <hr className="rule" />
    </header>
  );
}

/**
 * La sortie est une croix quand l'écran est un cul-de-sac que l'on referme, et
 * une flèche quand il s'inscrit dans un parcours dont on peut remonter d'un
 * cran. Les deux mènent au même endroit ; c'est la promesse qui diffère.
 */
export function NavHeader({
  label,
  href,
  onDismiss,
  mode = 'close',
}: {
  /** Nom de l'écran, ou de celui d'où l'on vient. */
  label: string;
  /** Destination de la sortie. Ignorée quand `onDismiss` est fourni. */
  href?: string;
  /** Sortie confiée à l'appelant, pour un retour à l'étape précédente. */
  onDismiss?: () => void;
  mode?: 'close' | 'back';
}) {
  const icon =
    mode === 'back' ? <ChevronLeftIcon className="h-5 w-5" /> : <CloseIcon className="h-5 w-5" />;
  const accessibleLabel = mode === 'back' ? 'Revenir en arrière' : 'Fermer';

  return (
    <header className="flex items-center justify-between py-3">
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={accessibleLabel}
          className="tap-target -ml-3 flex items-center justify-center"
        >
          {icon}
        </button>
      ) : (
        <Link
          href={href ?? '/'}
          aria-label={accessibleLabel}
          className="tap-target -ml-3 flex items-center justify-center"
        >
          {icon}
        </Link>
      )}

      <p className="kicker kicker-quiet">{label}</p>

      {/* Contrepoids de la sortie : le nom de l'écran reste centré. */}
      <span aria-hidden className="w-11" />
    </header>
  );
}
