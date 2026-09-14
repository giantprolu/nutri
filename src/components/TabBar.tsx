'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddSheet } from './AddSheet';
import { HistoryIcon, JournalIcon, PlusIcon, SettingsIcon } from './icons';

/**
 * Barre d'onglets basse, à trois destinations et une action.
 *
 * L'ajout n'est plus un bouton circulaire flottant mais une pilule inscrite
 * dans la barre, entre l'historique et les réglages. Ce n'est pas seulement
 * une autre forme : le bouton rond menait à un écran de choix, la pilule ouvre
 * une feuille par-dessus le journal. Le choix du mode ne coûte plus une
 * navigation, et l'application n'a plus d'ombre portée nulle part.
 */

interface Destination {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const JOURNAL: Destination = {
  href: '/',
  label: 'Journal',
  icon: <JournalIcon className="h-[21px] w-[21px]" />,
};

const HISTORY: Destination = {
  href: '/history',
  label: 'Historique',
  icon: <HistoryIcon className="h-[21px] w-[21px]" />,
};

const SETTINGS: Destination = {
  href: '/settings',
  label: 'Réglages',
  icon: <SettingsIcon className="h-[21px] w-[21px]" />,
};

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function TabLink({ destination, pathname }: { destination: Destination; pathname: string }) {
  return (
    <Link
      href={destination.href}
      aria-current={isActive(pathname, destination.href) ? 'page' : undefined}
      className="tab"
    >
      <span aria-hidden>{destination.icon}</span>
      <span>{destination.label}</span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // La feuille ne survit pas à la navigation qu'elle déclenche : sans cela,
  // elle resterait ouverte par-dessus l'écran de scan.
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // L'écran de déverrouillage n'a pas de navigation : rien n'est accessible.
  // Les chemins d'ajout non plus, qui portent leur propre sortie.
  if (pathname.startsWith('/unlock') || pathname.startsWith('/add')) {
    return null;
  }

  return (
    <>
      {/* Réserve la hauteur de la barre fixe, zone sûre comprise. */}
      <div aria-hidden className="tabbar-spacer" />

      <nav aria-label="Navigation principale" className="tabbar">
        <div className="mx-auto flex h-[62px] max-w-lg items-center gap-2 px-3">
          <TabLink destination={JOURNAL} pathname={pathname} />
          <TabLink destination={HISTORY} pathname={pathname} />

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            className="add-pill"
          >
            <PlusIcon className="h-4 w-4" />
            Ajouter
          </button>

          <TabLink destination={SETTINGS} pathname={pathname} />
        </div>
      </nav>

      <AddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
