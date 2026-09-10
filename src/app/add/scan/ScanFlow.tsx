'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { ScannerView } from './ScannerView';
import { QuantityPad } from '@/components/QuantityPad';
import { buildQuantityShortcuts, type QuantityShortcut } from '@/lib/shortcuts';
import { createEntry, fetchRecentQuantities } from '@/lib/client/entries';
import { resolveBarcode } from '@/lib/client/products';
import type { OffPartialProduct, ReferenceFood } from '@/lib/types';

/**
 * Chemin de scan complet (FR-11 à FR-16).
 *
 * Le parcours vise trois interactions depuis l'ouverture pour un produit en
 * cache : bouton d'ajout, ligne « Scanner », puis raccourci de quantité suivi
 * de la validation (UX-DR-4).
 */

type Step =
  | { name: 'scanning' }
  | { name: 'resolving'; barcode: string }
  | { name: 'quantity'; product: ReferenceFood; shortcuts: QuantityShortcut[] }
  | { name: 'unresolved'; barcode: string; partial: OffPartialProduct | null; message: string };

export function ScanFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'scanning' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBarcode = useCallback(async (barcode: string) => {
    setStep({ name: 'resolving', barcode });
    const result = await resolveBarcode(barcode);

    if (result.kind === 'cached' || result.kind === 'fetched') {
      const recent = await fetchRecentQuantities('product', result.product.ref, result.product.name);
      setStep({
        name: 'quantity',
        product: result.product,
        shortcuts: buildQuantityShortcuts({
          servingSizeG: result.product.servingSizeG,
          recentQuantities: recent,
        }),
      });
      return;
    }

    // Chaque échec porte son propre message : l'interface aiguille sur la
    // variante plutôt que d'afficher une erreur générique (AD-12, UX-DR-6).
    setStep({
      name: 'unresolved',
      barcode,
      partial: result.kind === 'incomplete' ? result.partial : null,
      message:
        result.kind === 'not_found'
          ? 'Produit introuvable. Saisis ses valeurs.'
          : result.kind === 'incomplete'
            ? 'Fiche incomplète. Complète les valeurs manquantes.'
            : 'Service indisponible. Saisis les valeurs.',
    });
  }, []);

  async function save(quantityG: number) {
    if (step.name !== 'quantity') {
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await createEntry({
      foodLabel: step.product.name,
      per100g: step.product.per100g,
      quantityG,
      sourceKind: 'product',
      sourceRef: step.product.ref,
    });

    if (result.kind === 'created') {
      router.replace('/');
      router.refresh();
      return;
    }

    setSubmitting(false);
    setError(
      result.kind === 'unauthorized' ? 'Session expirée.' : 'Enregistrement impossible.',
    );
  }

  if (step.name === 'scanning') {
    return <ScannerView onBarcode={(barcode) => void handleBarcode(barcode)} />;
  }

  if (step.name === 'resolving') {
    return (
      <div className="rounded-box border border-base-300 bg-base-200 p-4">
        <p className="tabular text-sm text-ink-secondary">{step.barcode}</p>
        <p className="mt-1 text-sm">Recherche du produit…</p>
      </div>
    );
  }

  if (step.name === 'unresolved') {
    return (
      <div className="flex flex-col gap-4">
        <div role="alert" className="rounded-box border border-base-300 bg-base-200 p-4">
          <p className="tabular text-sm text-ink-secondary">{step.barcode}</p>
          <p className="mt-1 text-sm">{step.message}</p>
          {step.partial?.name ? (
            <p className="mt-2 text-xs text-ink-secondary">Nom connu : {step.partial.name}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setStep({ name: 'scanning' })}
          className="tap-target w-full rounded-field border border-base-300 py-3 text-sm font-medium"
        >
          Scanner un autre code
        </button>
      </div>
    );
  }

  return (
    <>
      <QuantityPad
        foodLabel={step.product.name}
        per100g={step.product.per100g}
        shortcuts={step.shortcuts}
        submitting={submitting}
        onSubmit={save}
      />
      {error ? (
        <p role="alert" className="mt-4 text-sm text-error">
          {error}
        </p>
      ) : null}
    </>
  );
}
