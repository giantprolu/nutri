/**
 * Dates de journal, toujours calculées dans Europe/Paris (AD-11).
 *
 * Les fonctions Vercel tournent en UTC. Sans ce fuseau explicite, un repas
 * enregistré à 23 h 30 heure de Paris tomberait dans le journal du lendemain.
 * C'est le seul endroit du code autorisé à déterminer une date de journal.
 */

const JOURNAL_TIME_ZONE = 'Europe/Paris';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: JOURNAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** La date du jour au format `YYYY-MM-DD`, dans le fuseau du journal. */
export function todayInParis(now: Date = new Date()): string {
  return dateFormatter.format(now);
}

const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: JOURNAL_TIME_ZONE,
  hour: '2-digit',
  hour12: false,
});

/**
 * L'heure courante dans le fuseau du journal, de 0 à 23.
 *
 * Elle vit ici et non dans `@/lib/meal` pour la même raison que la date : les
 * fonctions Vercel tournent en UTC, et c'est le seul module autorisé à savoir
 * dans quel fuseau se lit une journée (AD-11).
 */
export function hourInParis(now: Date = new Date()): number {
  return Number(hourFormatter.format(now));
}

/** Vrai si la chaîne est une date `YYYY-MM-DD` réelle. */
export function isJournalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** « mardi 10 septembre », pour les en-têtes de journal et d'historique. */
export function formatJournalDate(isoDate: string): string {
  return longDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** « Aujourd'hui », « Hier », ou la date longue. */
export function formatRelativeJournalDate(
  isoDate: string,
  today: string = todayInParis(),
): string {
  if (isoDate === today) {
    return "Aujourd'hui";
  }
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (isoDate === yesterday.toISOString().slice(0, 10)) {
    return 'Hier';
  }
  return formatJournalDate(isoDate);
}

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});

/** « septembre 2026 », pour le surtitre de l'historique. */
export function formatMonthYear(isoDate: string): string {
  return monthFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * « 11 septembre 2026 », pour un horodatage technique et non une date de
 * journal : l'import CIQUAL de l'écran de réglages n'a pas de jour de repas.
 */
const stampFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: JOURNAL_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatStampDate(value: Date): string {
  return stampFormatter.format(value);
}

/**
 * Âge en années révolues à partir d'une date de naissance `YYYY-MM-DD`.
 *
 * Comparé sur la date civile et non sur un nombre de millisecondes : diviser
 * un écart par la durée d'une année moyenne se trompe d'un jour autour des
 * anniversaires, et le métabolisme de base dépend de l'âge.
 */
export function ageInYears(birthDate: string, today: string = todayInParis()): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  const beforeBirthday = tm < bm || (tm === bm && td < bd);
  return ty - by - (beforeBirthday ? 1 : 0);
}
