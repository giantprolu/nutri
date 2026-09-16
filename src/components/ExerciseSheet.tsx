import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { demoSearchUrl, illustrationFor, ILLUSTRATION_RATIO } from '@/lib/exercise-media';
import { EQUIPMENT_LABELS, type Exercise } from '@/lib/workout';

/**
 * Ce à quoi ressemble un exercice.
 *
 * Un programme composé de « pec deck », « face pull » et « hip thrust » est
 * illisible pour qui débute : ce sont des mots de salle, et aucun ne dit le
 * mouvement. Un toucher sur le nom ouvre les deux photos, début et fin, qui
 * lèvent le doute en une seconde.
 *
 * Les deux images alternent plutôt que de s'afficher côte à côte. Un
 * mouvement se reconnaît à son déplacement, pas à deux poses figées : voir la
 * barre monter et descendre dit ce qu'aucune légende ne dirait. Elles sont
 * toutes deux montées et superposées, et seule l'opacité change — échanger la
 * source ferait clignoter la fiche le temps du premier chargement.
 *
 * Qui a demandé moins d'animation les obtient côte à côte, et l'alternance
 * s'arrête.
 *
 * Pas de directive `use client` : ce composant n'est monté que depuis des
 * écrans qui la portent déjà, comme les autres feuilles du projet.
 */

/** Ce dont la fiche a besoin : moins qu'un exercice complet. */
export type SheetExercise = Pick<
  Exercise,
  'slug' | 'name' | 'muscleGroup' | 'equipment'
>;

/** Durée d'affichage de chaque pose. Assez lent pour lire, assez vif pour lier. */
const FRAME_MS = 1100;

export function ExerciseSheet({
  exercise,
  onClose,
}: {
  /** L'exercice à montrer, ou `null` quand la feuille est fermée. */
  exercise: SheetExercise | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [frame, setFrame] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (exercise !== null && !dialog.open) {
      dialog.showModal();
    } else if (exercise === null && dialog.open) {
      dialog.close();
    }
  }, [exercise]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setStill(query.matches);
    const onChange = (event: MediaQueryListEvent) => setStill(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (exercise === null || still) {
      return;
    }
    // Repartir du début à chaque ouverture : la première pose est la position
    // de départ, et prendre le mouvement par la fin se lit à l'envers.
    setFrame(0);
    const timer = window.setInterval(() => setFrame((current) => 1 - current), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [exercise, still]);

  const frames = exercise === null ? null : illustrationFor(exercise.slug);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      aria-label={exercise?.name ?? 'Détail de l’exercice'}
      className="sheet"
    >
      {exercise === null ? null : (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="kicker">
                {exercise.muscleGroup ?? EQUIPMENT_LABELS[exercise.equipment]}
              </p>
              <h2 className="display-sm mt-1">{exercise.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="tap-target -mr-2 flex flex-none items-center justify-center opacity-55"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {frames === null ? (
            <p className="note mt-4">
              Pas d’illustration pour cet exercice : il a été créé depuis une séance
              saisie à la main, et son nom est tout ce qu’on en connaît.
            </p>
          ) : still ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {frames.map((source, index) => (
                <div
                  key={source}
                  className="plate relative overflow-hidden"
                  style={{ aspectRatio: ILLUSTRATION_RATIO }}
                >
                  <Image
                    src={source}
                    alt={
                      index === 0
                        ? `${exercise.name} : position de départ`
                        : `${exercise.name} : position d’arrivée`
                    }
                    fill
                    sizes="(max-width: 32rem) 50vw, 16rem"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="plate relative mt-4 overflow-hidden"
              style={{ aspectRatio: ILLUSTRATION_RATIO }}
            >
              {frames.map((source, index) => (
                <Image
                  key={source}
                  src={source}
                  alt={index === 0 ? `${exercise.name}, le mouvement` : ''}
                  aria-hidden={index === 1}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 32rem) 100vw, 32rem"
                  className="object-cover transition-opacity duration-300"
                  style={{ opacity: frame === index ? 1 : 0 }}
                />
              ))}
            </div>
          )}

          <div className="mode-row mt-4">
            <span className="min-w-0 flex-1">
              <strong>{EQUIPMENT_LABELS[exercise.equipment]}</strong>
              <small>
                {exercise.muscleGroup === null
                  ? 'Cardio, sans groupe musculaire dominant'
                  : `Travaille surtout : ${exercise.muscleGroup.toLowerCase()}`}
              </small>
            </span>
          </div>

          {/*
            Un lien sortant, pas une vidéo intégrée : deux photos répondent
            déjà à « c'est quoi, cet exercice ». Celui qui veut la technique
            complète la trouvera mieux là-bas que dans une fenêtre de 400 px.
          */}
          <a
            href={demoSearchUrl(exercise.name)}
            target="_blank"
            rel="noreferrer"
            className="action-quiet mt-4"
          >
            Chercher une démonstration
          </a>
        </>
      )}
    </dialog>
  );
}
