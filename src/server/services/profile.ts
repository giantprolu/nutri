import 'server-only';
import { ageInYears, todayInParis } from '@/lib/date';
import { computeEnergyTarget, isValidBodyProfile, type EnergyTarget } from '@/lib/energy';
import { findProfile, saveProfile, type Profile } from '../db/queries/profiles';
import { activityBaseline } from '../db/queries/activity';

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
 * Une ou deux journées ne disent rien d'une habitude, et une seule sortie
 * exceptionnelle ferait alors bondir la cible pour deux semaines.
 */
const MIN_MEASURED_DAYS = 3;

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

  const baseline = await activityBaseline(userId, todayInParis(), ACTIVITY_WINDOW_DAYS);
  return baseline.dayCount >= MIN_MEASURED_DAYS
    ? computeEnergyTarget(body, baseline.averageActiveKcal)
    : computeEnergyTarget(body);
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
  return { kind: 'saved', target: computeEnergyTarget(body) };
}
