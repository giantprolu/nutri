/**
 * Vérification des fonctions pures du domaine.
 * Seule partie des critères d'acceptation testable sans base (voir B-2).
 * Lancement : npx tsx scripts/verify-pure.ts
 */
import assert from 'node:assert/strict';
import { scaleMacros, isValidQuantity, isCompleteMacros, sumMacros } from '../src/lib/nutrition';
import { todayInParis, isJournalDate, formatRelativeJournalDate } from '../src/lib/date';
import { buildQuantityShortcuts } from '../src/lib/shortcuts';

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

console.log('Toutes les verifications pures passent.');
