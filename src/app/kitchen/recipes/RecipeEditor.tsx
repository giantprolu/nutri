'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NavHeader } from '@/components/ScreenHeader';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { MIN_QUERY_LENGTH, SEARCH_DEBOUNCE_MS, searchFoods } from '@/lib/client/search';
import { cacheProduct } from '@/lib/client/products';
import { createRecipe, updateRecipe } from '@/lib/client/recipes';
import {
  MAX_INGREDIENTS,
  MAX_SERVINGS,
  formatIngredientQuantity,
  recipeMacros,
  type Recipe,
  type RecipeIngredient,
} from '@/lib/recipe';
import { MAX_QUANTITY_G, formatGrams, formatKcal, scaleMacros } from '@/lib/nutrition';
import type { SearchHit } from '@/lib/types';

/**
 * Rédaction d'une recette.
 *
 * Un ingrédient est ajouté à 100 g puis ajusté sur place, plutôt que par un
 * pavé de quantité ouvert à chaque fois comme dans le parcours d'ajout au
 * journal. La différence tient à ce qu'on fait : le journal enregistre un
 * geste, une quantité à la fois, et peut s'offrir un écran par aliment ; une
 * recette s'écrit d'un bloc, six ingrédients de suite, et six allers-retours
 * la rendraient pénible à saisir.
 *
 * Les étapes tiennent dans une seule zone de texte, une par ligne. Une liste
 * de champs ajoutables coûterait deux touches par étape pour le même résultat.
 */

/** Quantité proposée à l'ajout, en grammes. Toujours corrigée, jamais devinée juste. */
const DEFAULT_QUANTITY_G = 100;

/** Ce que l'éditeur manipule : un ingrédient, plus la fiche qui l'a produit. */
type DraftIngredient = Omit<RecipeIngredient, 'id' | 'position'>;

const SOURCE_LABEL: Record<SearchHit['origin'], string> = {
  ciqual: 'Ciqual',
  cache: 'Scanné',
  off: 'Open Food Facts',
};

function toDraft(ingredient: RecipeIngredient): DraftIngredient {
  return {
    refKind: ingredient.refKind,
    refValue: ingredient.refValue,
    label: ingredient.label,
    quantityG: ingredient.quantityG,
    unitName: ingredient.unitName,
    unitGrams: ingredient.unitGrams,
    per100g: ingredient.per100g,
  };
}

export function RecipeEditor({ recipe }: { recipe: Recipe | null }) {
  const router = useRouter();

  const [name, setName] = useState(recipe?.name ?? '');
  const [servings, setServings] = useState(String(recipe?.servings ?? 2));
  const [prepMinutes, setPrepMinutes] = useState(
    recipe?.prepMinutes === null || recipe?.prepMinutes === undefined
      ? ''
      : String(recipe.prepMinutes),
  );
  const [steps, setSteps] = useState((recipe?.steps ?? []).join('\n'));
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(
    (recipe?.ingredients ?? []).map(toDraft),
  );

  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (term.trim().length < MIN_QUERY_LENGTH) {
      setHits(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      const outcome = await searchFoods(term, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setSearching(false);
      setHits(outcome.kind === 'hits' ? outcome.hits : []);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  /**
   * Ajoute un résultat à la liste.
   *
   * Un produit venu de la recherche Open Food Facts n'est pas encore en base.
   * Sans cette mise en cache, la recette porterait une référence vers un
   * produit que rien ne connaît, et le serveur la refuserait — à juste titre,
   * puisqu'aucune macro ne pourrait en être tirée.
   */
  async function add(hit: SearchHit) {
    if (ingredients.length >= MAX_INGREDIENTS) {
      setError(`Une recette ne peut pas dépasser ${MAX_INGREDIENTS} ingrédients.`);
      return;
    }

    if (hit.origin === 'off') {
      const stored = await cacheProduct({
        barcode: hit.ref,
        name: hit.name,
        per100g: hit.per100g,
        servingSizeG: hit.servingSizeG,
        source: 'off',
      });
      if (stored === null) {
        setError("Ce produit n'a pas pu être enregistré. Réessaie.");
        return;
      }
    }

    setError(null);
    setIngredients((current) => [
      ...current,
      {
        refKind: hit.kind,
        refValue: hit.ref,
        label: hit.name,
        quantityG: DEFAULT_QUANTITY_G,
        unitName: null,
        unitGrams: null,
        per100g: hit.per100g,
      },
    ]);
    setTerm('');
    setHits(null);
    searchRef.current?.focus();
  }

  function patch(index: number, change: Partial<DraftIngredient>) {
    setIngredients((current) =>
      current.map((ingredient, position) =>
        position === index ? { ...ingredient, ...change } : ingredient,
      ),
    );
  }

  function remove(index: number) {
    setIngredients((current) => current.filter((_, position) => position !== index));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    const parsedServings = Number(servings.replace(',', '.'));
    const parsedPrep = prepMinutes.trim() === '' ? null : Number(prepMinutes);

    const outcome = await (recipe === null
      ? createRecipe({
          name,
          servings: parsedServings,
          steps: steps.split('\n'),
          prepMinutes: parsedPrep,
          notes: null,
          ingredients: ingredients.map((ingredient) => ({
            refKind: ingredient.refKind,
            refValue: ingredient.refValue,
            label: ingredient.label,
            quantityG: ingredient.quantityG,
            unitName: ingredient.unitName,
            unitGrams: ingredient.unitGrams,
          })),
        })
      : updateRecipe(recipe.id, {
          name,
          servings: parsedServings,
          steps: steps.split('\n'),
          prepMinutes: parsedPrep,
          notes: null,
          ingredients: ingredients.map((ingredient) => ({
            refKind: ingredient.refKind,
            refValue: ingredient.refValue,
            label: ingredient.label,
            quantityG: ingredient.quantityG,
            unitName: ingredient.unitName,
            unitGrams: ingredient.unitGrams,
          })),
        }));

    if (outcome.kind === 'saved') {
      router.replace(`/kitchen/recipes/${outcome.id}`);
      router.refresh();
      return;
    }

    setSubmitting(false);
    setError(
      outcome.kind === 'invalid'
        ? outcome.message
        : outcome.kind === 'unauthorized'
          ? 'Session expirée.'
          : 'Enregistrement impossible.',
    );
  }

  // Le total se recalcule à chaque frappe : c'est lui qui dit si la recette
  // tient dans la journée, et l'attendre après enregistrement serait trop tard.
  const total = recipeMacros(
    ingredients.map((ingredient, position) => ({ ...ingredient, id: -position, position })),
  );
  const parsedServings = Number(servings.replace(',', '.'));
  const perServing =
    Number.isFinite(parsedServings) && parsedServings > 0
      ? scaleMacros(total.macros, 100 / parsedServings)
      : null;

  const canSubmit =
    name.trim().length > 0 &&
    ingredients.length > 0 &&
    Number.isFinite(parsedServings) &&
    parsedServings > 0 &&
    parsedServings <= MAX_SERVINGS &&
    !submitting;

  return (
    <>
      <NavHeader
        label={recipe === null ? 'Nouvelle recette' : 'Modifier'}
        mode="back"
        href={recipe === null ? '/kitchen' : `/kitchen/recipes/${recipe.id}`}
      />

      <label className="label" htmlFor="recipe-name">
        Nom du plat
      </label>
      <div className="field">
        <input
          id="recipe-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Riz, œufs et légumes"
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[19px] outline-none"
        />
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="recipe-servings">
            Parts
          </label>
          <div className="field">
            <input
              id="recipe-servings"
              type="number"
              inputMode="decimal"
              min={1}
              max={MAX_SERVINGS}
              value={servings}
              onChange={(event) => setServings(event.target.value)}
              className="w-full min-w-0 border-0 bg-transparent p-0 text-[19px] outline-none"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="recipe-prep">
            Préparation (min)
          </label>
          <div className="field">
            <input
              id="recipe-prep"
              type="number"
              inputMode="numeric"
              min={0}
              value={prepMinutes}
              onChange={(event) => setPrepMinutes(event.target.value)}
              placeholder="20"
              className="w-full min-w-0 border-0 bg-transparent p-0 text-[19px] outline-none"
            />
          </div>
        </div>
      </div>

      <hr className="rule mt-6" />
      <p className="kicker mt-4 mb-2">Ingrédients</p>

      {ingredients.length === 0 ? (
        <p className="note">Cherche un aliment ci-dessous pour commencer.</p>
      ) : (
        <ul>
          {ingredients.map((ingredient, index) => (
            <li key={`${ingredient.refKind}-${ingredient.refValue}-${index}`} className="py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    aria-label="Nom de l'ingrédient"
                    value={ingredient.label}
                    onChange={(event) => patch(index, { label: event.target.value })}
                    className="entry-name w-full border-0 bg-transparent p-0 outline-none"
                  />
                  <p className="entry-meta mt-0.5">
                    {ingredient.per100g === null ? (
                      <span style={{ color: 'var(--color-danger)' }}>Fiche introuvable</span>
                    ) : (
                      <>
                        {formatKcal(
                          scaleMacros(ingredient.per100g, ingredient.quantityG).kcal,
                        )}{' '}
                        kcal · {formatIngredientQuantity(ingredient)}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-2">
                  <input
                    type="number"
                    aria-label={`Quantité en grammes de ${ingredient.label}`}
                    inputMode="numeric"
                    min={1}
                    max={MAX_QUANTITY_G - 1}
                    value={ingredient.quantityG}
                    onChange={(event) =>
                      patch(index, { quantityG: Math.round(Number(event.target.value)) })
                    }
                    className="field w-[84px] text-right text-[17px]"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Retirer ${ingredient.label}`}
                    className="tap-target flex items-center justify-center"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/*
                L'unité usuelle est repliée : elle ne sert qu'aux ingrédients
                qui se comptent, et l'imposer à tous ferait six champs vides
                pour une recette qui n'en demande qu'un.
              */}
              <details className="mt-2">
                <summary className="kicker kicker-quiet cursor-pointer">
                  Compter en unités
                </summary>
                <div className="mt-2 flex gap-3">
                  <input
                    type="text"
                    aria-label="Nom de l'unité"
                    placeholder="œuf"
                    value={ingredient.unitName ?? ''}
                    onChange={(event) =>
                      patch(index, {
                        unitName: event.target.value.trim() === '' ? null : event.target.value,
                      })
                    }
                    className="field flex-1 text-[17px]"
                  />
                  <input
                    type="number"
                    aria-label="Poids d'une unité en grammes"
                    placeholder="50"
                    min={1}
                    value={ingredient.unitGrams ?? ''}
                    onChange={(event) =>
                      patch(index, {
                        unitGrams:
                          event.target.value.trim() === '' ? null : Number(event.target.value),
                      })
                    }
                    className="field w-[96px] text-right text-[17px]"
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <div className="field field-accent mt-4">
        <SearchIcon className="h-[18px] w-[18px] flex-none" />
        <input
          ref={searchRef}
          type="search"
          autoComplete="off"
          aria-label="Ajouter un ingrédient"
          placeholder="Ajouter un ingrédient"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[19px] outline-none"
        />
      </div>

      {searching ? <p className="kicker kicker-quiet mt-3">Recherche…</p> : null}

      {hits !== null && hits.length === 0 && !searching ? (
        <p className="note mt-3">Aucun aliment trouvé.</p>
      ) : null}

      {hits !== null && hits.length > 0 ? (
        <ul className="mt-2">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.ref}`}>
              <button type="button" onClick={() => void add(hit)} className="entry-row items-center">
                <span className="min-w-0 flex-1">
                  <span className="entry-name block">{hit.name}</span>
                  <span className="entry-meta mt-0.5 block">
                    {formatKcal(hit.per100g.kcal)} kcal pour 100 g
                  </span>
                </span>
                <span
                  className={`kicker flex-none ${hit.origin === 'ciqual' ? 'kicker-quiet' : ''}`}
                >
                  {SOURCE_LABEL[hit.origin]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <hr className="rule mt-6" />
      <label className="label mt-4" htmlFor="recipe-steps">
        Étapes, une par ligne
      </label>
      <textarea
        id="recipe-steps"
        rows={6}
        value={steps}
        onChange={(event) => setSteps(event.target.value)}
        placeholder={'Mettre le riz à cuire.\nFaire revenir les légumes 8 minutes.'}
        className="field w-full text-[17px] leading-[1.5]"
      />

      {perServing !== null && ingredients.length > 0 ? (
        <>
          <hr className="rule mt-6" />
          <div className="mt-4">
            <p className="kicker">Par part</p>
            <p className="figure mt-1">
              {total.unresolvedCount > 0 ? '≈ ' : ''}
              {formatKcal(perServing.kcal)} kcal
            </p>
            <p className="entry-meta mt-1">
              {formatGrams(perServing.proteinG)} P · {formatGrams(perServing.carbsG)} G ·{' '}
              {formatGrams(perServing.fatG)} L
            </p>
            {total.unresolvedCount > 0 ? (
              <p className="note mt-2">
                {total.unresolvedCount === 1
                  ? "Un ingrédient n'a pas de fiche : le total est incomplet."
                  : `${total.unresolvedCount} ingrédients n'ont pas de fiche : le total est incomplet.`}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-[15px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit}
        className="action mt-6"
      >
        {submitting ? 'Enregistrement…' : 'Enregistrer la recette'}
      </button>
    </>
  );
}
