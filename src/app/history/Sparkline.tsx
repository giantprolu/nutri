import type { DayTotals } from '@/lib/types';
import { formatKcal } from '@/lib/nutrition';

/**
 * Moyenne récente et son tracé (DESIGN.md, écran Historique).
 *
 * Sept traits, du plus ancien au plus récent, le dernier à l'accent plein.
 * Ce sont des sommets et non des colonnes pleines : le système ne remplit
 * jamais une surface, il pose des filets.
 *
 * Les hauteurs sont rapportées au plus fort des sept jours et non à la cible :
 * la cible d'aujourd'hui ne dit rien de celle d'il y a une semaine, et le
 * tracé ne prétend donc rien mesurer d'autre que ses propres jours.
 */

/** Hauteur minimale d'un trait, en part de la boîte : un jour maigre reste visible. */
const MIN_RATIO = 0.18;

export function Sparkline({ days }: { days: readonly DayTotals[] }) {
  // `days` arrive du plus récent au plus ancien : le tracé se lit à l'endroit.
  const recent = [...days].slice(0, 7).reverse();
  if (recent.length === 0) {
    return null;
  }

  const average =
    recent.reduce((total, day) => total + day.macros.kcal, 0) / recent.length;
  const peak = Math.max(...recent.map((day) => day.macros.kcal));

  return (
    <section aria-label="Moyenne récente" className="flex items-baseline gap-4 py-4">
      <div className="flex-none">
        <p className="kicker kicker-quiet">
          Moyenne {recent.length === 1 ? '1 jour' : `${recent.length} jours`}
        </p>
        <p className="figure mt-0.5 text-[27px] leading-tight">{formatKcal(average)} kcal</p>
      </div>

      <div aria-hidden className="flex h-[42px] flex-1 items-end gap-1">
        {recent.map((day, index) => (
          <div
            key={day.entryDate}
            className="flex-1"
            style={{
              height: `${Math.max(MIN_RATIO, peak > 0 ? day.macros.kcal / peak : 0) * 100}%`,
              borderTop: `2px solid ${
                index === recent.length - 1
                  ? 'var(--color-accent)'
                  : 'var(--color-macro-carb)'
              }`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
