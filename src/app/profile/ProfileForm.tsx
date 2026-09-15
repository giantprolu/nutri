'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { formatKcal } from '@/lib/nutrition';

/**
 * Questionnaire corporel (FR-26).
 *
 * La cible passe en tête et non plus en pied : c'est la réponse à la question
 * que l'utilisateur se pose, et elle doit être lisible sans faire défiler.
 * Les mesures qui l'ont produite viennent ensuite, pour la corriger.
 *
 * Les étapes intermédiaires restent affichées. Montrer le métabolisme de base
 * et la dépense avant la cible n'est pas de la décoration : un chiffre unique
 * et sans provenance ne se conteste pas, or ces équations sont des estimations
 * de population qu'il faut corriger à l'usage.
 */

interface Target {
  bmrKcal: number;
  maintenanceKcal: number;
  adjustmentKcal: number;
  targetKcal: number;
  floored: boolean;
  equation: string;
  basis?: string;
  activityCapped?: boolean;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ProfileFormValues {
  sex: 'male' | 'female';
  birthDate: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercent: number | null;
  activity: string;
  goal: 'lose' | 'maintain' | 'gain';
  ratePercentPerWeek: number;
  /** Cible fixée à la main, ou `null` quand le calcul décide. */
  manualTargetKcal: number | null;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sédentaire, travail assis, pas de sport',
  light: 'Léger, une à trois séances par semaine',
  moderate: 'Modéré, trois à cinq séances par semaine',
  active: 'Actif, six à sept séances par semaine',
  veryActive: 'Très actif, métier physique ou deux séances par jour',
};

/** Plafond d'une cible saisie à la main, aligné sur `MANUAL_TARGET_MAX_KCAL`. */
const MANUAL_TARGET_MAX = 6000;

/** Chiffre proposé quand l'utilisateur bascule en manuel sans cible calculée. */
const MANUAL_TARGET_SUGGESTION = 2000;

const GOAL_LABELS: Record<string, string> = {
  lose: 'Perdre du poids',
  maintain: 'Maintenir',
  gain: 'Prendre de la masse',
};

/** Un champ numérique avec son unité, sur le filet du système. */
function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="field mt-1.5 items-baseline">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="tabular w-full min-w-0 border-0 bg-transparent p-0 outline-none"
          {...rest}
        />
        <span aria-hidden className="flex-none text-[14px] opacity-45">
          {unit}
        </span>
      </div>
    </div>
  );
}

/** Une liste déroulante, habillée du même filet que les champs. */
function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="field mt-1.5 relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 appearance-none border-0 bg-transparent p-0 pr-6 text-[16px] outline-none"
        >
          {Object.entries(options).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-0 h-4 w-4 opacity-40" />
      </div>
    </div>
  );
}

function TargetBlock({ target }: { target: Target }) {
  const sign = target.adjustmentKcal > 0 ? '+' : target.adjustmentKcal < 0 ? '−' : '';

  return (
    <>
      <div className="aside-accent">
        <p className="kicker kicker-quiet">Cible quotidienne</p>
        <p className="figure mt-0.5 text-[54px]">
          {formatKcal(target.targetKcal)}{' '}
          <span className="text-[20px] opacity-50">kcal</span>
        </p>
        <p className="tabular note mt-1">
          {target.proteinG} g P · {target.carbsG} g G · {target.fatG} g L
        </p>
      </div>

      {target.floored ? (
        <p role="alert" className="note mt-3" style={{ color: 'var(--color-danger)', opacity: 1 }}>
          Le rythme demandé passerait sous ton métabolisme de base ou sous le minimum
          acceptable. La cible a été relevée. Vise un rythme plus lent, ou bouge davantage.
        </p>
      ) : null}

      {target.activityCapped ? (
        <p role="alert" className="note mt-3" style={{ color: 'var(--color-danger)', opacity: 1 }}>
          La dépense remontée par Santé dépasse ce qu&apos;un corps humain soutient. Elle a été
          ramenée à son plafond, et ton raccourci est probablement à revoir.
        </p>
      ) : null}

      <dl className="mt-4">
        <Line label="Métabolisme de base" value={`${formatKcal(target.bmrKcal)} kcal`} />
        <Line
          label={
            target.basis === 'measured' ? 'Dépense mesurée, 14 j' : "Dépense avec l'activité"
          }
          value={`${formatKcal(target.maintenanceKcal)} kcal`}
        />
        <Line
          label={target.basis === 'manual' ? 'Écart obtenu' : "Écart pour l'objectif"}
          value={`${sign} ${formatKcal(Math.abs(target.adjustmentKcal))} kcal`}
          accent
          last
        />
      </dl>

      <p className="note mt-3">
        {target.basis === 'manual' ? (
          <>
            Cible fixée par toi. Le calcul reste affiché au-dessus pour situer l&apos;écart que
            tu te donnes ; il ne décide plus de rien.
          </>
        ) : (
          <>
            Calcul par{' '}
            {target.equation === 'katch-mcardle'
              ? 'Katch-McArdle, sur ta masse maigre'
              : 'Mifflin-St Jeor'}
            . Une estimation de population, pas une mesure : corrige-la après trois semaines
            selon ton poids réel.
          </>
        )}
      </p>
    </>
  );
}

function Line({
  label,
  value,
  accent = false,
  last = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 py-[11px]"
      style={last ? undefined : { borderBottom: '1px solid var(--color-divider)' }}
    >
      <dt className="text-[15px] opacity-70">{label}</dt>
      <dd
        className="tabular text-[15px]"
        style={accent ? { color: 'var(--color-accent-ink)' } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

export function ProfileForm({
  initial,
  initialTarget,
}: {
  initial: ProfileFormValues | null;
  initialTarget: Target | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(
    initial ?? {
      sex: 'male',
      birthDate: '',
      heightCm: 175,
      weightKg: 70,
      bodyFatPercent: null,
      activity: 'moderate',
      goal: 'maintain',
      ratePercentPerWeek: 0,
      manualTargetKcal: null,
    },
  );
  const [target, setTarget] = useState<Target | null>(initialTarget);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // Le rythme n'a de sens qu'avec un objectif de variation, et son plafond
  // dépend du sens : perdre vite abîme la masse maigre, grossir vite ne fait
  // que du gras.
  const maxRate = values.goal === 'lose' ? 1 : 0.5;
  const rateDisabled = values.goal === 'maintain';

  // Le plancher de la cible manuelle est le minimum clinique du sexe déclaré,
  // repris de `@/lib/energy` : choisir son chiffre n'autorise pas à descendre
  // sous l'apport qui couvre les micronutriments.
  const manualEnabled = values.manualTargetKcal !== null;
  const manualFloor = values.sex === 'male' ? 1500 : 1200;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...values,
          ratePercentPerWeek: rateDisabled ? 0 : values.ratePercentPerWeek,
        }),
      });

      if (!response.ok) {
        setError('Mesures hors des bornes admises.');
        return;
      }

      const body = (await response.json()) as { target: Target };
      setTarget(body.target);
      router.refresh();
    } catch {
      setError('Enregistrement impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {target ? <TargetBlock target={target} /> : null}

      <hr className="rule my-4" />
      <p className="kicker kicker-quiet mb-3 block">Tes mesures</p>

      <form onSubmit={submit}>
        <div className="segmented mb-4" role="group" aria-label="Sexe">
          {(['male', 'female'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => set('sex', value)}
              aria-pressed={values.sex === value}
            >
              {value === 'male' ? 'Homme' : 'Femme'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <NumberField
            id="heightCm"
            label="Taille"
            unit="cm"
            min={120}
            max={250}
            required
            value={String(values.heightCm)}
            onChange={(value) => set('heightCm', Number(value))}
          />
          <NumberField
            id="weightKg"
            label="Poids"
            unit="kg"
            step="0.1"
            min={30}
            max={300}
            required
            value={String(values.weightKg)}
            onChange={(value) => set('weightKg', Number(value))}
          />
        </div>

        <div className="mt-4">
          <label htmlFor="birthDate" className="label">
            Date de naissance
          </label>
          <input
            id="birthDate"
            type="date"
            required
            value={values.birthDate}
            onChange={(event) => set('birthDate', event.target.value)}
            className="tabular field mt-1.5"
          />
        </div>

        <div className="mt-4">
          <NumberField
            id="bodyFat"
            label="Masse grasse, si connue"
            unit="%"
            step="0.1"
            min={3}
            max={70}
            placeholder="Laisser vide"
            value={values.bodyFatPercent === null ? '' : String(values.bodyFatPercent)}
            onChange={(value) =>
              set('bodyFatPercent', value === '' ? null : Number(value))
            }
          />
          <p className="note mt-1.5">
            Renseignée, elle fait passer le calcul sur la masse maigre, plus fidèle si tu es
            très musclé ou très gras.
          </p>
        </div>

        <div className="mt-4">
          <SelectField
            id="activity"
            label="Activité"
            value={values.activity}
            onChange={(value) => set('activity', value)}
            options={ACTIVITY_LABELS}
          />
        </div>

        <div className="mt-4">
          <SelectField
            id="goal"
            label="Objectif"
            value={values.goal}
            onChange={(value) => {
              const goal = value as ProfileFormValues['goal'];
              set('goal', goal);
              // Le rythme précédent peut dépasser le plafond du nouvel objectif.
              const cap = goal === 'lose' ? 1 : 0.5;
              set(
                'ratePercentPerWeek',
                goal === 'maintain' ? 0 : Math.min(values.ratePercentPerWeek || 0.5, cap),
              );
            }}
            options={GOAL_LABELS}
          />
        </div>

        {rateDisabled ? null : (
          <div className="mt-4">
            <NumberField
              id="rate"
              label="Rythme visé, par semaine"
              unit="%"
              step="0.05"
              min={0.05}
              max={maxRate}
              required
              value={String(values.ratePercentPerWeek)}
              onChange={(value) => set('ratePercentPerWeek', Number(value))}
            />
            <p className="note mt-1.5">
              Soit {Math.round(values.weightKg * values.ratePercentPerWeek * 10) / 1000} kg par
              semaine. Plafond de {maxRate} % :{' '}
              {values.goal === 'lose'
                ? 'au-delà, la masse maigre part avec la graisse.'
                : 'au-delà, le surplus se stocke sans servir.'}
            </p>
          </div>
        )}

        <hr className="rule my-5" />

        <div className="flex items-baseline justify-between gap-3">
          <span className="label">Fixer la cible moi-même</span>
          <button
            type="button"
            className="link-accent flex-none text-[15px]"
            aria-pressed={manualEnabled}
            onClick={() =>
              set(
                'manualTargetKcal',
                manualEnabled ? null : (target?.targetKcal ?? MANUAL_TARGET_SUGGESTION),
              )
            }
          >
            {manualEnabled ? 'Rendre la main au calcul' : 'Choisir mon chiffre'}
          </button>
        </div>

        {manualEnabled ? (
          <div className="mt-3">
            <NumberField
              id="manualTarget"
              label="Ma cible quotidienne"
              unit="kcal"
              step="10"
              min={manualFloor}
              max={MANUAL_TARGET_MAX}
              required
              value={String(values.manualTargetKcal ?? '')}
              onChange={(value) =>
                set('manualTargetKcal', value === '' ? null : Math.round(Number(value)))
              }
            />
            <p className="note mt-1.5">
              Entre {manualFloor} et {MANUAL_TARGET_MAX} kcal. Ce chiffre remplace le calcul,
              mesure d&apos;activité comprise. Les macronutriments sont répartis dessus.
            </p>
          </div>
        ) : (
          <p className="note mt-2">
            Trois semaines de pesée en disent plus qu&apos;une équation. Si ton poids ne bouge
            pas comme prévu, corrige la cible ici plutôt que de fausser tes mesures.
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || values.birthDate === ''}
          className="action mt-6"
        >
          {pending ? 'Calcul…' : target ? 'Recalculer ma cible' : 'Calculer ma cible'}
        </button>
      </form>
    </>
  );
}
