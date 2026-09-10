import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import type { ScanOutcome } from '../types';

/**
 * Scanner de code-barres dans le navigateur (FR-11).
 *
 * Le flux caméra ne démarre qu'à l'appel explicite de `startScanner`, jamais au
 * chargement de l'écran : iOS exige un geste utilisateur, et une caméra qui
 * s'allume toute seule est une mauvaise surprise.
 *
 * Les échecs sont modélisés en variantes plutôt que levés (AD-12) : l'interface
 * doit pouvoir proposer le bon repli selon la cause.
 */

/** Seuls formats acceptés (FR-11). Les autres symbologies sont ignorées. */
const ACCEPTED_FORMATS = ['EAN-13', 'EAN-8', 'UPC-A'] as const;

/** Cadence d'analyse. Plus rapide n'améliore pas le décodage et chauffe le téléphone. */
const FRAME_INTERVAL_MS = 250;

/** Le wasm est servi depuis public/, copié par scripts/copy-zxing-wasm.mjs. */
const WASM_PATH = '/zxing/zxing_reader.wasm';

let modulePrepared = false;

function prepareModule(): void {
  if (modulePrepared) {
    return;
  }
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? WASM_PATH : `${prefix}${path}`,
    },
  });
  modulePrepared = true;
}

/** Un code-barres exploitable : 8, 12 ou 13 chiffres (FR-16). */
export function isValidBarcode(value: string): boolean {
  return /^\d{8}$|^\d{12}$|^\d{13}$/.test(value);
}

export interface ScannerHandle {
  /** Arrête le flux et libère les pistes (FR-11). Idempotent. */
  stop: () => void;
}

export interface StartScannerOptions {
  video: HTMLVideoElement;
  onOutcome: (outcome: ScanOutcome) => void;
}

export async function startScanner({
  video,
  onOutcome,
}: StartScannerOptions): Promise<ScannerHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    onOutcome({ kind: 'unsupported' });
    return { stop: () => {} };
  }

  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let analysing = false;

  function stop() {
    if (stopped) {
      return;
    }
    stopped = true;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    // Libérer les pistes éteint le voyant de la caméra : sans cela, iOS la
    // laisse allumée après la navigation.
    for (const track of stream?.getTracks() ?? []) {
      track.stop();
    }
    stream = null;
    video.srcObject = null;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    onOutcome(
      name === 'NotAllowedError' || name === 'SecurityError'
        ? { kind: 'permission_denied' }
        : { kind: 'unsupported' },
    );
    return { stop };
  }

  if (stopped) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return { stop };
  }

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  await video.play().catch(() => undefined);

  prepareModule();

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    stop();
    onOutcome({ kind: 'unsupported' });
    return { stop };
  }

  timer = setInterval(() => {
    if (stopped || analysing) {
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      return;
    }

    analysing = true;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    void readBarcodes(context.getImageData(0, 0, width, height), {
      formats: [...ACCEPTED_FORMATS],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    })
      .then((results) => {
        if (stopped) {
          return;
        }
        const hit = results.find(
          (result) => result.isValid && isValidBarcode(result.text),
        );
        if (hit) {
          // Le flux s'arrête dès le décodage (FR-11).
          stop();
          onOutcome({ kind: 'decoded', barcode: hit.text });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        analysing = false;
      });
  }, FRAME_INTERVAL_MS);

  return { stop };
}
