'use client';

import {
  DumbbellIcon,
  NotebookTextIcon,
  SettingsIcon,
  UtensilsIcon,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Barre d'onglets basse, à quatre destinations.
 *
 * L'ajout n'y figure plus : c'est le bouton flottant du journal qui l'ouvre,
 * là où il sert plusieurs fois par jour.
 *
 * L'historique a quitté la barre quand la Cuisine et le Sport y sont entrés.
 * Ce qu'on ouvre tous les jours reste ici, ce qu'on consulte une fois par
 * semaine se rejoint depuis le journal, dont l'en-tête porte ce lien.
 */

interface Destination {
  href: string;
  label: string;
  icon: LucideIcon;
}

const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Journal', icon: NotebookTextIcon },
  { href: '/kitchen', label: 'Cuisine', icon: UtensilsIcon },
  { href: '/training', label: 'Sport', icon: DumbbellIcon },
  { href: '/settings', label: 'Réglages', icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/' || pathname.startsWith('/history');
  }
  return pathname.startsWith(href) || (href === '/settings' && pathname.startsWith('/profile'));
}

export function TabBar() {
  const pathname = usePathname();

  // L'écran de connexion n'a pas de navigation : rien n'est accessible.
  // Les chemins d'ajout non plus, qui portent leur propre sortie.
  if (pathname.startsWith('/unlock') || pathname.startsWith('/add')) {
    return null;
  }

  return (
    // Une barre d'actions basse la remplace tant qu'elle est montée.
    <div className="contents [body:has([data-bottom-bar])_&]:hidden">
      {/* Réserve la hauteur de la barre fixe (57 px), zone sûre et air compris. */}
      <div aria-hidden className="h-[calc(4.5rem+var(--safe-bottom))]" />

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[var(--safe-bottom)] backdrop-blur-xl backdrop-saturate-150"
      >
        <div className="mx-auto flex h-14 max-w-lg items-stretch px-1.5">
          {DESTINATIONS.map((destination) => {
            const active = isActive(pathname, destination.href);
            const Icon = destination.icon;
            return (
              <Link
                key={destination.href}
                href={destination.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-11 flex-1 flex-col items-center justify-center gap-[3px] text-[10.5px] font-medium text-muted-foreground transition-colors',
                  active && 'text-foreground',
                )}
              >
                <Icon aria-hidden className="size-[21px]" strokeWidth={1.75} />
                <span>{destination.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
