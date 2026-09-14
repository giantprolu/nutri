import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isValidBarcode,
  startScanner,
  type CameraControls,
  type ScannerHandle,
} from '@/lib/client/scanner';
import type { ScanOutcome } from '@/lib/types';

/**
 * Viseur du scanner (FR-11, FR-16).
 *
 * Le flux démarre au montage, ce montage étant lui-même la conséquence directe
 * de l'appui sur « Scanner » : c'est le geste utilisateur explicite qu'exige iOS.
 *
 * Le zoom et la torche ne sont affichés que si l'appareil les expose, et n'ont
 * rien de décoratif : sur un code de deux centimètres imprimé sur un opercule,
 * ou dans un placard mal éclairé, ils font la différence entre un décodage en
 * une seconde et un échec que l'utilisateur attribue à l'application.
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

const NO_CONTROLS: CameraControls = { zoom: null, torch: false };

export function ScannerView({ onBarcode }: { onBarcode: (barcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const [status, setStatus] = useState<Status>({ name: 'starting' });
  const [controls, setControls] = useState<CameraControls>(NO_CONTROLS);
  const [zoom, setZoom] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
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
      setControls(handle.controls);
      setZoom(handle.controls.zoom?.min ?? null);
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

  function changeZoom(value: number) {
    setZoom(value);
    void handleRef.current?.setZoom(value);
  }

  function toggleTorch() {
    const next = !torchOn;
    setTorchOn(next);
    void handleRef.current?.setTorch(next);
  }

  return (
    <div>
      {cameraFailed ? (
        <div role="alert" className="pt-2">
          <p className="text-[16px]">
            {status.name === 'permission_denied'
              ? 'Accès à la caméra refusé.'
              : 'Caméra indisponible sur cet appareil.'}
          </p>
          {status.name === 'permission_denied' ? (
            <p className="note mt-2">
              Réactive-le dans Réglages, Safari, Appareil photo, puis recharge la page.
            </p>
          ) : null}
          <Link href="/add/search" className="action mt-4">
            Chercher par nom
          </Link>
        </div>
      ) : (
        <>
          <div
            className="relative mt-2 overflow-hidden rounded"
            style={{ background: 'var(--color-surface)' }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="Viseur du scanner"
              className="aspect-[3/4] w-full max-w-full object-cover"
            />
            {/* Cadre de visée : un filet d'accent, rien d'autre (DESIGN.md). */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-28 -translate-y-1/2"
              style={{
                left: '34px',
                right: '34px',
                border: '1px solid var(--color-accent)',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-px opacity-55"
              style={{ left: '34px', right: '34px', background: 'var(--color-accent)' }}
            />
          </div>

          {controls.zoom !== null || controls.torch ? (
            <div className="mt-4 flex items-center gap-4">
              {controls.zoom !== null ? (
                <div className="flex flex-1 items-center gap-3">
                  <label htmlFor="zoom" className="label">
                    Zoom
                  </label>
                  <input
                    id="zoom"
                    type="range"
                    min={controls.zoom.min}
                    max={controls.zoom.max}
                    step={controls.zoom.step}
                    value={zoom ?? controls.zoom.min}
                    onChange={(event) => changeZoom(Number(event.target.value))}
                    className="h-11 min-w-0 flex-1"
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                </div>
              ) : null}

              {controls.torch ? (
                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-pressed={torchOn}
                  className="chip flex-none"
                >
                  Torche
                </button>
              ) : null}
            </div>
          ) : null}

          <p className="note mt-4 text-center">
            Aligne le code-barres dans le cadre. Le scan est automatique.
          </p>

          {showHint ? (
            <p className="note mt-1 text-center">
              Code illisible ? Approche-toi, ou saisis-le à la main ci-dessous.
            </p>
          ) : null}
        </>
      )}

      <hr className="rule my-4" />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (manualValid) {
            handleRef.current?.stop();
            onBarcode(manual);
          }
        }}
      >
        <label htmlFor="barcode" className="label">
          Ou saisis le code
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
          className="tabular field mt-2 tracking-[0.08em]"
        />
        <button type="submit" disabled={!manualValid} className="action mt-4">
          Chercher ce code
        </button>
      </form>
    </div>
  );
}
