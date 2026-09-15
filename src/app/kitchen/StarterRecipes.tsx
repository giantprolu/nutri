'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { installStarterRecipes } from '@/lib/client/recipes';

/**
 * Installation des plats de départ, proposée au premier passage.
 *
 * Un planificateur vide demande d'écrire cinq recettes avant de rendre le
 * moindre service, et c'est exactement le moment où l'on referme
 * l'application. Ces cinq plats existent pour que le premier écran soit
 * utilisable ; ils s'éditent et se suppriment comme les autres.
 *
 * Ce qui n'a pas pu être résolu dans CIQUAL est dit, jamais tu : une recette
 * amputée d'un ingrédient donnerait un total trop bas, et c'est le genre
 * d'erreur qu'on ne remarque qu'après trois semaines de journal.
 */
export function StarterRecipes() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function install() {
    setBusy(true);
    setFailed(false);
    const outcome = await installStarterRecipes();

    if (outcome.kind === 'error') {
      setBusy(false);
      setFailed(true);
      return;
    }

    if (outcome.report.skipped.length > 0) {
      setSkipped(outcome.report.skipped);
    }
    router.refresh();
  }

  return (
    <div className="py-8 text-center">
      <p className="mx-auto max-w-[26ch] text-[23px] leading-[1.35] font-semibold">
        Cinq plats simples pour commencer la semaine.
      </p>
      <p className="note mx-auto mt-3 max-w-[32ch]">
        Riz et œufs, poulet et patate douce, lentilles au thon, omelette, pâtes au steak haché.
        Modifiables et supprimables ensuite.
      </p>

      <button
        type="button"
        onClick={() => void install()}
        disabled={busy}
        className="action mx-auto mt-6 max-w-[260px]"
      >
        {busy ? 'Installation…' : 'Installer ces cinq plats'}
      </button>

      {failed ? (
        <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          Installation impossible. Réessaie dans un instant.
        </p>
      ) : null}

      {skipped !== null ? (
        <p className="note mx-auto mt-4 max-w-[34ch]">
          {skipped.length === 1
            ? `Un ingrédient n'a pas été trouvé dans Ciqual et manque à sa recette : ${skipped[0]}.`
            : `Ces ingrédients n'ont pas été trouvés dans Ciqual et manquent à leur recette : ${skipped.join(', ')}.`}
        </p>
      ) : null}
    </div>
  );
}
