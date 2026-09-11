import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../client';
import type { ActivityLevel, Goal, Sex } from '@/lib/energy';

/**
 * Profil corporel, un par utilisateur.
 *
 * La date de naissance est stockée plutôt que l'âge : un âge se périme en
 * silence, et le besoin calorique baisse avec les années. Le poids reste en
 * numeric, comme toute mesure de ce projet, pour ne pas dériver (AD-9).
 */

export interface Profile {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercent: number | null;
  activity: ActivityLevel;
  goal: Goal;
  ratePercentPerWeek: number;
}

function toProfile(row: typeof schema.profiles.$inferSelect): Profile {
  return {
    sex: row.sex as Sex,
    birthDate: row.birthDate,
    heightCm: row.heightCm,
    weightKg: Number(row.weightKg),
    bodyFatPercent: row.bodyFatPercent === null ? null : Number(row.bodyFatPercent),
    activity: row.activity as ActivityLevel,
    goal: row.goal as Goal,
    ratePercentPerWeek: Number(row.ratePercentPerWeek),
  };
}

/** Le profil d'un utilisateur, ou `null` s'il n'a pas encore répondu. */
export async function findProfile(userId: number): Promise<Profile | null> {
  const [row] = await db()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .limit(1);
  return row ? toProfile(row) : null;
}

/**
 * Écrit le profil, en création comme en modification.
 * Un seul aller-retour : la clé primaire porte l'utilisateur, le conflit sur
 * cette clé suffit donc à distinguer les deux cas.
 */
export async function saveProfile(userId: number, profile: Profile): Promise<void> {
  const values = {
    userId,
    sex: profile.sex,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    weightKg: String(profile.weightKg),
    bodyFatPercent: profile.bodyFatPercent === null ? null : String(profile.bodyFatPercent),
    activity: profile.activity,
    goal: profile.goal,
    ratePercentPerWeek: String(profile.ratePercentPerWeek),
    updatedAt: new Date(),
  };

  await db()
    .insert(schema.profiles)
    .values(values)
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        sex: sql`excluded.sex`,
        birthDate: sql`excluded.birth_date`,
        heightCm: sql`excluded.height_cm`,
        weightKg: sql`excluded.weight_kg`,
        bodyFatPercent: sql`excluded.body_fat_percent`,
        activity: sql`excluded.activity`,
        goal: sql`excluded.goal`,
        ratePercentPerWeek: sql`excluded.rate_percent_per_week`,
        updatedAt: sql`now()`,
      },
    });
}
