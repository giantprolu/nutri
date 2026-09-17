import { cn } from '@/lib/utils';

/**
 * Barre d'actions basse, qui ne défile pas.
 *
 * Toute cible tactile fréquente vit dans les deux tiers inférieurs (UX-DR-3),
 * et l'action qui clôt un écran est la plus fréquente de toutes. Tant que la
 * barre est montée, la barre d'onglets s'efface : les deux occuperaient le
 * même bord, et l'écran qui porte une action à terminer n'est pas un lieu
 * d'où l'on navigue ailleurs.
 */
export function BottomBar({
  children,
  className,
  surface = 'background',
}: {
  children: React.ReactNode;
  className?: string;
  /** `card` pour une barre qui porte un état, comme le repos d'une séance. */
  surface?: 'background' | 'card';
}) {
  return (
    <>
      {/* Réserve la hauteur de la barre, zone sûre comprise. */}
      <div aria-hidden className="h-28" />
      <div
        data-bottom-bar
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t',
          surface === 'card' ? 'bg-card' : 'bg-background',
        )}
      >
        <div
          className={cn(
            'mx-auto max-w-lg px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]',
            className,
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
