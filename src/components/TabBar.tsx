'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Barre d'onglets basse à quatre destinations (UX-DR-1).
 * Le bouton d'ajout est central, circulaire et déborde vers le haut : c'est le
 * seul élément de l'application qui porte une ombre (DESIGN.md, Élévation).
 */

interface Destination {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function JournalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3v2m0 14v2M4.2 7.5l1.7 1M18.1 15.5l1.7 1M4.2 16.5l1.7-1M18.1 8.5l1.7-1"
        strokeLinecap="round"
      />
    </svg>
  );
}

const LEFT: Destination[] = [
  { href: '/', label: 'Journal', icon: <JournalIcon /> },
];

const RIGHT: Destination[] = [
  { href: '/history', label: 'Historique', icon: <HistoryIcon /> },
  { href: '/settings', label: 'Réglages', icon: <SettingsIcon /> },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function TabLink({ destination, pathname }: { destination: Destination; pathname: string }) {
  const active = isActive(pathname, destination.href);
  return (
    <Link
      href={destination.href}
      aria-current={active ? 'page' : undefined}
      className={`tap-target flex flex-1 flex-col items-center justify-center gap-1 py-2 ${
        active ? 'text-base-content' : 'text-ink-secondary'
      }`}
    >
      <span className="h-6 w-6">{destination.icon}</span>
      <span className="text-[11px] leading-none">{destination.label}</span>
    </Link>
  );
}

export function TabBar() {
  const pathname = usePathname();

  // L'écran de déverrouillage n'a pas de navigation : rien n'est accessible.
  if (pathname.startsWith('/unlock')) {
    return null;
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-base-300 bg-base-200"
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-stretch px-2">
        {LEFT.map((destination) => (
          <TabLink key={destination.href} destination={destination} pathname={pathname} />
        ))}

        <div className="flex w-20 shrink-0 items-start justify-center">
          <Link
            href="/add"
            aria-label="Ajouter un aliment"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-content shadow-lg shadow-black/40"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              className="h-7 w-7"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {RIGHT.map((destination) => (
          <TabLink key={destination.href} destination={destination} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
