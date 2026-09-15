import Link from 'next/link';
import { ChevronLeftIcon, CloseIcon } from './icons';

/**
 * Les deux en-têtes de l'application.
 *
 * `ScreenHeader` coiffe les destinations de la barre d'onglets : un surtitre,
 * un titre au corps d'affichage, un filet.
 *
 * Il accepte une destination secondaire, et une seule. UX-DR-3 écarte du tiers
 * supérieur les contrôles *fréquents*, pas toute cible : ce qu'on touche
 * plusieurs fois par jour appartient à la barre basse, ce qu'on ouvre une fois
 * par semaine n'y a pas sa place et prendrait un onglet à un geste quotidien.
 * L'historique est exactement de ce second genre. La cible garde ses 44 px.
 *
 * `NavHeader` coiffe les écrans qu'on ouvre puis qu'on quitte. Il ne porte que
 * la sortie, à gauche, et le nom de l'écran au centre — jamais de titre au
 * corps d'affichage : le titre d'un tel écran, c'est son contenu.
 */

export function ScreenHeader({
  title,
  kicker,
  action,
}: {
  title: string;
  kicker?: string;
  /** Destination secondaire, posée en regard du titre. Jamais un geste fréquent. */
  action?: { href: string; label: string; icon: React.ReactNode };
}) {
  return (
    <header>
      <div className="flex items-end justify-between gap-3 pt-4 pb-3">
        <div className="min-w-0">
          {kicker ? <p className="kicker first-letter:uppercase">{kicker}</p> : null}
          <h1 className="display">{title}</h1>
        </div>

        {action ? (
          <Link
            href={action.href}
            aria-label={action.label}
            className="tap-target -mr-3 flex flex-none items-center justify-center"
          >
            <span aria-hidden>{action.icon}</span>
          </Link>
        ) : null}
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
