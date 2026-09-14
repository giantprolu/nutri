import { useRef, useState } from 'react';

/**
 * Balayage vers la gauche pour révéler la suppression (UX-DR-8).
 * Seul geste non standard de l'application. L'appui long n'est pas capté : il
 * reste à la sélection de texte du système (EXPERIENCE.md, primitives).
 *
 * Un bouton de suppression reste rendu et atteignable au clavier : le geste ne
 * doit pas être le seul chemin vers l'action.
 *
 * Pas de directive `use client` ici : ce composant n'est importé que depuis
 * EntryList, qui la porte déjà. La poser en ferait une frontière serveur/client
 * où le rappel `onDelete` devrait être une Server Action.
 */

const REVEAL_WIDTH = 88;
const TRIGGER_DISTANCE = 40;

export function SwipeToDeleteRow({
  children,
  onDelete,
  label,
}: {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
  label: string;
}) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const startX = useRef<number | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    startX.current = event.clientX;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) {
      return;
    }
    const delta = event.clientX - startX.current;
    const base = revealed ? -REVEAL_WIDTH : 0;
    setOffset(Math.min(0, Math.max(-REVEAL_WIDTH, base + delta)));
  }

  function onPointerUp() {
    if (startX.current === null) {
      return;
    }
    startX.current = null;
    const shouldReveal = offset < -TRIGGER_DISTANCE;
    setRevealed(shouldReveal);
    setOffset(shouldReveal ? -REVEAL_WIDTH : 0);
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={`Supprimer ${label}`}
          tabIndex={revealed ? 0 : -1}
          className="tap-target w-[88px] text-[15px] font-semibold disabled:opacity-60"
          style={{
            background: 'var(--color-danger)',
            color: 'var(--color-bg)',
          }}
        >
          {busy ? '…' : 'Supprimer'}
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-pan-y transition-transform duration-150 ease-out"
        style={{
          transform: `translateX(${offset}px)`,
          // Le fond est opaque : sans lui, le bouton de suppression resterait
          // visible par transparence sous la ligne au repos.
          background: 'var(--color-bg)',
        }}
      >
        {children}
      </div>
    </li>
  );
}
