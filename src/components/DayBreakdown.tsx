import type { Macros } from '@/lib/types';
import { formatGrams, formatKcal } from '@/lib/nutrition';

/**
 * Totaux d'une journée close (DESIGN.md, écran Détail d'un jour).
 *
 * Distinct de l'anneau du journal, et pas seulement de mise en page : une
 * journée passée n'a pas de reste à consommer. La cible d'aujourd'hui ne dit
 * rien de celle d'il y a trois semaines, et l'appliquer rétroactivement
 * ferait mentir la jauge.
 *
 * Les filets montrent donc la part de chaque macro dans l'énergie du jour,
 * quatre kilocalories par gramme de protéines et de glucides, neuf par gramme
 * de lipides. C'est une lecture close sur elle-même, qui ne dépend d'aucun
 * réglage extérieur et reste vraie indéfiniment.
 */

const KCAL_PER_G = { proteinG: 4, carbsG: 4, fatG: 9 } as const;

const MACROS: {
  key: keyof typeof KCAL_PER_G;
  label: string;
  color: string;
}[] = [
  { key: 'proteinG', label: 'Protéines', color: 'var(--color-macro-protein)' },
  { key: 'carbsG', label: 'Glucides', color: 'var(--color-macro-carb)' },
  { key: 'fatG', label: 'Lipides', color: 'var(--color-macro-fat)' },
];

export function DayBreakdown({ macros }: { macros: Macros }) {
  return (
    <section aria-label="Totaux de la journée">
      <div className="flex items-end justify-between py-4">
        <p className="figure text-[56px] leading-[0.95]">{formatKcal(macros.kcal)}</p>
        <p className="kicker kicker-quiet pb-[7px]">kcal au total</p>
      </div>

      <div className="flex gap-4 pb-4">
        {MACROS.map((macro) => {
          const grams = macros[macro.key];
          // Une journée sans énergie n'a pas de parts : la barre reste vide
          // plutôt que de diviser par zéro.
          const share =
            macros.kcal > 0 ? Math.min(1, (grams * KCAL_PER_G[macro.key]) / macros.kcal) : 0;

          return (
            <div key={macro.key} className="flex-1">
              <p className="label">{macro.label}</p>
              <p className="figure mt-0.5 text-[22px]">{formatGrams(grams)} g</p>
              <div className="bar mt-[5px]">
                <i style={{ background: macro.color, width: `${share * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
