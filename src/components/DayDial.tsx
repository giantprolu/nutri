import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { Macros } from '@/lib/types';
import { formatKcal } from '@/lib/nutrition';
import { progressRatio } from '@/lib/journal';
import { MacroBars } from './MacroBars';

/**
 * Totaux du jour (écran Journal) : le consommé, la cible et le reste, une
 * jauge, puis les trois macros.
 *
 * Sans profil, pas de jauge : des chiffres, aucune opinion, comme le voulait
 * la conception d'origine. La cible n'apparaît que si l'utilisateur l'a
 * demandée, et le dépassement est dit par le nombre, jamais par une jauge qui
 * déborderait.
 */

export interface DayTarget {
  targetKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function DayDial({
  macros,
  target,
}: {
  macros: Macros;
  target: DayTarget | null;
}) {
  const remaining = target === null ? null : target.targetKcal - macros.kcal;

  // Sans cible, les barres des macros disent leur part dans l'énergie du jour.
  const ratios =
    target === null
      ? {
          proteinG: progressRatio(macros.proteinG * 4, macros.kcal),
          carbsG: progressRatio(macros.carbsG * 4, macros.kcal),
          fatG: progressRatio(macros.fatG * 9, macros.kcal),
        }
      : {
          proteinG: progressRatio(macros.proteinG, target.proteinG),
          carbsG: progressRatio(macros.carbsG, target.carbsG),
          fatG: progressRatio(macros.fatG, target.fatG),
        };

  return (
    <Card aria-label="Totaux du jour" role="region">
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-muted-foreground">Consommé</p>
            <p className="tabular mt-0.5 text-[33px] leading-[1.05] font-semibold tracking-tight">
              {formatKcal(macros.kcal)}
            </p>
          </div>
          {target !== null && remaining !== null ? (
            <div className="text-right">
              <p className="tabular text-[12.5px] text-muted-foreground">
                Cible {formatKcal(target.targetKcal)}
              </p>
              <p className="tabular mt-0.5 font-medium">
                {formatKcal(Math.abs(remaining))} {remaining >= 0 ? 'restantes' : 'au-dessus'}
              </p>
            </div>
          ) : (
            <p className="text-right text-[12.5px] text-muted-foreground">kcal, sans cible</p>
          )}
        </div>

        {target !== null ? (
          <Progress
            value={progressRatio(macros.kcal, target.targetKcal) * 100}
            aria-label="Part de la cible consommée"
            className="mt-3.5"
          />
        ) : null}

        <Separator className="my-4" />

        <MacroBars macros={macros} ratios={ratios} />
      </CardContent>
    </Card>
  );
}
