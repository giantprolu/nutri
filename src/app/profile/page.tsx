import { NavHeader } from '@/components/ScreenHeader';
import { requireUserId } from '@/server/guard';
import { profileFor, targetFor } from '@/server/services/profile';
import { ProfileForm, type ProfileFormValues } from './ProfileForm';

export const dynamic = 'force-dynamic';

/**
 * Questionnaire corporel et cible calorique (FR-26).
 * Composant serveur : le profil est lu en base avant le rendu, le formulaire
 * s'ouvre donc déjà rempli quand il existe.
 */
export default async function ProfilePage() {
  const userId = await requireUserId();
  const [profile, target] = await Promise.all([profileFor(userId), targetFor(userId)]);

  const initial: ProfileFormValues | null = profile
    ? {
        sex: profile.sex,
        birthDate: profile.birthDate,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        bodyFatPercent: profile.bodyFatPercent,
        activity: profile.activity,
        goal: profile.goal,
        ratePercentPerWeek: profile.ratePercentPerWeek,
        manualTargetKcal: profile.manualTargetKcal,
      }
    : null;

  return (
    <>
      <NavHeader label="Réglages" href="/settings" mode="back" />
      <h1 className="display-sm mt-3 mb-4">Mon objectif</h1>
      {target === null ? (
        <p className="note -mt-2 mb-4">
          Quelques mesures, et le journal affichera ce qu&apos;il te reste.
        </p>
      ) : null}
      <ProfileForm initial={initial} initialTarget={target} />
    </>
  );
}
