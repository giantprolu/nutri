import type { Macros } from '@/lib/types';
import { formatGrams, formatKcal } from '@/lib/nutrition';

/**
 * Carte de totaux (DESIGN.md, Composants).
 *
 * Sans profil, la carte reste muette : des chiffres, aucune opinion, comme le
 * voulait la conception d'origine. Avec un profil, elle affiche le reste à
 * consommer, parce que l'utilisateur a explicitement demandé une cible.
 * Le dépassement est indiqué sans jugement : un nombre, pas une alerte.
 */

const MACROS: { key: keyof Omit<Macros, 'kcal'>; label: string; dot: string }[] = [
  { key: 'proteinG', label: 'Protéines', dot: 'bg-macro-protein' },
  { key: 'carbsG', label: 'Glucides', dot: 'bg-macro-carb' },
  { key: 'fatG', label: 'Lipides', dot: 'bg-macro-fat' },
];

export function TotalsCard({
  macros,
  targetKcal,
}: {
  macros: Macros;
  targetKcal?: number;
}) {
  const remaining = targetKcal === undefined ? null : targetKcal - macros.kcal;

  return (
    <section
      aria-label="Totaux du jour"
      className="rounded-box border border-base-300 bg-base-200 p-4"
    >
      <p className="tabular text-3xl font-semibold leading-none">
        {formatKcal(macros.kcal)}
        <span className="ml-1.5 text-base font-normal text-ink-secondary">
          {targetKcal === undefined ? 'kcal' : `/ ${targetKcal} kcal`}
        </span>
      </p>

      {remaining === null ? null : (
        <p className="tabular mt-2 text-sm text-ink-secondary">
          {remaining >= 0
            ? `${formatKcal(remaining)} kcal restantes`
            : `${formatKcal(-remaining)} kcal au-dessus`}
        </p>
      )}

      <dl className="mt-4 flex justify-between gap-2">
        {MACROS.map((macro) => (
          <div key={macro.key} className="flex-1">
            <dt className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${macro.dot}`} aria-hidden />
              {macro.label}
            </dt>
            <dd className="tabular mt-1 text-sm">{formatGrams(macros[macro.key])} g</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
