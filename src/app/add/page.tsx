import Link from 'next/link';
import { NavHeader } from '@/components/ScreenHeader';
import {
  BarcodeIcon,
  CameraIcon,
  ChevronRightIcon,
  PencilIcon,
  SearchIcon,
} from '@/components/icons';

/**
 * Choix du mode d'ajout, en pleine page.
 *
 * Le chemin ordinaire est la feuille qui s'ouvre depuis la barre d'onglets ;
 * cet écran reste la même liste pour les entrées qui ne passent pas par elle :
 * le bouton du journal vide, un signet, un retour arrière depuis un mode.
 */

interface Mode {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

const MODES: Mode[] = [
  {
    href: '/add/scan',
    label: 'Scanner',
    hint: 'Code-barres d’un produit industriel',
    icon: <BarcodeIcon className="h-5 w-5" />,
  },
  {
    href: '/add/search',
    label: 'Rechercher',
    hint: 'Dans CIQUAL et les produits scannés',
    icon: <SearchIcon className="h-5 w-5" />,
  },
  {
    href: '/add/photo',
    label: 'Photo',
    hint: 'Reconnaissance d’aliments sur une assiette',
    icon: <CameraIcon className="h-5 w-5" />,
  },
  {
    href: '/add/manual',
    label: 'Saisir à la main',
    hint: 'Nom et valeurs pour 100 g',
    icon: <PencilIcon className="h-5 w-5" />,
  },
];

export default function AddPage() {
  return (
    <>
      <NavHeader label="Ajouter une entrée" href="/" />
      <h1 className="display-sm mt-3">Par quel chemin ?</h1>
      <hr className="rule mt-4" />

      <ul>
        {MODES.map((mode) => (
          <li key={mode.href}>
            <Link href={mode.href} className="mode-row">
              <span aria-hidden style={{ color: 'var(--color-accent)' }}>
                {mode.icon}
              </span>
              <span className="flex-1">
                <strong>{mode.label}</strong>
                <small>{mode.hint}</small>
              </span>
              <ChevronRightIcon className="h-4 w-4 opacity-40" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
