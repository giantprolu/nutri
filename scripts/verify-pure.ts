/**
 * Vérification des fonctions pures du domaine.
 * Seule partie des critères d'acceptation testable sans base (voir B-2).
 * Lancement : npx tsx scripts/verify-pure.ts
 */
import assert from 'node:assert/strict';
import { scaleMacros, isValidQuantity, isCompleteMacros, sumMacros } from '../src/lib/nutrition';
import {
  todayInParis,
  isJournalDate,
  formatRelativeJournalDate,
  ageInYears,
} from '../src/lib/date';
import { buildQuantityShortcuts } from '../src/lib/shortcuts';
import { isValidBarcode } from '../src/lib/client/scanner';
import { mapColumns, parseNutrient, isCompleteRow, normalizeHeader } from './ciqual-parse';
import {
  computeEnergyTarget,
  mifflinStJeor,
  katchMcArdle,
  isValidBodyProfile,
  MAX_ACTIVE_KCAL_PER_BMR,
  type BodyProfile,
} from '../src/lib/energy';
import {
  formatIngredientQuantity,
  macrosPerServing,
  quantityForServings,
  recipeMacros,
  shoppingUnitCount,
  type RecipeIngredient,
} from '../src/lib/recipe';
import { aisleFor } from '../src/lib/aisle';
import { startOfWeek, daysFrom, shiftDate, formatWeekRange } from '../src/lib/date';

// FR-10 : 250 kcal/100 g sur 150 g donne 375 kcal.
const per100g = { kcal: 250, proteinG: 12, carbsG: 30, fatG: 8 };
const scaled = scaleMacros(per100g, 150);
assert.equal(scaled.kcal, 375, 'prorata kcal');
assert.equal(scaled.proteinG, 18, 'prorata proteines');
assert.equal(scaled.carbsG, 45, 'prorata glucides');
assert.equal(scaled.fatG, 12, 'prorata lipides');

// FR-8 : bornes de quantité.
assert.equal(isValidQuantity(0), false, 'quantite nulle refusee');
assert.equal(isValidQuantity(-5), false, 'quantite negative refusee');
assert.equal(isValidQuantity(1.5), false, 'quantite non entiere refusee');
assert.equal(isValidQuantity(5000), false, 'borne haute exclue');
assert.equal(isValidQuantity(4999), true, 'juste sous la borne accepte');
assert.equal(isValidQuantity(1), true, 'un gramme accepte');

// FR-6 : détection d'une fiche incomplète.
assert.equal(isCompleteMacros({ kcal: 10, proteinG: 1, carbsG: 2, fatG: 3 }), true);
assert.equal(isCompleteMacros({ kcal: 10, proteinG: 1, carbsG: 2 }), false, 'lipides manquants');

// AD-9 : les sommes ne dérivent pas.
const total = sumMacros(Array.from({ length: 10 }, () => scaleMacros({ kcal: 0.1, proteinG: 0, carbsG: 0, fatG: 0 }, 100)));
assert.equal(total.kcal, 1, 'somme de dixiemes exacte');

// AD-11 : la date du journal suit Europe/Paris, pas UTC.
// 2026-01-15T23:30 heure de Paris vaut 22:30 UTC : meme jour.
assert.equal(todayInParis(new Date('2026-01-15T22:30:00Z')), '2026-01-15', 'hiver, avant minuit Paris');
// 2026-01-15T23:30 UTC vaut 00:30 le 16 a Paris : jour suivant.
assert.equal(todayInParis(new Date('2026-01-15T23:30:00Z')), '2026-01-16', 'hiver, apres minuit Paris');
// Ete : 2026-07-15T22:30 UTC vaut 00:30 le 16 a Paris.
assert.equal(todayInParis(new Date('2026-07-15T22:30:00Z')), '2026-07-16', 'ete, decalage de deux heures');

assert.equal(isJournalDate('2026-02-30'), false, 'date inexistante refusee');
assert.equal(isJournalDate('2026-02-28'), true, 'date reelle acceptee');
assert.equal(formatRelativeJournalDate('2026-09-10', '2026-09-10'), "Aujourd'hui");
assert.equal(formatRelativeJournalDate('2026-09-09', '2026-09-10'), 'Hier');

// FR-9 : ordre fixe portion, quantites recentes, 100 g.
const withServing = buildQuantityShortcuts({ servingSizeG: 125, recentQuantities: [200, 150] });
assert.deepEqual(
  withServing.map((s) => s.grams),
  [125, 200, 150, 100],
  'portion puis recentes puis 100 g',
);
assert.equal(withServing[0]?.label, 'Portion (125 g)', 'la portion porte son libelle complet');

// La plus recente d'abord, et au plus deux quantites recentes.
const manyRecent = buildQuantityShortcuts({ recentQuantities: [200, 150, 80, 60] });
assert.deepEqual(manyRecent.map((s) => s.grams), [200, 150, 100], 'deux recentes au maximum');

// 100 g toujours propose, et jamais en double.
assert.deepEqual(
  buildQuantityShortcuts({ recentQuantities: [100, 150] }).map((s) => s.grams),
  [100, 150],
  '100 g deja recent n apparait qu une fois',
);
assert.deepEqual(
  buildQuantityShortcuts({ servingSizeG: 100 }).map((s) => s.grams),
  [100],
  'portion de 100 g absorbe le raccourci par defaut',
);
assert.deepEqual(buildQuantityShortcuts({}).map((s) => s.grams), [100], '100 g seul par defaut');
assert.deepEqual(
  buildQuantityShortcuts({ servingSizeG: 0 }).map((s) => s.grams),
  [100],
  'une portion nulle est ignoree',
);

// FR-16 : un code-barres exploitable fait 8, 12 ou 13 chiffres.
assert.equal(isValidBarcode('3017620422003'), true, 'EAN-13');
assert.equal(isValidBarcode('40822938'), true, 'EAN-8');
assert.equal(isValidBarcode('036000291452'), true, 'UPC-A');
assert.equal(isValidBarcode('12345'), false, 'trop court');
assert.equal(isValidBarcode('123456789012345'), false, 'trop long');
assert.equal(isValidBarcode('30176204220O3'), false, 'lettre refusee');
assert.equal(isValidBarcode(''), false, 'chaine vide refusee');

// FR-6 : normalisation des valeurs du CSV ANSES.
assert.equal(parseNutrient('12,5'), 12.5, 'virgule decimale');
assert.equal(parseNutrient('1 234,5'), 1234.5, 'espace insecable de milliers');
assert.equal(parseNutrient('traces'), 0, 'traces valent zero');
assert.equal(parseNutrient('< 0,1'), 0, 'inferieur a un seuil vaut zero');
assert.equal(parseNutrient('-'), null, 'tiret vaut inconnu');
assert.equal(parseNutrient(''), null, 'vide vaut inconnu');
assert.equal(parseNutrient('nd'), null, 'non determine vaut inconnu');
assert.equal(parseNutrient(undefined), null, 'colonne absente vaut inconnu');
assert.equal(parseNutrient('abc'), null, 'texte non numerique vaut inconnu');
assert.equal(parseNutrient('539'), 539, 'entier simple');

// FR-6 : un aliment incomplet est importe mais exclu de la recherche.
assert.equal(isCompleteRow({ kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 }), true);
assert.equal(isCompleteRow({ kcal: 539, protein: null, carbs: 57.5, fat: 30.9 }), false);
assert.equal(isCompleteRow({ kcal: 0, protein: 0, carbs: 0, fat: 0 }), true, 'zero reste complet');

// Les en-tetes varient d'un millesime a l'autre : accents et casse ignores.
assert.equal(normalizeHeader('  Energie, Règlement UE  '), 'energie, reglement ue');
const headers = [
  'alim_code',
  'alim_nom_fr',
  'Energie, Règlement UE N° 1169/2011 (kcal/100 g)',
  'Protéines, N x facteur de Jones (g/100 g)',
  'Glucides (g/100 g)',
  'Lipides (g/100 g)',
];
const mapped = mapColumns(headers);
assert.equal(mapped.ok, true, 'en-tetes ANSES reconnus');
if (mapped.ok) {
  assert.equal(mapped.columns.code, 'alim_code');
  assert.equal(mapped.columns.kcal, 'Energie, Règlement UE N° 1169/2011 (kcal/100 g)');
  assert.equal(mapped.columns.protein, 'Protéines, N x facteur de Jones (g/100 g)');
}
const incompleteHeaders = mapColumns(['alim_code', 'alim_nom_fr']);
assert.equal(incompleteHeaders.ok, false, 'colonnes manquantes signalees');

// --- Besoin energetique (questionnaire) ---
// Attendus calcules a la main, equation par equation.

// Mifflin-St Jeor : 10x80 + 6,25x180 - 5x30 + 5 = 1780.
assert.equal(mifflinStJeor({ sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30 }), 1780);
// Femme : la meme expression moins 161 au lieu de plus 5.
assert.equal(mifflinStJeor({ sex: 'female', weightKg: 60, heightCm: 165, ageYears: 40 }), 1270.25);
// Katch-McArdle : 370 + 21,6 x 68 kg de masse maigre.
assert.ok(Math.abs(katchMcArdle(80, 15) - 1838.8) < 1e-9, 'Katch-McArdle a la virgule pres');

const baseProfile: BodyProfile = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'moderate',
  goal: 'lose',
  ratePercentPerWeek: 0.5,
};

// Perte de 0,5 % de 80 kg par semaine : 400 g, soit 3080 kcal, soit 440 par jour.
const cut = computeEnergyTarget(baseProfile);
assert.equal(cut.bmrKcal, 1780, 'metabolisme de base');
assert.equal(cut.maintenanceKcal, 2759, 'depense totale a 1,55');
assert.equal(cut.adjustmentKcal, -440, 'ecart quotidien');
assert.equal(cut.targetKcal, 2319, 'cible en deficit');
assert.equal(cut.floored, false, 'aucun plancher ne mord ici');
assert.equal(cut.equation, 'mifflin-st-jeor');
assert.equal(cut.proteinG, 160, 'proteines a 2 g/kg en deficit');
assert.equal(cut.fatG, 64.4, 'lipides a 25 % des calories');
assert.equal(cut.carbsG, 274.8, 'glucides en reste');

// La somme des macros redonne la cible, a l'arrondi pres.
const recomposed = cut.proteinG * 4 + cut.carbsG * 4 + cut.fatG * 9;
assert.ok(Math.abs(recomposed - cut.targetKcal) < 2, 'les macros somment a la cible');

// Maintien : aucun ecart, la cible est la depense.
const maintain = computeEnergyTarget({
  ...baseProfile,
  sex: 'female',
  weightKg: 60,
  heightCm: 165,
  ageYears: 40,
  activity: 'sedentary',
  goal: 'maintain',
  ratePercentPerWeek: 0,
});
assert.equal(maintain.adjustmentKcal, 0, 'pas d ecart en maintien');
assert.equal(maintain.targetKcal, 1524, 'cible de maintien');

// Prise de masse : l'ecart est positif.
const bulk = computeEnergyTarget({
  ...baseProfile,
  weightKg: 75,
  heightCm: 178,
  ageYears: 25,
  activity: 'active',
  goal: 'gain',
  ratePercentPerWeek: 0.25,
});
assert.equal(bulk.adjustmentKcal, 206, 'surplus quotidien');
assert.equal(bulk.targetKcal, 3212, 'cible en prise');
assert.ok(bulk.targetKcal > bulk.maintenanceKcal, 'la prise depasse la depense');

// Plancher : un rythme trop ambitieux passerait sous le minimum clinique.
const floored = computeEnergyTarget({
  ...baseProfile,
  sex: 'female',
  weightKg: 50,
  heightCm: 160,
  activity: 'sedentary',
  goal: 'lose',
  ratePercentPerWeek: 1,
});
assert.equal(floored.targetKcal, 1200, 'cible relevee au plancher feminin');
assert.equal(floored.floored, true, 'le rythme demande est signale inatteignable');
assert.ok(floored.targetKcal > floored.bmrKcal, 'jamais sous le metabolisme de base');

// Masse grasse connue : Katch-McArdle et proteines sur la masse maigre.
const withBodyFat = computeEnergyTarget({ ...baseProfile, bodyFatPercent: 15 });
assert.equal(withBodyFat.equation, 'katch-mcardle', 'equation basculee');
assert.equal(withBodyFat.bmrKcal, 1839, 'metabolisme sur la masse maigre');
assert.equal(withBodyFat.proteinG, 163.2, 'proteines a 2,4 g/kg de masse maigre');

// Dépense mesurée : modèle additif, le facteur déclaré est ignoré.
// 1780 de base plus 900 mesurées font 2680, contre 2759 avec le facteur 1,55.
const measured = computeEnergyTarget(baseProfile, 900);
assert.equal(measured.maintenanceKcal, 2680, 'base plus depense mesuree');
assert.equal(measured.basis, 'measured', 'origine mesuree');
assert.equal(measured.targetKcal, 2240, 'cible sur depense mesuree');
assert.equal(cut.basis, 'declared', 'origine declaree sans mesure');

// Une mesure nulle reste une mesure : un jour sans bouger ne bascule pas sur
// le facteur déclaré, sans quoi l'immobilité augmenterait la cible.
const still = computeEnergyTarget(baseProfile, 0);
assert.equal(still.maintenanceKcal, 1780, 'depense nulle prise au mot');
assert.equal(still.basis, 'measured');

// Dépense mesurée aberrante : le pont Santé a déjà remonté une journée à
// 10 773 kcal actives. Sans plafond, la cible d'un homme de 90 kg qui veut
// maigrir montait à plus de quatre mille kilocalories.
const absurd = computeEnergyTarget(
  { ...baseProfile, weightKg: 90.4, heightCm: 179, ageYears: 21, ratePercentPerWeek: 1 },
  10773,
);
assert.equal(absurd.activityCapped, true, 'la mesure aberrante est signalee');
// Le plafond porte sur le metabolisme non arrondi : la comparaison tolere donc
// le kilocalorie d'ecart que l'arrondi du rendu introduit.
assert.ok(
  Math.abs(absurd.maintenanceKcal - absurd.bmrKcal * (1 + MAX_ACTIVE_KCAL_PER_BMR)) <= 1,
  'la depense est ramenee au plafond physiologique',
);
assert.ok(absurd.targetKcal < 4000, 'la cible ne depasse plus le raisonnable');

// Sous le plafond, rien ne change : la mesure est prise telle quelle.
assert.equal(measured.activityCapped, false, 'une mesure plausible n est pas plafonnee');

// Le plafond suit le metabolisme de base et non une constante : il vaut 1,5 fois
// celui-ci, soit 2670 kcal actives pour le profil de reference.
const atCeiling = computeEnergyTarget(baseProfile, 1780 * MAX_ACTIVE_KCAL_PER_BMR);
assert.equal(atCeiling.activityCapped, false, 'le plafond lui-meme reste accepte');
assert.equal(atCeiling.maintenanceKcal, 4450, 'depense au plafond');

// Cible fixee a la main : elle remplace le calcul, planchers et objectif compris.
const manual = computeEnergyTarget({ ...baseProfile, manualTargetKcal: 2200 });
assert.equal(manual.targetKcal, 2200, 'la cible manuelle est rendue telle quelle');
assert.equal(manual.basis, 'manual', 'origine manuelle');
assert.equal(manual.floored, false, 'aucun plancher sur une cible choisie');
assert.equal(manual.adjustmentKcal, 2200 - manual.maintenanceKcal, 'ecart obtenu, non demande');

// Les macronutriments sont repartis sur la cible manuelle, pas sur la calculee.
const manualRecomposed = manual.proteinG * 4 + manual.carbsG * 4 + manual.fatG * 9;
assert.ok(Math.abs(manualRecomposed - 2200) < 2, 'les macros somment a la cible manuelle');

// La mesure reste affichee sous une cible manuelle : l'utilisateur doit voir
// l'ecart qu'il se donne, meme s'il ne decide plus rien.
const manualMeasured = computeEnergyTarget({ ...baseProfile, manualTargetKcal: 2200 }, 900);
assert.equal(manualMeasured.maintenanceKcal, 2680, 'la depense mesuree reste calculee');
assert.equal(manualMeasured.adjustmentKcal, -480, 'deficit reel sous cible manuelle');

// Bornes de la cible manuelle : le minimum clinique du sexe declare tient encore.
assert.equal(
  isValidBodyProfile({ ...baseProfile, manualTargetKcal: 1499 }),
  false,
  'sous le plancher masculin refusee',
);
assert.equal(
  isValidBodyProfile({ ...baseProfile, manualTargetKcal: 1500 }),
  true,
  'le plancher masculin lui-meme accepte',
);
assert.equal(
  isValidBodyProfile({ ...baseProfile, sex: 'female', manualTargetKcal: 1200 }),
  true,
  'plancher feminin plus bas',
);
assert.equal(
  isValidBodyProfile({ ...baseProfile, manualTargetKcal: 6001 }),
  false,
  'faute de frappe au-dela du plafond refusee',
);

// Bornes du questionnaire.
assert.equal(isValidBodyProfile(baseProfile), true, 'profil plausible accepte');
assert.equal(isValidBodyProfile({ ...baseProfile, ageYears: 12 }), false, 'age trop bas');
assert.equal(isValidBodyProfile({ ...baseProfile, heightCm: 300 }), false, 'taille invraisemblable');
assert.equal(isValidBodyProfile({ ...baseProfile, weightKg: 0 }), false, 'poids nul');
assert.equal(
  isValidBodyProfile({ ...baseProfile, ratePercentPerWeek: 2 }),
  false,
  'perte de 2 % par semaine refusee',
);
assert.equal(
  isValidBodyProfile({ ...baseProfile, goal: 'gain', ratePercentPerWeek: 1 }),
  false,
  'prise de 1 % par semaine refusee',
);
assert.equal(
  isValidBodyProfile({ ...baseProfile, bodyFatPercent: 90 }),
  false,
  'taux de masse grasse invraisemblable',
);

// L'age se compte sur la date civile : la veille d'un anniversaire ne compte pas.
assert.equal(ageInYears('1996-05-20', '2026-05-19'), 29, 'la veille');
assert.equal(ageInYears('1996-05-20', '2026-05-20'), 30, 'le jour meme');
assert.equal(ageInYears('1996-05-20', '2026-05-21'), 30, 'le lendemain');
assert.equal(ageInYears('1996-12-31', '2026-01-01'), 29, 'anniversaire en fin d annee');
// Un 29 fevrier tombe le 1er mars les annees non bissextiles.
assert.equal(ageInYears('2000-02-29', '2026-02-28'), 25, '29 fevrier, avant le 1er mars');
assert.equal(ageInYears('2000-02-29', '2026-03-01'), 26, '29 fevrier, apres le 1er mars');

// --- Recettes et liste de courses ---

// Une recette de 4 parts a 600 kcal : la part en vaut 150.
const riz: RecipeIngredient = {
  id: 1,
  position: 0,
  refKind: 'ciqual',
  refValue: '9999',
  label: 'Riz',
  quantityG: 200,
  unitName: null,
  unitGrams: null,
  per100g: { kcal: 200, proteinG: 4, carbsG: 44, fatG: 0.4 },
};
const oeufs: RecipeIngredient = {
  id: 2,
  position: 1,
  refKind: 'ciqual',
  refValue: '8888',
  label: 'Oeufs',
  quantityG: 100,
  unitName: 'oeuf',
  unitGrams: 50,
  per100g: { kcal: 200, proteinG: 13, carbsG: 0.7, fatG: 10 },
};

const totalRecette = recipeMacros([riz, oeufs]);
assert.equal(totalRecette.macros.kcal, 600, 'total de la recette');
assert.equal(totalRecette.unresolvedCount, 0, 'tout est resolu');

const recette = {
  id: 1,
  name: 'Riz aux oeufs',
  servings: 4,
  steps: [],
  prepMinutes: null,
  notes: null,
  ingredients: [riz, oeufs],
};
assert.equal(macrosPerServing(recette).macros.kcal, 150, 'kcal par part');

// Un ingredient sans fiche est exclu du total, et compte a part : un total
// silencieusement ampute serait pire qu'un total annonce comme incomplet.
const inconnu: RecipeIngredient = { ...riz, id: 3, per100g: null };
const partiel = recipeMacros([riz, inconnu]);
assert.equal(partiel.macros.kcal, 400, 'l ingredient sans fiche ne compte pas');
assert.equal(partiel.unresolvedCount, 1, 'l ingredient sans fiche est signale');

// La mise a l'echelle rend des grammes entiers : isValidQuantity les exige.
assert.equal(quantityForServings(200, 4, 1), 50, 'un quart de 200 g');
assert.equal(quantityForServings(200, 3, 1), 67, 'un tiers de 200 g, arrondi');
assert.equal(isValidQuantity(quantityForServings(200, 3, 1)), true, 'quantite journalisable');
// Une epice pesee au gramme sur six parts ne doit pas disparaitre.
assert.equal(quantityForServings(1, 6, 1), 1, 'plancher a 1 g');

// L'unite usuelle s'affiche avec son poids : c'est lui qui explique les macros.
assert.equal(formatIngredientQuantity(oeufs), '2 oeufs (100 g)', 'deux oeufs');
assert.equal(formatIngredientQuantity(riz), '200 g', 'sans unite usuelle');
assert.equal(
  formatIngredientQuantity({ ...oeufs, quantityG: 50 }),
  '1 oeuf (50 g)',
  'un seul oeuf reste au singulier',
);

// On n'achete pas 2,4 oeufs : la liste de courses arrondit au-dessus.
assert.equal(shoppingUnitCount(120, 'oeuf', 50), 3, 'arrondi au superieur');
assert.equal(shoppingUnitCount(100, 'oeuf', 50), 2, 'compte juste');
assert.equal(shoppingUnitCount(200, null, null), null, 'sans unite, rien a compter');

// Le rayon vient du groupe de l'ANSES, sauf pour le froid que le groupe ignore.
assert.equal(aisleFor('Brocoli, cuit', '02'), 'produce', 'legume au rayon frais');
assert.equal(aisleFor('Poulet, cuisse', '04'), 'butcher', 'volaille a la boucherie');
assert.equal(aisleFor('Lait demi-ecreme', '05'), 'dairy', 'lait a la cremerie');
assert.equal(aisleFor('Riz blanc', '03'), 'grocery', 'cereales en epicerie');
// Le zero de tete mange par un tableur ne doit pas deplacer le rayon.
assert.equal(aisleFor('Brocoli', '2'), 'produce', 'code sur un seul chiffre');
// Un legume surgele reste un legume pour l'ANSES, mais pas pour le magasin.
assert.equal(aisleFor('Petits pois surgeles', '02'), 'frozen', 'le froid l emporte');
assert.equal(aisleFor('Epinards surgele', '02'), 'frozen', 'sans accent aussi');
// Un produit a code-barres ne porte aucun groupe : il finit en Divers, ou on
// le retrouve, plutot qu'en epicerie ou on le chercherait longtemps.
assert.equal(aisleFor('Barre proteinee', null), 'other', 'sans groupe connu');

// --- Semaine du plan de repas ---

// La semaine commence le lundi : c'est le jour ou l'on decide de celle qui vient.
assert.equal(startOfWeek('2026-09-15'), '2026-09-14', 'un mardi remonte au lundi');
assert.equal(startOfWeek('2026-09-14'), '2026-09-14', 'un lundi ne bouge pas');
// Le dimanche ferme la semaine, il ne l'ouvre pas : sans quoi le week-end,
// ou se font les courses, serait coupe en deux.
assert.equal(startOfWeek('2026-09-20'), '2026-09-14', 'un dimanche reste dans sa semaine');

// Une semaine fait sept jours consecutifs, changement de mois compris.
const semaine = daysFrom('2026-09-28', 7);
assert.equal(semaine.length, 7, 'sept jours');
assert.equal(semaine[0], '2026-09-28', 'premier jour');
assert.equal(semaine[6], '2026-10-04', 'dernier jour, mois suivant');
// Le passage a l'heure d'hiver ne doit pas produire deux fois le meme jour.
const bascule = daysFrom('2026-10-24', 4);
assert.deepEqual(bascule, ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'], 'changement d heure');

assert.equal(shiftDate('2026-01-01', -1), '2025-12-31', 'recul d une annee');
assert.equal(shiftDate('2026-02-28', 1), '2026-03-01', 'fevrier non bissextile');

// Le mois n'est repete que s'il change : un surtitre lu chaque jour doit rester bref.
assert.equal(formatWeekRange('2026-09-14'), 'du 14 au 20 septembre', 'semaine dans un seul mois');
assert.equal(
  formatWeekRange('2026-09-28'),
  'du 28 septembre au 4 octobre',
  'semaine a cheval sur deux mois',
);

console.log('Toutes les verifications pures passent.');
