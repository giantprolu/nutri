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

export interface Exercise {
  id: number;
  slug: string;
  name: string;
  kind: ExerciseKind;
  muscleGroup: string | null;
}

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
}): string {
  if (set.seconds !== null) {
    return set.seconds >= 60
      ? `${Math.round(set.seconds / 60)} min`
      : `${set.seconds} s`;
  }
  if (set.reps === null) {
    return '—';
  }
  if (set.weightKg === null || set.weightKg === 0) {
    return `${set.reps} reps`;
  }
  return `${set.weightKg.toLocaleString('fr-FR')} kg × ${set.reps}`;
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
