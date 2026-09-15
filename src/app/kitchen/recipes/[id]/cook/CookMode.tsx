'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NavHeader } from '@/components/ScreenHeader';
import { journalMeal, planMeal } from '@/lib/client/plan';
import { formatIngredientQuantity, stepDurationSeconds, type Recipe } from '@/lib/recipe';
import { MEAL_LABELS, mealForHour, type Meal } from '@/lib/meal';
import { hourInParis, todayInParis } from '@/lib/date';

/**
 * Mode cuisine : une étape à la fois, en grand.
 *
 * Les mains sont occupées et le téléphone est posé sur un plan de travail à
 * cinquante centimètres. D'où le corps de texte plus gros qu'ailleurs dans
 * l'application, et une seule chose à lire par écran : une liste de six étapes
 * en corps courant oblige à retrouver sa ligne après chaque geste.
 *
 * Le minuteur ne se déclenche jamais seul. Une étape annonce « 8 minutes »,
 * mais on met le riz à cuire quand on est prêt, pas quand l'écran s'affiche.
 *
 * L'alarme de fin est visuelle et vibrante, jamais une fenêtre du navigateur :
 * un `alert()` bloquerait la page tant qu'on ne l'a pas fermée, les mains dans
 * la farine.
 */

/** Affiche un compte à rebours : « 7:42 ». */
function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function CookMode({
  recipe,
  /** Le plat prévu aujourd'hui pour cette recette, s'il y en a un de non mangé. */
  plannedId,
  plannedServings,
}: {
  recipe: Recipe;
  plannedId: number | null;
  plannedServings: number | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ringing, setRinging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = recipe.steps;
  const step = steps[index] ?? '';
  const duration = stepDurationSeconds(step);
  const last = index >= steps.length - 1;

  // Le minuteur est arrêté à chaque changement d'étape : le laisser courir
  // ferait sonner l'étape précédente pendant qu'on lit la suivante.
  useEffect(() => {
    setRemaining(null);
    setRinging(false);
  }, [index]);

  useEffect(() => {
    if (remaining === null) {
      return;
    }
    if (remaining <= 0) {
      setRinging(true);
      // La vibration n'existe pas sur iOS ; l'absence est silencieuse et le
      // repère visuel suffit seul.
      navigator.vibrate?.([200, 100, 200]);
      setRemaining(null);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemaining((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [remaining]);

  /**
   * Inscrit le plat au journal.
   *
   * Si la recette était au plan du jour, c'est cette ligne qu'on marque
   * mangée. Sinon on en crée une pour aujourd'hui, au repas que l'heure
   * suggère, puis on la journalise : cuisiner un plat qui n'était pas prévu
   * reste un repas, et il ne faut pas deux écrans pour le dire.
   */
  async function journal() {
    setBusy(true);
    setError(null);

    let target = plannedId;
    if (target === null) {
      // Le fuseau du journal, pas celui du navigateur : une recette cuisinee a
      // 23 h 30 en France doit tomber dans la journee qui s acheve (AD-11).
      const meal: Meal = mealForHour(hourInParis());
      const created = await planMeal({
        planDate: todayInParis(),
        meal,
        recipeId: recipe.id,
        servings: 1,
      });
      if (created.kind !== 'planned') {
        setBusy(false);
        setError('Le plat n’a pas pu être ajouté au journal.');
        return;
      }
      target = created.id;
    }

    const outcome = await journalMeal(target);
    setBusy(false);

    if (outcome.kind === 'journaled') {
      setNotice(
        outcome.skipped.length === 0
          ? `${outcome.created} ligne${outcome.created > 1 ? 's' : ''} ajoutée${outcome.created > 1 ? 's' : ''} au journal.`
          : `${outcome.created} lignes ajoutées. Sans fiche, donc non comptés : ${outcome.skipped.join(', ')}.`,
      );
      router.refresh();
      return;
    }
    setError(outcome.kind === 'refused' ? outcome.message : 'Enregistrement impossible.');
  }

  if (steps.length === 0) {
    return (
      <>
        <NavHeader label={recipe.name} href={`/kitchen/recipes/${recipe.id}`} mode="back" />
        <p className="note py-10 text-center">
          Cette recette n’a pas d’étapes. Ajoute-les pour la cuisiner pas à pas.
        </p>
        <Link href={`/kitchen/recipes/${recipe.id}/edit`} className="action">
          Écrire les étapes
        </Link>
      </>
    );
  }

  return (
    <>
      <NavHeader label={recipe.name} href={`/kitchen/recipes/${recipe.id}`} mode="close" />

      <p className="kicker">
        Étape {index + 1} sur {steps.length}
        {plannedServings === null ? '' : ` · ${plannedServings} part${plannedServings > 1 ? 's' : ''}`}
      </p>

      {/* Piste de progression : une barre par étape, remplie jusqu'à la courante. */}
      <div aria-hidden className="mt-2 flex gap-1">
        {steps.map((_, position) => (
          <span
            key={position}
            className="h-[3px] flex-1 rounded-full"
            style={{
              background:
                position <= index ? 'var(--color-accent)' : 'var(--color-divider)',
            }}
          />
        ))}
      </div>

      <p className="mt-6 text-[26px] leading-[1.32] font-semibold">{step}</p>

      {duration !== null ? (
        <div className="mt-6">
          {ringing ? (
            <p
              role="status"
              className="figure text-center"
              style={{ color: 'var(--color-accent)' }}
            >
              C’est prêt.
            </p>
          ) : remaining !== null ? (
            <>
              <p className="figure tabular text-center">{formatCountdown(remaining)}</p>
              <button
                type="button"
                onClick={() => setRemaining(null)}
                className="action-quiet mt-3"
              >
                Arrêter le minuteur
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRemaining(duration)}
              className="action-quiet"
            >
              Lancer un minuteur de{' '}
              {duration >= 60 ? `${Math.round(duration / 60)} min` : `${duration} s`}
            </button>
          )}
        </div>
      ) : null}

      <hr className="rule mt-8" />

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="action-quiet flex-1"
        >
          Précédente
        </button>
        {last ? null : (
          <button
            type="button"
            onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}
            className="action flex-1"
          >
            Suivante
          </button>
        )}
      </div>

      {last ? (
        <>
          {notice === null ? (
            <button
              type="button"
              onClick={() => void journal()}
              disabled={busy}
              className="action mt-3"
            >
              {busy
                ? 'Enregistrement…'
                : plannedId === null
                  ? `C’est mangé — ${MEAL_LABELS[mealForHour(hourInParis())].toLowerCase()}`
                  : 'C’est mangé'}
            </button>
          ) : (
            <Link href="/" className="action mt-3">
              Voir le journal
            </Link>
          )}
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      {notice !== null ? (
        <p role="status" className="note mt-4 text-center">
          {notice}
        </p>
      ) : null}

      {/*
        Les ingrédients restent accessibles sans quitter l'étape : on vérifie
        une quantité au milieu d'une recette, et revenir à la fiche ferait
        perdre le fil.
      */}
      <details className="mt-8">
        <summary className="kicker kicker-quiet cursor-pointer">Les ingrédients</summary>
        <ul className="mt-2">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="flex items-baseline justify-between py-1">
              <span className="text-[17px]">{ingredient.label}</span>
              <span className="entry-meta tabular">
                {formatIngredientQuantity(ingredient)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
