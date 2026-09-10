/**
 * Vérification des fonctions pures du domaine.
 * Seule partie des critères d'acceptation testable sans base (voir B-2).
 * Lancement : npx tsx scripts/verify-pure.ts
 */
import assert from 'node:assert/strict';
import { scaleMacros, isValidQuantity, isCompleteMacros, sumMacros } from '../src/lib/nutrition';
import { todayInParis, isJournalDate, formatRelativeJournalDate } from '../src/lib/date';

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

console.log('Toutes les verifications pures passent.');
