'use client';

import { useEffect, useState } from 'react';

/**
 * Une valeur à recopier ailleurs, et un bouton qui la copie.
 *
 * Le jeton d'ingestion fait quarante caractères et se termine dans un champ de
 * l'app Raccourcis : le sélectionner au doigt dans un bloc de texte est
 * exactement l'endroit où l'on renonce. Le presse-papiers n'est pas un confort
 * ici, c'est ce qui rend la marche à suivre praticable.
 *
 * L'API du presse-papiers exige un contexte sécurisé et peut être refusée
 * sans prévenir. L'échec est dit, et la valeur reste affichée et sélectionnable
 * à la main : une copie silencieusement ratée ferait coller l'ancien contenu
 * du presse-papiers dans le raccourci, et l'erreur n'apparaîtrait qu'un jour
 * plus tard, sous la forme d'une journée manquante.
 */
export function CopyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // La confirmation s'efface d'elle-même : laissée en place, elle décrirait
  // au bout d'une minute une copie qu'on ne se rappelle plus avoir faite.
  useEffect(() => {
    if (state === 'idle') {
      return;
    }
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between gap-3">
        <p className="label mb-0">{label}</p>
        <button type="button" onClick={() => void copy()} className="kicker link-accent">
          {state === 'copied' ? 'Copié' : 'Copier'}
        </button>
      </div>
      <p className="tabular field mt-2 h-auto break-all py-2 text-[13px]">{value}</p>
      {state === 'failed' ? (
        <p role="alert" className="note mt-2">
          La copie a été refusée par le navigateur. Sélectionne la valeur à la main.
        </p>
      ) : null}
      {hint ? <p className="note mt-2">{hint}</p> : null}
    </>
  );
}
