'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NavHeader } from '@/components/ScreenHeader';
import { generateProgram, savePreferences } from '@/lib/client/training';
import {
  EQUIPMENT_PREFERENCE_LABELS,
  FOCUS_LABELS,
  MAX_SESSIONS_PER_WEEK,
  MIN_SESSIONS_PER_WEEK,
  type EquipmentPreference,
  type Gym,
  type TrainingFocus,
  type TrainingPreferences,
} from '@/lib/workout';

/**
 * Les réponses qui composent le programme.
 *
 * Trois questions, et une seule action en bas : enregistrer refait le
 * programme dans la foulée. Séparer les deux gestes laisserait des réponses
 * enregistrées sans effet visible, c'est-à-dire l'impression que rien ne s'est
 * passé — et personne ne devinerait qu'il faut un second appui ailleurs.
 *
 * L'orientation ne supprime jamais l'autre moitié du corps. Le texte le dit
 * sous chaque choix, parce que c'est la crainte raisonnable qu'on a en
 * cochant « haut du corps », et qu'elle mérite une réponse avant l'appui.
 */
const FOCUS_HINTS: Record<TrainingFocus, string> = {
  upper: 'Chaque séance garde un exercice de jambes.',
  lower: 'Chaque séance garde un exercice du haut.',
  full: 'Poussée, tirage et jambes en rotation.',
};

const EQUIPMENT_HINTS: Record<EquipmentPreference, string> = {
  free: 'Barre et haltères en premier, machines en secours.',
  machine: 'Machines et poulies en premier, poids libres en secours.',
  any: 'Le meilleur exercice du groupe, quel que soit le matériel.',
};

export function PreferencesForm({
  preferences,
  gyms,
}: {
  preferences: TrainingPreferences;
  gyms: readonly Gym[];
}) {
  const router = useRouter();
  const [gymId, setGymId] = useState<number | null>(preferences.gymId);
  const [focus, setFocus] = useState<TrainingFocus>(preferences.focus);
  const [equipment, setEquipment] = useState<EquipmentPreference>(preferences.equipment);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(preferences.sessionsPerWeek);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);

  const chosenGym = gyms.find((gym) => gym.id === gymId) ?? null;

  async function submit() {
    setBusy(true);
    setError(null);
    setMissing(null);

    const saved = await savePreferences({ gymId, focus, equipment, sessionsPerWeek });
    if (saved.kind === 'error') {
      setBusy(false);
      setError('Les réponses n’ont pas pu être enregistrées.');
      return;
    }

    const generated = await generateProgram();
    setBusy(false);

    if (generated.kind === 'error') {
      setError('Le programme n’a pas pu être composé. Réessaie dans un instant.');
      return;
    }
    if (generated.created === 0) {
      setError('Aucun exercice disponible pour ces réponses. Essaie une autre salle.');
      return;
    }
    if (generated.missingGroups.length > 0) {
      // Le programme est écrit malgré tout : une séance amputée d'un groupe
      // reste une séance, et l'utilisateur doit savoir lequel manque plutôt
      // que de le découvrir sur place.
      setMissing(generated.missingGroups);
    }

    router.push('/training');
    router.refresh();
  }

  return (
    <>
      <NavHeader label="Sport" href="/training" mode="back" />

      <h1 className="display-sm">Mes séances</h1>
      <p className="note mt-1">
        Trois réponses, et le programme se compose. Il se refait à volonté :
        les séances remplacées sont archivées, jamais perdues.
      </p>

      <p className="kicker mt-6 mb-2">Ce que je veux travailler</p>
      <div className="segmented">
        {(['upper', 'lower', 'full'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={focus === value}
            onClick={() => setFocus(value)}
          >
            {value === 'upper' ? 'Haut' : value === 'lower' ? 'Bas' : 'Les deux'}
          </button>
        ))}
      </div>
      <p className="note mt-2">
        {FOCUS_LABELS[focus]}. {FOCUS_HINTS[focus]}
      </p>

      <p className="kicker mt-6 mb-2">Ma salle</p>
      <label htmlFor="gym" className="sr-only">
        Salle de sport
      </label>
      <select
        id="gym"
        className="field w-full"
        value={gymId === null ? '' : String(gymId)}
        onChange={(event) =>
          setGymId(event.target.value === '' ? null : Number(event.target.value))
        }
      >
        <option value="">Je ne précise pas</option>
        {gyms.map((gym) => (
          <option key={gym.id} value={gym.id}>
            {gym.name}
          </option>
        ))}
      </select>
      <p className="note mt-2">
        {chosenGym === null
          ? 'Tout le catalogue reste proposé.'
          : (chosenGym.note ??
            'Les exercices sont limités à ce que cette enseigne propose.')}
      </p>

      <p className="kicker mt-6 mb-2">Poids libre ou machine</p>
      <div className="segmented">
        {(['free', 'machine', 'any'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={equipment === value}
            onClick={() => setEquipment(value)}
          >
            {EQUIPMENT_PREFERENCE_LABELS[value]}
          </button>
        ))}
      </div>
      <p className="note mt-2">{EQUIPMENT_HINTS[equipment]}</p>

      <p className="kicker mt-6 mb-2">Séances par semaine</p>
      <div className="segmented">
        {Array.from(
          { length: MAX_SESSIONS_PER_WEEK - MIN_SESSIONS_PER_WEEK + 1 },
          (_, index) => index + MIN_SESSIONS_PER_WEEK,
        ).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={sessionsPerWeek === value}
            onClick={() => setSessionsPerWeek(value)}
            className="tabular"
          >
            {value}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      {missing !== null ? (
        <p className="note mt-4">
          Aucun exercice disponible pour : {missing.join(', ')}. Ces créneaux ont été
          laissés de côté.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="action mt-6"
      >
        {busy ? 'Composition…' : 'Composer le programme'}
      </button>
    </>
  );
}
