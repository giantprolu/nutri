import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  BarcodeIcon,
  CameraIcon,
  ChevronRightIcon,
  CloseIcon,
  PencilIcon,
  SearchIcon,
} from './icons';

/**
 * Feuille de choix du mode d'ajout.
 *
 * Elle remplace l'écran /add : le choix du chemin ne coûte plus une navigation,
 * il s'ouvre par-dessus le journal, qui reste visible derrière. L'ordre est
 * celui de la fréquence d'usage réelle, pas celui de l'implémentation.
 *
 * Rendue dans un `<dialog>` natif, et non dans un `<div role="dialog">` :
 * le navigateur fournit alors la couche supérieure, le piège à focus et la
 * fermeture par la touche d'échappement, trois choses qu'une réimplémentation
 * rate presque toujours.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis TabBar,
 * qui la porte déjà. La poser en ferait une frontière serveur/client où le
 * rappel `onClose` devrait être une Server Action.
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

export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      // La touche d'échappement ferme le dialogue sans passer par notre état :
      // sans cet écouteur, l'ouverture suivante serait refusée.
      onClose={onClose}
      onClick={(event) => {
        // Le dialogue occupe toute la fenêtre ; seul un clic sur le fond, et
        // non sur la feuille elle-même, atteint cette cible.
        if (event.target === ref.current) {
          onClose();
        }
      }}
      aria-label="Ajouter une entrée"
      className="sheet"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="kicker">Ajouter une entrée</p>
          <h2 className="display-sm mt-1">Par quel chemin ?</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="tap-target -mr-2 flex items-center justify-center opacity-55"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <hr className="rule mt-3" />

      <ul>
        {MODES.map((mode, index) => (
          <li key={mode.href}>
            <Link
              href={mode.href}
              onClick={onClose}
              className="mode-row"
              // Le dernier chemin ne porte pas de filet : c'est le bord de la
              // feuille qui ferme la liste.
              style={index === MODES.length - 1 ? { borderBottom: 0 } : undefined}
            >
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
    </dialog>
  );
}
