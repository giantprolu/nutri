/**
 * Vérification des fonctions pures du domaine.
 * Seule partie des critères d'acceptation testable sans base (voir B-2).
 * Lancement : npx tsx scripts/verify-pure.ts
 */
import assert from 'node:assert/strict';
import { scaleMacros, isValidQuantity, isCompleteMacros, sumMacros } from '../src/lib/nutrition';
import { todayInParis, isJournalDate, formatRelativeJournalDate } from '../src/lib/date';
import { buildQuantityShortcuts } from '../src/lib/shortcuts';
import { isValidBarcode } from '../src/lib/client/scanner';
import { mapColumns, parseNutrient, isCompleteRow, normalizeHeader } from './ciqual-parse';

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

console.log('Toutes les verifications pures passent.');
