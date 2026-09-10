'use client';

import { useState } from 'react';
import { ScannerView } from './ScannerView';

/**
 * Chemin de scan. La story 4.1 s'arrête au décodage : la résolution du produit
 * et l'enregistrement arrivent avec la story 4.2.
 */
export function ScanFlow() {
  const [barcode, setBarcode] = useState<string | null>(null);

  if (barcode === null) {
    return <ScannerView onBarcode={setBarcode} />;
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-200 p-4">
      <p className="text-sm text-ink-secondary">Code décodé</p>
      <p className="tabular mt-1 text-lg">{barcode}</p>
      <button
        type="button"
        onClick={() => setBarcode(null)}
        className="tap-target mt-4 w-full rounded-field border border-base-300 py-3 text-sm font-medium"
      >
        Scanner un autre code
      </button>
    </div>
  );
}
