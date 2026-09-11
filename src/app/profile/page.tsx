import { ScreenHeader } from '@/components/ScreenHeader';
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
      }
    : null;

  return (
    <>
      <ScreenHeader
        title="Mon objectif"
        subtitle={profile ? 'Mets à jour tes mesures' : 'Quelques mesures pour calculer ta cible'}
      />
      <ProfileForm initial={initial} initialTarget={target} />
    </>
  );
}
