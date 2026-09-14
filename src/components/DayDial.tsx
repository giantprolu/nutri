import type { Macros } from '@/lib/types';
import { formatGrams, formatKcal } from '@/lib/nutrition';
import { progressRatio } from '@/lib/journal';

/**
 * Totaux du jour (DESIGN.md, écran Journal).
 *
 * La carte bordée a disparu. À sa place, un anneau qui porte le reste à
 * consommer, le total à côté, et trois filets mesurés pour les macros.
 *
 * Sans profil, l'anneau reste vide et muet : des chiffres, aucune opinion,
 * comme le voulait la conception d'origine. La cible n'apparaît que si
 * l'utilisateur l'a explicitement demandée, et le dépassement est dit par le
 * nombre, jamais par une jauge qui déborderait.
 */

/** Rayon et circonférence de l'anneau, en unités du viewBox. */
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface DayTarget {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const MACROS: {
  key: keyof Omit<Macros, 'kcal'>;
  label: string;
  color: string;
}[] = [
  { key: 'proteinG', label: 'Protéines', color: 'var(--color-macro-protein)' },
  { key: 'carbsG', label: 'Glucides', color: 'var(--color-macro-carb)' },
  { key: 'fatG', label: 'Lipides', color: 'var(--color-macro-fat)' },
];

function Ring({ ratio, children }: { ratio: number | null; children: React.ReactNode }) {
  const drawn = ratio === null ? 0 : CIRCUMFERENCE * ratio;

  return (
    <div className="relative h-[118px] w-[118px] flex-none">
      <svg
        viewBox="0 0 120 120"
        width={118}
        height={118}
        aria-hidden
        // La progression part du haut : sans cette rotation, elle commencerait
        // à trois heures, là où l'œil ne cherche pas un début.
        className="block -rotate-90"
      >
        <circle
          cx={60}
          cy={60}
          r={RADIUS}
          fill="none"
          stroke="var(--color-divider)"
          strokeWidth={1.5}
        />
        {ratio === null ? null : (
          <circle
            cx={60}
            cy={60}
            r={RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={3}
            strokeLinecap="butt"
            strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function MacroBar({
  label,
  grams,
  ratio,
  color,
}: {
  label: string;
  grams: number;
  ratio: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="tabular text-[13px]">{formatGrams(grams)} g</span>
      </div>
      <div className="bar">
        <i style={{ background: color, width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function DayDial({
  macros,
  target,
}: {
  macros: Macros;
  target: DayTarget | null;
}) {
  const empty = macros.kcal === 0;

  if (target === null) {
    return (
      <section aria-label="Totaux du jour" className="flex items-center gap-4 pt-6 pb-4">
        <Ring ratio={null}>
          <p className="figure text-[40px] opacity-30">—</p>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className={`figure text-[32px] ${empty ? 'opacity-35' : ''}`}>
            {formatKcal(macros.kcal)}
          </p>
          <p className="note mt-1">
            {empty ? "La journée n'a rien encore." : 'kcal consommées, sans cible définie.'}
          </p>
          {empty ? null : (
            <dl className="mt-3 flex justify-between gap-2">
              {MACROS.map((macro) => (
                <div key={macro.key} className="flex-1">
                  <dt className="label">{macro.label}</dt>
                  <dd className="tabular mt-0.5 text-[15px]">
                    {formatGrams(macros[macro.key])} g
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    );
  }

  const remaining = target.targetKcal - macros.kcal;

  return (
    <section aria-label="Totaux du jour" className="flex items-center gap-4 pt-6 pb-4">
      <Ring ratio={progressRatio(macros.kcal, target.targetKcal)}>
        <p className="figure text-[40px]">{formatKcal(Math.abs(remaining))}</p>
        <p className="kicker kicker-quiet mt-0.5">
          {remaining >= 0 ? 'restantes' : 'au-dessus'}
        </p>
      </Ring>

      <div className="min-w-0 flex-1">
        <p className="figure text-[32px]">{formatKcal(macros.kcal)}</p>
        <p className="note mt-1">
          consommées sur <span className="tabular">{formatKcal(target.targetKcal)}</span> kcal
        </p>

        <hr className="rule my-3" />

        <div className="flex flex-col gap-2">
          {MACROS.map((macro) => (
            <MacroBar
              key={macro.key}
              label={macro.label}
              grams={macros[macro.key]}
              ratio={progressRatio(macros[macro.key], target[macro.key])}
              color={macro.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
