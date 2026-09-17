'use client';

import {
  ChevronRightIcon,
  PlayIcon,
  SlidersHorizontalIcon,
  TrendingUpIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ExerciseSheet, type SheetExercise } from '@/components/ExerciseSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { startSession } from '@/lib/client/training';
import {
  EQUIPMENT_PREFERENCE_LABELS,
  formatPrescription,
  groupBySuperset,
  sessionVolume,
  type TrainingPreferences,
  type WorkoutSession,
  type WorkoutTemplate,
} from '@/lib/workout';
import { formatRelativeJournalDate, startOfWeek, todayInParis } from '@/lib/date';

/** Ce que les réponses de l'utilisateur donnent, en une ligne. */
const FOCUS_SHORT: Record<TrainingPreferences['focus'], string> = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  full: 'Haut et bas',
};

/** Une tuile de chiffre, sous la séance en cours. */
function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card className="min-w-0 flex-1 gap-0 p-3">
      <p className="text-[11.5px] text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-[19px] font-semibold tracking-tight">{value}</p>
      <p className="text-[11.5px] text-muted-foreground">{unit}</p>
    </Card>
  );
}

/**
 * L'accueil du Sport : la séance en cours s'il y en a une, les séances du
 * programme, et ce qu'on a fait récemment.
 *
 * La séance ouverte passe avant tout le reste. C'est le cas nominal d'un usage
 * en salle : on pose son téléphone entre deux séries, l'application se
 * recharge, et il faut retrouver la séance là où on l'a laissée sans la
 * chercher.
 *
 * Le programme n'est plus installé d'un bouton mais composé depuis des
 * réponses, et l'écran renvoie donc vers elles plutôt que de proposer un
 * programme tout fait que rien n'ajusterait ensuite.
 */
export function TrainingHome({
  templates,
  openSession,
  history,
  preferences,
  gymName,
}: {
  templates: readonly WorkoutTemplate[];
  openSession: WorkoutSession | null;
  history: readonly WorkoutSession[];
  preferences: TrainingPreferences;
  /** Le nom de la salle choisie, ou `null` si l'utilisateur ne précise pas. */
  gymName: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<SheetExercise | null>(null);

  async function begin(templateId: number) {
    setBusy(true);
    setError(null);
    const outcome = await startSession(templateId);
    setBusy(false);

    if (outcome.kind === 'started') {
      router.push(`/training/session/${outcome.id}`);
      return;
    }
    setError('La séance n’a pas pu être ouverte.');
  }

  if (templates.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="mx-auto max-w-[28ch] text-lg font-semibold tracking-tight">
          Un programme composé pour ta salle.
        </p>
        <p className="mx-auto mt-2 max-w-[34ch] text-muted-foreground">
          Ce que tu veux travailler, où tu t’entraînes, poids libres ou machines.
          Trois réponses, et les séances se composent.
        </p>
        <div className="mx-auto mt-5 flex max-w-[260px] flex-col gap-2.5">
          <Button asChild>
            <Link href="/training/preferences">Composer mon programme</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/training/import">Saisir une séance déjà faite</Link>
          </Button>
        </div>
      </div>
    );
  }

  // La semaine se lit sur les séances terminées déjà chargées : l'accueil en
  // rappelle assez pour couvrir un rythme ordinaire, sans lecture de plus.
  const weekStart = startOfWeek(todayInParis());
  const thisWeek = history.filter((session) => session.sessionDate >= weekStart);
  const weekVolume = thisWeek.reduce((total, session) => total + sessionVolume(session.sets), 0);

  return (
    <>
      {openSession !== null ? (
        <Card className="mb-3 border-primary bg-primary text-primary-foreground">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] opacity-75">Séance en cours</p>
              <p className="mt-0.5 truncate text-lg font-semibold tracking-tight">
                {openSession.templateName ?? 'Séance libre'}
              </p>
              <p className="tabular mt-0.5 text-[12.5px] opacity-75">
                {openSession.sets.length === 0
                  ? 'Aucune série enregistrée'
                  : `${openSession.sets.length} série${openSession.sets.length > 1 ? 's' : ''} · ${sessionVolume(openSession.sets).toLocaleString('fr-FR')} kg soulevés`}
              </p>
            </div>
            <Button
              asChild
              size="icon-lg"
              className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href={`/training/session/${openSession.id}`} aria-label="Reprendre la séance">
                <PlayIcon className="size-5 fill-current" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-2.5">
        <Stat
          label="Cette semaine"
          value={String(thisWeek.length)}
          unit={thisWeek.length > 1 ? 'séances' : 'séance'}
        />
        <Stat
          label="Volume"
          value={
            weekVolume >= 1000
              ? (Math.round(weekVolume / 100) / 10).toLocaleString('fr-FR')
              : weekVolume.toLocaleString('fr-FR')
          }
          unit={weekVolume >= 1000 ? 't soulevées' : 'kg soulevés'}
        />
        <Stat label="Rythme visé" value={String(preferences.sessionsPerWeek)} unit="par semaine" />
      </div>

      <Card asChild className="mt-2.5 flex-row items-center gap-3 px-4 py-3 transition-colors active:bg-accent">
        <Link href="/training/progress">
          <span
            aria-hidden
            className="flex size-8 flex-none items-center justify-center rounded-lg bg-muted"
          >
            <TrendingUpIcon className="size-[17px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-medium tracking-tight">Ma progression</span>
            <span className="mt-px block text-[12.5px] text-muted-foreground">
              Records, 1RM estimé et tonnage par exercice
            </span>
          </span>
          <ChevronRightIcon aria-hidden className="size-4 flex-none text-muted-foreground" />
        </Link>
      </Card>

      {error ? <ErrorAlert className="mt-3">{error}</ErrorAlert> : null}

      <div className="mt-5 mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[12.5px] text-muted-foreground">Le programme</h2>
          <p className="truncate text-[12.5px] text-muted-foreground">
            {FOCUS_SHORT[preferences.focus]} · {gymName ?? 'salle non précisée'} ·{' '}
            {EQUIPMENT_PREFERENCE_LABELS[preferences.equipment].toLowerCase()}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="-mr-2">
          <Link href="/training/preferences">
            <SlidersHorizontalIcon />
            Modifier
          </Link>
        </Button>
      </div>

      <ul className="flex flex-col gap-2.5">
        {templates.map((template) => {
          const running = openSession?.templateId === template.id;
          return (
            <li key={template.id}>
              <Card>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-[14.5px] font-medium">{template.name}</CardTitle>
                      <CardDescription className="mt-0.5 text-[12.5px]">
                        {template.exercises.length} exercice
                        {template.exercises.length > 1 ? 's' : ''}
                        {template.notes === null ? '' : ` · ${template.notes}`}
                      </CardDescription>
                    </div>
                    {running ? (
                      <Badge variant="secondary">En cours</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void begin(template.id)}
                        disabled={busy || openSession !== null}
                      >
                        Commencer
                      </Button>
                    )}
                  </div>

                  <Separator className="mt-3 mb-1.5" />

                  {/*
                    Les exercices sont listés à plat sous leur séance : on veut voir
                    ce qu'on va faire avant de s'engager, sans une navigation de plus.
                    Les supersets sont marqués, c'est leur seule particularité utile
                    au moment du coup d'œil.

                    Chaque nom ouvre sa fiche. C'est ici que le besoin est le plus
                    fort : on découvre un programme qu'on n'a pas écrit, et la moitié
                    des lignes sont des mots de salle qu'on n'a jamais vus.
                  */}
                  <ul>
                    {groupBySuperset(template.exercises).map((block, index) => (
                      <li key={index} className="flex items-baseline justify-between gap-3 py-1">
                        <span className="min-w-0 flex-1 text-[13.5px]">
                          {block.map((entry, rank) => (
                            <span key={entry.id}>
                              {rank > 0 ? ' + ' : null}
                              <button
                                type="button"
                                onClick={() => setShown(entry.exercise)}
                                className="text-left underline decoration-border underline-offset-4 hover:decoration-foreground"
                              >
                                {entry.exercise.name}
                              </button>
                            </span>
                          ))}
                          {block.length > 1 ? (
                            <Badge variant="outline" className="ml-2 align-middle">
                              superset
                            </Badge>
                          ) : null}
                        </span>
                        <span className="tabular flex-none text-muted-foreground">
                          {formatPrescription(block[0]!)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Button asChild variant="outline" className="mt-3 w-full">
        <Link href="/training/import">Saisir une séance déjà faite</Link>
      </Button>

      {history.length > 0 ? (
        <>
          <h2 className="mt-5 mb-1 text-[12.5px] text-muted-foreground">Dernières séances</h2>
          <ul>
            {history.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/training/session/${session.id}`}
                  className="flex items-center gap-3 border-b py-2.5 transition-colors active:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium tracking-tight">
                      {session.templateName ?? 'Séance libre'}
                    </span>
                    <span className="mt-px block text-[12.5px] text-muted-foreground first-letter:uppercase">
                      {formatRelativeJournalDate(session.sessionDate)}
                      {session.finishedAt === null ? ' · non terminée' : ''}
                    </span>
                  </span>
                  <span className="tabular flex-none font-medium">
                    {sessionVolume(session.sets).toLocaleString('fr-FR')} kg
                  </span>
                  <ChevronRightIcon aria-hidden className="size-4 flex-none text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <ExerciseSheet exercise={shown} onClose={() => setShown(null)} />
    </>
  );
}
