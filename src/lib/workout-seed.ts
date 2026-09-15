/**
 * Le catalogue d'exercices livré, et le programme de départ.
 *
 * Trois séances en rotation sur la semaine, orientées haut du corps, avec ce
 * qu'il faut de jambes pour ne pas les perdre. C'est un point de départ
 * éditable, pas une prescription : les séances s'ouvrent, se modifient et se
 * suppriment comme n'importe quelle donnée de l'application.
 *
 * Les exercices sont désignés par leur `slug` et non par un identifiant : le
 * catalogue est commun et peut déjà contenir la ligne, auquel cas le seed ne
 * la réécrit pas. C'est ce qui rend l'installation idempotente.
 */

import type { ExerciseKind } from './workout';

export interface SeedExercise {
  slug: string;
  name: string;
  kind: ExerciseKind;
  muscleGroup: string | null;
}

/** Les exercices du programme, plus ceux qu'on y substitue couramment. */
export const SEED_EXERCISES: readonly SeedExercise[] = [
  { slug: 'developpe-couche', name: 'Développé couché', kind: 'strength', muscleGroup: 'Pectoraux' },
  { slug: 'developpe-incline', name: 'Développé incliné', kind: 'strength', muscleGroup: 'Pectoraux' },
  { slug: 'ecarte-couche', name: 'Écarté couché', kind: 'strength', muscleGroup: 'Pectoraux' },
  { slug: 'pec-deck', name: 'Pec deck', kind: 'strength', muscleGroup: 'Pectoraux' },
  { slug: 'developpe-militaire', name: 'Développé militaire', kind: 'strength', muscleGroup: 'Épaules' },
  {
    slug: 'developpe-militaire-halteres',
    name: 'Développé militaire haltères',
    kind: 'strength',
    muscleGroup: 'Épaules',
  },
  { slug: 'elevations-laterales', name: 'Élévations latérales', kind: 'strength', muscleGroup: 'Épaules' },
  {
    slug: 'extensions-triceps-poulie',
    name: 'Extensions triceps à la poulie',
    kind: 'strength',
    muscleGroup: 'Triceps',
  },
  { slug: 'extension-triceps', name: 'Extension triceps', kind: 'strength', muscleGroup: 'Triceps' },
  { slug: 'tractions', name: 'Tractions', kind: 'strength', muscleGroup: 'Dos' },
  { slug: 'tirage-vertical', name: 'Tirage vertical', kind: 'strength', muscleGroup: 'Dos' },
  { slug: 'rowing-barre', name: 'Rowing barre', kind: 'strength', muscleGroup: 'Dos' },
  { slug: 'rowing-unilateral', name: 'Rowing unilatéral', kind: 'strength', muscleGroup: 'Dos' },
  {
    slug: 'tirage-horizontal',
    name: 'Tirage horizontal à la poulie',
    kind: 'strength',
    muscleGroup: 'Dos',
  },
  { slug: 'curl-biceps', name: 'Curl biceps', kind: 'strength', muscleGroup: 'Biceps' },
  { slug: 'squat', name: 'Squat', kind: 'strength', muscleGroup: 'Jambes' },
  { slug: 'presse-a-cuisses', name: 'Presse à cuisses', kind: 'strength', muscleGroup: 'Jambes' },
  { slug: 'releve-de-jambes', name: 'Relevé de jambes', kind: 'strength', muscleGroup: 'Abdominaux' },
  { slug: 'gainage-planche', name: 'Gainage planche', kind: 'hold', muscleGroup: 'Abdominaux' },
  { slug: 'velo', name: 'Vélo', kind: 'cardio', muscleGroup: null },
  { slug: 'corde-a-sauter', name: 'Corde à sauter', kind: 'cardio', muscleGroup: null },
  { slug: 'marche-inclinee', name: 'Marche rapide inclinée', kind: 'cardio', muscleGroup: null },
];

export interface SeedTemplateExercise {
  slug: string;
  targetSets: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetSeconds?: number;
  supersetGroup?: number;
  notes?: string;
}

export interface SeedTemplate {
  name: string;
  notes: string;
  exercises: SeedTemplateExercise[];
}

/**
 * Les trois séances, dans l'ordre où on les enchaîne.
 *
 * Les fourchettes de répétitions sont celles du programme et non des valeurs
 * arrondies : « 4×8-10 » dit qu'on vise dix et qu'on monte la charge quand on
 * les obtient sur les quatre séries. Ramené à un nombre, ce serait une consigne
 * différente.
 */
export const SEED_TEMPLATES: readonly SeedTemplate[] = [
  {
    name: 'Séance A — Poussée',
    notes: 'Pectoraux, épaules, triceps.',
    exercises: [
      { slug: 'developpe-couche', targetSets: 4, targetRepsMin: 8, targetRepsMax: 10 },
      { slug: 'developpe-militaire', targetSets: 3, targetRepsMin: 10, targetRepsMax: 10 },
      {
        slug: 'ecarte-couche',
        targetSets: 3,
        targetRepsMin: 12,
        targetRepsMax: 12,
        notes: 'Ou pec deck.',
      },
      { slug: 'elevations-laterales', targetSets: 3, targetRepsMin: 15, targetRepsMax: 15 },
      { slug: 'extensions-triceps-poulie', targetSets: 3, targetRepsMin: 12, targetRepsMax: 12 },
      { slug: 'gainage-planche', targetSets: 3, targetSeconds: 45 },
    ],
  },
  {
    name: 'Séance B — Tirage',
    notes: 'Dos, biceps, et des jambes pour ne pas les perdre.',
    exercises: [
      {
        slug: 'tractions',
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        notes: 'Ou tirage vertical.',
      },
      {
        slug: 'rowing-barre',
        targetSets: 4,
        targetRepsMin: 10,
        targetRepsMax: 10,
        notes: 'Barre ou haltère.',
      },
      { slug: 'tirage-horizontal', targetSets: 3, targetRepsMin: 12, targetRepsMax: 12 },
      { slug: 'curl-biceps', targetSets: 3, targetRepsMin: 12, targetRepsMax: 12 },
      {
        slug: 'squat',
        targetSets: 3,
        targetRepsMin: 12,
        targetRepsMax: 12,
        notes: 'Ou presse à cuisses. Les jambes portent le reste.',
      },
      { slug: 'releve-de-jambes', targetSets: 3, targetRepsMin: 15, targetRepsMax: 15 },
    ],
  },
  {
    name: 'Séance C — Haut du corps et cardio',
    notes: 'Tout le haut, puis quinze à vingt minutes de cardio.',
    exercises: [
      { slug: 'developpe-incline', targetSets: 4, targetRepsMin: 10, targetRepsMax: 10 },
      { slug: 'rowing-unilateral', targetSets: 4, targetRepsMin: 10, targetRepsMax: 10 },
      { slug: 'developpe-militaire-halteres', targetSets: 3, targetRepsMin: 10, targetRepsMax: 10 },
      // Les deux suivants s'enchaînent sans repos : même numéro de superset.
      {
        slug: 'curl-biceps',
        targetSets: 3,
        targetRepsMin: 12,
        targetRepsMax: 12,
        supersetGroup: 1,
      },
      {
        slug: 'extension-triceps',
        targetSets: 3,
        targetRepsMin: 12,
        targetRepsMax: 12,
        supersetGroup: 1,
      },
      {
        slug: 'velo',
        targetSets: 1,
        targetSeconds: 1200,
        notes: 'Ou corde à sauter, ou marche rapide inclinée.',
      },
    ],
  },
];
