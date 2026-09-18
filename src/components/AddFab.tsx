'use client';

import { PlusIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddSheet } from './AddSheet';
import { Button } from '@/components/ui/button';

/**
 * Bouton d'ajout flottant du journal, 56 px, au-dessus de la barre d'onglets.
 *
 * Il ouvre la feuille des chemins d'ajout par-dessus le journal plutôt que de
 * mener à un écran de choix : le choix du mode ne coûte plus une navigation.
 *
 * Il est accroché par le haut, et non par le bas. Au lancement d'une
 * application installée, iOS croit la fenêtre plus courte qu'elle n'est : un
 * `bottom` se mesure depuis ce bas erroné, et le bouton remontait avec la
 * barre d'onglets. Le haut, lui, est juste — le contenu de la page le prouve,
 * il n'a jamais bougé. Les 9 rem retranchées sont les 5,5 rem qui l'écartent
 * de la barre, plus sa propre hauteur, puisque `top` place son bord haut.
 */
export function AddFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // La feuille ne survit pas à la navigation qu'elle déclenche : sans cela,
  // elle resterait ouverte par-dessus l'écran de scan.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ajouter un aliment"
        className="fixed right-[max(1.25rem,calc(50vw-16rem+1.25rem))] top-[calc(var(--viewport-height)_-_9rem_-_var(--safe-bottom))] z-40 size-14 rounded-full shadow-[0_8px_20px_-4px_rgb(0_0_0/0.35)] [&_svg:not([class*='size-'])]:size-6"
      >
        <PlusIcon />
      </Button>
      <AddSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
