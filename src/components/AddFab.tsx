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
        className="fixed right-[max(1.25rem,calc(50vw-16rem+1.25rem))] bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-40 size-14 rounded-full shadow-[0_8px_20px_-4px_rgb(0_0_0/0.35)] [&_svg:not([class*='size-'])]:size-6"
      >
        <PlusIcon />
      </Button>
      <AddSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
