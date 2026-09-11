'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Questionnaire corporel (FR-26).
 *
 * Le résultat s'affiche sur place, avec ses étapes intermédiaires. Montrer le
 * métabolisme de base et la dépense avant la cible n'est pas de la décoration :
 * un chiffre unique et sans provenance ne se conteste pas, or ces équations
 * sont des estimations de population qu'il faut corriger à l'usage.
 */

interface Target {
  bmrKcal: number;
  maintenanceKcal: number;
  adjustmentKcal: number;
  targetKcal: number;
  floored: boolean;
  equation: string;
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
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sédentaire, travail assis, pas de sport',
  light: 'Léger, une à trois séances par semaine',
  moderate: 'Modéré, trois à cinq séances par semaine',
  active: 'Actif, six à sept séances par semaine',
  veryActive: 'Très actif, métier physique ou deux séances par jour',
};

const GOAL_LABELS: Record<string, string> = {
  lose: 'Perdre du poids',
  maintain: 'Maintenir',
  gain: 'Prendre de la masse',
};

const FIELD =
  'tap-target w-full rounded-field border border-base-300 bg-base-200 px-4 py-3 text-base outline-none focus:border-primary';
const LABEL = 'text-sm text-ink-secondary';

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
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className={LABEL}>Sexe</legend>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => set('sex', value)}
                aria-pressed={values.sex === value}
                className={`tap-target flex-1 rounded-field border px-4 py-3 ${
                  values.sex === value
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-300 bg-base-200'
                }`}
              >
                {value === 'male' ? 'Homme' : 'Femme'}
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor="birthDate" className={LABEL}>
          Date de naissance
        </label>
        <input
          id="birthDate"
          type="date"
          required
          value={values.birthDate}
          onChange={(event) => set('birthDate', event.target.value)}
          className={FIELD}
        />

        <label htmlFor="heightCm" className={LABEL}>
          Taille, en centimètres
        </label>
        <input
          id="heightCm"
          type="number"
          inputMode="numeric"
          min={120}
          max={250}
          required
          value={values.heightCm}
          onChange={(event) => set('heightCm', Number(event.target.value))}
          className={FIELD}
        />

        <label htmlFor="weightKg" className={LABEL}>
          Poids, en kilogrammes
        </label>
        <input
          id="weightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={300}
          required
          value={values.weightKg}
          onChange={(event) => set('weightKg', Number(event.target.value))}
          className={FIELD}
        />

        <label htmlFor="bodyFat" className={LABEL}>
          Masse grasse en pourcentage, si connue
        </label>
        <input
          id="bodyFat"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={3}
          max={70}
          placeholder="Laisser vide si inconnue"
          value={values.bodyFatPercent ?? ''}
          onChange={(event) =>
            set('bodyFatPercent', event.target.value === '' ? null : Number(event.target.value))
          }
          className={FIELD}
        />
        <p className="-mt-2 text-xs text-ink-secondary">
          Renseignée, elle fait passer le calcul sur la masse maigre, plus fidèle si tu es
          très musclé ou très gras.
        </p>

        <label htmlFor="activity" className={LABEL}>
          Activité
        </label>
        <select
          id="activity"
          value={values.activity}
          onChange={(event) => set('activity', event.target.value)}
          className={FIELD}
        >
          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label htmlFor="goal" className={LABEL}>
          Objectif
        </label>
        <select
          id="goal"
          value={values.goal}
          onChange={(event) => {
            const goal = event.target.value as ProfileFormValues['goal'];
            set('goal', goal);
            // Le rythme précédent peut dépasser le plafond du nouvel objectif.
            const cap = goal === 'lose' ? 1 : 0.5;
            set('ratePercentPerWeek', goal === 'maintain' ? 0 : Math.min(values.ratePercentPerWeek || 0.5, cap));
          }}
          className={FIELD}
        >
          {Object.entries(GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {rateDisabled ? null : (
          <>
            <label htmlFor="rate" className={LABEL}>
              Rythme visé, en pourcentage du poids par semaine
            </label>
            <input
              id="rate"
              type="number"
              inputMode="decimal"
              step="0.05"
              min={0.05}
              max={maxRate}
              required
              value={values.ratePercentPerWeek}
              onChange={(event) => set('ratePercentPerWeek', Number(event.target.value))}
              className={FIELD}
            />
            <p className="-mt-2 text-xs text-ink-secondary">
              Soit {Math.round(values.weightKg * values.ratePercentPerWeek * 10) / 1000} kg par
              semaine. Plafond de {maxRate} % :{' '}
              {values.goal === 'lose'
                ? 'au-delà, la masse maigre part avec la graisse.'
                : 'au-delà, le surplus se stocke sans servir.'}
            </p>
          </>
        )}

        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || values.birthDate === ''}
          className="tap-target mt-2 w-full rounded-field bg-primary py-3 font-medium text-primary-content disabled:opacity-40"
        >
          {pending ? 'Calcul…' : 'Calculer ma cible'}
        </button>
      </form>

      {target ? <TargetCard target={target} /> : null}
    </>
  );
}

function TargetCard({ target }: { target: Target }) {
  return (
    <section className="mt-6 rounded-box border border-base-300 bg-base-200 p-4">
      <h2 className="text-sm font-medium">Ta cible quotidienne</h2>
      <p className="tabular mt-2 text-4xl font-semibold">{target.targetKcal} kcal</p>

      {target.floored ? (
        <p role="alert" className="mt-2 text-sm text-error">
          Le rythme demandé passerait sous ton métabolisme de base ou sous le minimum
          acceptable. La cible a été relevée. Vise un rythme plus lent, ou bouge davantage.
        </p>
      ) : null}

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <Row label="Métabolisme de base" value={`${target.bmrKcal} kcal`} />
        <Row label="Dépense avec l'activité" value={`${target.maintenanceKcal} kcal`} />
        <Row
          label="Écart pour l'objectif"
          value={`${target.adjustmentKcal > 0 ? '+' : ''}${target.adjustmentKcal} kcal`}
        />
        <Row label="Protéines" value={`${target.proteinG} g`} />
        <Row label="Glucides" value={`${target.carbsG} g`} />
        <Row label="Lipides" value={`${target.fatG} g`} />
      </dl>

      <p className="mt-4 text-xs text-ink-secondary">
        Calcul par{' '}
        {target.equation === 'katch-mcardle'
          ? 'Katch-McArdle, sur ta masse maigre'
          : 'Mifflin-St Jeor'}
        . C&apos;est une estimation de population, pas une mesure. Corrige-la après trois
        semaines selon l&apos;évolution réelle de ton poids.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
