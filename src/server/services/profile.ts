import 'server-only';
import { ageInYears, todayInParis } from '@/lib/date';
import { computeEnergyTarget, isValidBodyProfile, type EnergyTarget } from '@/lib/energy';
import { findProfile, saveProfile, type Profile } from '../db/queries/profiles';
import { activityBaseline, lastActivity } from '../db/queries/activity';

/**
 * Service du profil et de la cible calorique.
 *
 * C'est l'unique endroit où un profil stocké devient une cible. Le calcul
 * lui-même reste dans `@/lib/energy`, pur et testable sans base ; ce module ne
 * fait que l'alimenter et refuser les mesures invraisemblables.
 */

/**
 * Fenêtre de moyenne des dépenses mesurées, en jours. Deux semaines couvrent
 * un cycle d'entraînement complet, semaines creuses comprises, sans remonter
 * si loin qu'un changement d'habitude mette un mois à se voir.
 */
const ACTIVITY_WINDOW_DAYS = 14;

/**
 * Nombre de journées mesurées en dessous duquel on garde le facteur déclaré.
 *
 * Sept, soit une semaine entière : la dépense suit un rythme hebdomadaire, et
 * une fenêtre plus courte tombe sur des jours ouvrés ou sur un week-end sans
 * qu'on sache lequel. Le seuil valait trois, ce qui était trop peu pour la
 * médiane qui décide désormais : sur trois points, deux mesures fausses
 * suffisent à l'emporter, sur sept il en faut quatre.
 */
const MIN_MEASURED_DAYS = 7;

export type { Profile };

/** Le profil converti en entrée de calcul : la date de naissance devient un âge. */
function toBodyProfile(profile: Profile) {
  return {
    sex: profile.sex,
    ageYears: ageInYears(profile.birthDate),
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activity: profile.activity,
    goal: profile.goal,
    ratePercentPerWeek: profile.ratePercentPerWeek,
    ...(profile.bodyFatPercent === null ? {} : { bodyFatPercent: profile.bodyFatPercent }),
    ...(profile.manualTargetKcal === null
      ? {}
      : { manualTargetKcal: profile.manualTargetKcal }),
  };
}

/**
 * La cible d'un utilisateur, ou `null` s'il n'a pas rempli le questionnaire.
 * Le journal doit rester consultable sans profil : l'objectif est un confort,
 * pas une condition d'usage.
 */
export async function targetFor(userId: number): Promise<EnergyTarget | null> {
  const profile = await findProfile(userId);
  if (!profile) {
    return null;
  }
  const body = toBodyProfile(profile);
  if (!isValidBodyProfile(body)) {
    return null;
  }

  // La cible fixée à la main n'a besoin d'aucune mesure : inutile d'aller
  // chercher une dépense que le calcul n'utilisera pas.
  if (profile.manualTargetKcal !== null) {
    return computeEnergyTarget(body);
  }

  const baseline = await activityBaseline(userId, todayInParis(), ACTIVITY_WINDOW_DAYS);
  return baseline.dayCount >= MIN_MEASURED_DAYS
    ? computeEnergyTarget(body, baseline.typicalActiveKcal)
    : computeEnergyTarget(body);
}

/**
 * État du pont Santé, pour l'écran de réglages. Les seuils viennent d'ici et
 * non de l'écran : une valeur recopiée dans l'interface se désynchroniserait
 * du calcul à la première modification.
 */
export async function bridgeStatus(userId: number) {
  const [baseline, last] = await Promise.all([
    activityBaseline(userId, todayInParis(), ACTIVITY_WINDOW_DAYS),
    lastActivity(userId),
  ]);

  return {
    lastDay: last?.day ?? null,
    lastKcal: last?.activeKcal ?? null,
    dayCount: baseline.dayCount,
    typicalKcal: baseline.typicalActiveKcal,
    peakKcal: baseline.maxActiveKcal,
    requiredDays: MIN_MEASURED_DAYS,
  };
}

export function profileFor(userId: number): Promise<Profile | null> {
  return findProfile(userId);
}

export type SaveProfileResult =
  | { kind: 'saved'; target: EnergyTarget }
  | { kind: 'invalid' };

/**
 * Enregistre un profil après contrôle des bornes.
 * La cible est renvoyée dans la foulée : c'est la réponse à la question que
 * l'utilisateur vient de poser en remplissant le questionnaire.
 */
export async function recordProfile(
  userId: number,
  profile: Profile,
): Promise<SaveProfileResult> {
  const body = toBodyProfile(profile);
  if (!isValidBodyProfile(body)) {
    return { kind: 'invalid' };
  }
  await saveProfile(userId, profile);

  // La cible est relue plutôt que recalculée sur place : `targetFor` tient
  // compte de la dépense mesurée, ce que ne faisait pas l'ancien appel direct.
  // Le formulaire affichait donc une cible qui n'était pas celle du journal.
  const target = await targetFor(userId);
  // Le profil vient d'être écrit après validation : ce cas ne se produit pas.
  return target === null ? { kind: 'invalid' } : { kind: 'saved', target };
}
