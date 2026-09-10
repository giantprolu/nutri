import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';

/**
 * Feuille de choix de mode (EXPERIENCE.md, architecture de l'information).
 * Ordre fixe : Scanner, Rechercher, Photo. C'est celui de la fréquence d'usage
 * réelle, pas celui de l'ordre d'implémentation.
 *
 * Les modes non encore livrés sont visiblement désactivés plutôt qu'absents :
 * un mode qui apparaît en cours de sprint déroute davantage à la relecture.
 */

interface Mode {
  href: string;
  label: string;
  hint: string;
  ready: boolean;
}

const MODES: Mode[] = [
  {
    href: '/add/scan',
    label: 'Scanner',
    hint: 'Code-barres d’un produit industriel',
    ready: true,
  },
  {
    href: '/add/search',
    label: 'Rechercher',
    hint: 'Par nom, dans CIQUAL et les produits scannés',
    ready: true,
  },
  {
    href: '/add/photo',
    label: 'Photo',
    hint: 'Reconnaissance d’aliments sur une assiette',
    ready: true,
  },
  {
    href: '/add/manual',
    label: 'Saisir à la main',
    hint: 'Nom et valeurs pour 100 g',
    ready: true,
  },
];

function ModeRow({ mode }: { mode: Mode }) {
  const content = (
    <>
      <span className="text-base font-medium">{mode.label}</span>
      <span className="mt-0.5 block text-xs text-ink-secondary">{mode.hint}</span>
    </>
  );

  if (!mode.ready) {
    return (
      <li>
        <div
          aria-disabled="true"
          className="flex min-h-16 flex-col justify-center rounded-box border border-base-300 bg-base-200 px-4 py-3 opacity-40"
        >
          {content}
          <span className="mt-1 text-xs text-ink-disabled">Bientôt disponible</span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={mode.href}
        className="flex min-h-16 flex-col justify-center rounded-box border border-base-300 bg-base-200 px-4 py-3"
      >
        {content}
      </Link>
    </li>
  );
}

export default function AddPage() {
  return (
    <>
      <ScreenHeader title="Ajouter" />
      <ul className="flex flex-col gap-3">
        {MODES.map((mode) => (
          <ModeRow key={mode.href} mode={mode} />
        ))}
      </ul>
    </>
  );
}
