import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidBarcode, startScanner, type ScannerHandle } from '@/lib/client/scanner';
import type { ScanOutcome } from '@/lib/types';

/**
 * Viseur du scanner (FR-11, FR-16).
 *
 * Le flux démarre au montage, ce montage étant lui-même la conséquence directe
 * de l'appui sur « Scanner » : c'est le geste utilisateur explicite qu'exige iOS.
 *
 * L'écran reste utilisable sans caméra. La saisie manuelle du code est toujours
 * accessible, pas seulement en repli après échec (EXPERIENCE.md, accessibilité).
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis ScanFlow,
 * qui la porte déjà.
 */

/** Au-delà, l'application propose explicitement la saisie manuelle (FR-11). */
const HINT_AFTER_MS = 20_000;

type Status =
  | { name: 'starting' }
  | { name: 'scanning' }
  | { name: 'permission_denied' }
  | { name: 'unsupported' };

export function ScannerView({ onBarcode }: { onBarcode: (barcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const [status, setStatus] = useState<Status>({ name: 'starting' });
  const [showHint, setShowHint] = useState(false);
  const [manual, setManual] = useState('');

  const handleOutcome = useCallback(
    (outcome: ScanOutcome) => {
      switch (outcome.kind) {
        case 'decoded':
          onBarcode(outcome.barcode);
          break;
        case 'permission_denied':
          setStatus({ name: 'permission_denied' });
          break;
        case 'unsupported':
          setStatus({ name: 'unsupported' });
          break;
        case 'aborted':
          break;
      }
    },
    [onBarcode],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let cancelled = false;
    void startScanner({ video, onOutcome: handleOutcome }).then((handle) => {
      handleRef.current = handle;
      if (cancelled) {
        handle.stop();
        return;
      }
      setStatus((previous) => (previous.name === 'starting' ? { name: 'scanning' } : previous));
    });

    const hintTimer = setTimeout(() => setShowHint(true), HINT_AFTER_MS);

    // Le flux est coupé à la sortie d'écran, pas seulement au décodage (FR-11).
    return () => {
      cancelled = true;
      clearTimeout(hintTimer);
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [handleOutcome]);

  const cameraFailed = status.name === 'permission_denied' || status.name === 'unsupported';
  const manualValid = isValidBarcode(manual);

  return (
    <div className="flex flex-col gap-4">
      {cameraFailed ? (
        <div role="alert" className="rounded-box border border-base-300 bg-base-200 p-4">
          <p className="text-sm">
            {status.name === 'permission_denied'
              ? 'Accès à la caméra refusé.'
              : 'Caméra indisponible sur cet appareil.'}
          </p>
          {status.name === 'permission_denied' ? (
            <p className="mt-2 text-xs text-ink-secondary">
              Réactive-le dans Réglages, Safari, Appareil photo, puis recharge la page.
            </p>
          ) : null}
          <Link
            href="/add/search"
            className="tap-target mt-3 inline-flex items-center text-sm text-primary"
          >
            Chercher par nom
          </Link>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-box bg-surface-sunken">
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="Viseur du scanner"
            className="aspect-[3/4] w-full max-w-full object-cover"
          />
          {/* Cadre de visée : filet blanc discret, rien d'autre (DESIGN.md). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-field border border-white/40"
          />
        </div>
      )}

      {showHint && !cameraFailed ? (
        <p className="text-sm text-ink-secondary">
          Code illisible ? Saisis-le à la main ci-dessous.
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (manualValid) {
            handleRef.current?.stop();
            onBarcode(manual);
          }
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="barcode" className="text-sm text-ink-secondary">
          Ou saisis le code-barres
        </label>
        <input
          id="barcode"
          name="barcode"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={13}
          value={manual}
          onChange={(event) => setManual(event.target.value.replace(/\D/g, ''))}
          className="tabular tap-target w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!manualValid}
          className="tap-target w-full rounded-field border border-base-300 py-3 text-sm font-medium disabled:opacity-40"
        >
          Chercher ce code
        </button>
      </form>
    </div>
  );
}
