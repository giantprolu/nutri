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
