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
  type BodyProfile,
} from '../src/lib/energy';

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

console.log('Toutes les verifications pures passent.');
