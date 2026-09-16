/**
 * Séances : types partagés et mise en forme. Fonctions pures (AD-8).
 *
 * Ce module ne calcule presque rien, et c'est voulu. La musculation ne demande
 * pas d'arithmétique, elle demande de la mémoire : savoir ce qu'on a soulevé
 * la dernière fois, et si on a fait mieux. Le seul chiffre dérivé qu'on
 * s'autorise est le volume, parce qu'il résume une séance en un nombre
 * comparable d'une semaine à l'autre.
 */

/** Ce qu'une série enregistre, selon la nature de l'exercice. */
export type ExerciseKind = 'strength' | 'hold' | 'cardio';

export function isExerciseKind(value: unknown): value is ExerciseKind {
  return value === 'strength' || value === 'hold' || value === 'cardio';
}

/**
 * Le matériel qu'un exercice demande.
 *
 * C'est cette colonne qui décide si un exercice est faisable là où l'on
 * s'entraîne, et non le groupe musculaire. Deux personnes qui veulent des
 * pectoraux n'ont pas le même exercice selon qu'elles ont une barre, une
 * poulie ou seulement une presse assise.
 *
 * `free` couvre barre et haltères ensemble : la distinction existe en salle,
 * mais elle ne change ni la disponibilité ni le choix qu'on fait entre poids
 * libre et machine guidée, qui est la seule question posée.
 */
export type ExerciseEquipment = 'free' | 'machine' | 'cable' | 'bodyweight' | 'cardio';

export function isExerciseEquipment(value: unknown): value is ExerciseEquipment {
  return (
    value === 'free' ||
    value === 'machine' ||
    value === 'cable' ||
    value === 'bodyweight' ||
    value === 'cardio'
  );
}

/**
 * La moitié du corps que l'exercice travaille.
 *
 * Le groupe musculaire ne suffit pas à répondre à « je veux du haut et un
 * minimum de bas » : il faudrait pour cela connaître par cœur de quel côté
 * tombent les mollets et les lombaires. La colonne le dit.
 */
export type ExerciseRegion = 'upper' | 'lower' | 'core' | 'full';

export function isExerciseRegion(value: unknown): value is ExerciseRegion {
  return value === 'upper' || value === 'lower' || value === 'core' || value === 'full';
}

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  kind: ExerciseKind;
  muscleGroup: string | null;
  region: ExerciseRegion;
  equipment: ExerciseEquipment;
  /**
   * Rang de choix dans son groupe musculaire : 1 désigne l'exercice de base.
   *
   * `null` pour un exercice créé à la main depuis un import de séance. C'est
   * ce qui l'exclut de la génération de programme : une ligne saisie au
   * clavier un soir n'a pas à se retrouver prescrite la semaine suivante.
   */
  rank: number | null;
  /** Autres noms sous lesquels on l'écrit, pour retrouver une séance saisie. */
  aliases: readonly string[];
}

/** Ce que l'utilisateur veut travailler, et ce qu'il accepte de ne pas perdre. */
export type TrainingFocus = 'upper' | 'lower' | 'full';

export function isTrainingFocus(value: unknown): value is TrainingFocus {
  return value === 'upper' || value === 'lower' || value === 'full';
}

/** Poids libre, machine guidée, ou indifférent. */
export type EquipmentPreference = 'free' | 'machine' | 'any';

export function isEquipmentPreference(value: unknown): value is EquipmentPreference {
  return value === 'free' || value === 'machine' || value === 'any';
}

/** Une salle, avec le matériel qu'on y trouve. */
export interface Gym {
  id: number;
  slug: string;
  name: string;
  note: string | null;
}

/** Ce que l'utilisateur a répondu sur sa salle et ses envies. */
export interface TrainingPreferences {
  gymId: number | null;
  focus: TrainingFocus;
  equipment: EquipmentPreference;
  sessionsPerWeek: number;
}

export const DEFAULT_PREFERENCES: TrainingPreferences = {
  gymId: null,
  focus: 'full',
  equipment: 'any',
  sessionsPerWeek: 3,
};

export const MIN_SESSIONS_PER_WEEK = 2;
export const MAX_SESSIONS_PER_WEEK = 6;

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  upper: 'Haut du corps, avec un minimum de bas',
  lower: 'Bas du corps, avec un minimum de haut',
  full: 'Les deux à parts égales',
};

/** Le matériel d'un exercice, tel qu'on le nomme en salle. */
export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  free: 'Barre ou haltères',
  machine: 'Machine guidée',
  cable: 'Poulie',
  bodyweight: 'Poids du corps',
  cardio: 'Cardio',
};

export const EQUIPMENT_PREFERENCE_LABELS: Record<EquipmentPreference, string> = {
  free: 'Poids libres',
  machine: 'Machines guidées',
  any: 'Indifférent',
};

/** Un exercice prescrit dans une séance modèle. */
export interface TemplateExercise {
  id: number;
  position: number;
  exercise: Exercise;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSeconds: number | null;
  /** Numéro de superset : deux exercices qui le partagent s'enchaînent. */
  supersetGroup: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  position: number;
  notes: string | null;
  exercises: TemplateExercise[];
}

/** Une série réalisée. Les trois mesures sont optionnelles (voir le schéma). */
export interface WorkoutSet {
  id: number;
  exerciseId: number;
  position: number;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  /**
   * La série est allée jusqu'à l'échec musculaire.
   *
   * On l'écrit parce qu'elle change la lecture de la suivante : « 6 reps » et
   * « 6 reps à l'échec » ne disent pas la même chose de la charge à mettre la
   * semaine prochaine. C'est la notation qu'on porte déjà sur un carnet.
   */
  toFailure: boolean;
  doneAt: Date;
}

export interface WorkoutSession {
  id: number;
  templateId: number | null;
  templateName: string | null;
  sessionDate: string;
  startedAt: Date;
  finishedAt: Date | null;
  sets: WorkoutSet[];
}

/** Bornes de garde-fou, partagées par la saisie et la validation serveur. */
export const MAX_WEIGHT_KG = 500;
export const MAX_REPS = 200;
export const MAX_SECONDS = 7200;
export const MAX_SETS = 20;

export function isValidWeight(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_WEIGHT_KG;
}

export function isValidReps(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_REPS;
}

export function isValidSeconds(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_SECONDS;
}

/**
 * La prescription, écrite comme un programme l'écrit : « 4×8-10 », « 3×45 s ».
 *
 * La fourchette est conservée telle quelle plutôt que réduite à sa borne
 * basse. C'est elle qui porte la consigne de progression : on vise le haut de
 * la fourchette, et quand on l'atteint sur toutes les séries, on monte la
 * charge. L'aplatir à un nombre perdrait ce que le programme veut dire.
 */
export function formatPrescription(exercise: TemplateExercise): string {
  if (exercise.targetSeconds !== null) {
    const duration =
      exercise.targetSeconds >= 60
        ? `${Math.round(exercise.targetSeconds / 60)} min`
        : `${exercise.targetSeconds} s`;
    // Un cardio n'a pas de séries : « 1×20 min » se lirait comme une erreur.
    return exercise.exercise.kind === 'cardio'
      ? duration
      : `${exercise.targetSets}×${duration}`;
  }

  const { targetRepsMin: min, targetRepsMax: max } = exercise;
  if (min === null && max === null) {
    return `${exercise.targetSets} séries`;
  }
  const reps = min === null ? `${max}` : max === null || max === min ? `${min}` : `${min}-${max}`;
  return `${exercise.targetSets}×${reps}`;
}

/** Ce qu'une série réalisée affiche : « 60 kg × 10 », « 45 s », « 12 reps ». */
export function formatSet(set: {
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  toFailure?: boolean;
}): string {
  const failure = set.toFailure === true ? ' (échec)' : '';
  if (set.seconds !== null) {
    const duration =
      set.seconds >= 60 ? `${Math.round(set.seconds / 60)} min` : `${set.seconds} s`;
    return `${duration}${failure}`;
  }
  if (set.reps === null) {
    return '—';
  }
  if (set.weightKg === null || set.weightKg === 0) {
    return `${set.reps} reps${failure}`;
  }
  return `${set.weightKg.toLocaleString('fr-FR')} kg × ${set.reps}${failure}`;
}

/**
 * Le volume d'une série : charge multipliée par répétitions, en kilogrammes.
 *
 * Le tonnage soulevé, mesure grossière mais comparable. Elle ne vaut rien sur
 * une séance isolée — deux exercices différents n'ont pas le même coût par
 * kilo — mais elle répond à la seule question qu'on se pose d'une semaine sur
 * l'autre : est-ce que j'en fais plus qu'avant, sur la même séance ?
 *
 * Une série au poids du corps compte pour zéro. C'est faux physiologiquement
 * et honnête arithmétiquement : on ne connaît pas le poids du corps au moment
 * de la série, et l'inventer fausserait la comparaison plus sûrement que de
 * l'omettre.
 */
export function setVolume(set: { weightKg: number | null; reps: number | null }): number {
  if (set.weightKg === null || set.reps === null) {
    return 0;
  }
  return set.weightKg * set.reps;
}

export function sessionVolume(sets: readonly { weightKg: number | null; reps: number | null }[]): number {
  return Math.round(sets.reduce((total, set) => total + setVolume(set), 0));
}

/**
 * La meilleure série d'une liste, au sens de la charge puis des répétitions.
 *
 * Sert à afficher « 60 × 9 la dernière fois » sous une série à venir. La
 * charge prime sur les répétitions : monter de 60 à 62,5 kg pour une
 * répétition de moins est une progression, l'inverse ne l'est pas.
 */
export function bestSet<T extends { weightKg: number | null; reps: number | null }>(
  sets: readonly T[],
): T | null {
  let best: T | null = null;
  for (const set of sets) {
    if (set.weightKg === null && set.reps === null) {
      continue;
    }
    if (best === null) {
      best = set;
      continue;
    }
    const weight = set.weightKg ?? 0;
    const bestWeight = best.weightKg ?? 0;
    if (weight > bestWeight || (weight === bestWeight && (set.reps ?? 0) > (best.reps ?? 0))) {
      best = set;
    }
  }
  return best;
}

/**
 * Regroupe les exercices d'une séance par superset.
 *
 * Deux exercices qui partagent un numéro s'enchaînent sans repos et se lisent
 * ensemble. Ceux qui n'en portent pas forment chacun leur propre groupe : le
 * résultat est une liste de blocs, qu'ils comptent un exercice ou deux.
 */
export function groupBySuperset(exercises: readonly TemplateExercise[]): TemplateExercise[][] {
  const blocks: TemplateExercise[][] = [];
  const byGroup = new Map<number, TemplateExercise[]>();

  for (const exercise of exercises) {
    if (exercise.supersetGroup === null) {
      blocks.push([exercise]);
      continue;
    }
    const existing = byGroup.get(exercise.supersetGroup);
    if (existing === undefined) {
      const block = [exercise];
      byGroup.set(exercise.supersetGroup, block);
      blocks.push(block);
      continue;
    }
    existing.push(exercise);
  }

  return blocks;
}
