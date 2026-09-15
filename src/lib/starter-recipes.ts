/**
 * Les plats de départ, proposés à un compte qui n'a encore aucune recette.
 *
 * Un planificateur vide ne se remplit jamais : il demande d'écrire cinq
 * recettes avant de rendre le moindre service, et c'est exactement le moment
 * où l'on referme l'application. Ces cinq plats sont là pour que le premier
 * écran soit utilisable, pas pour imposer un menu — ils s'éditent et se
 * suppriment comme les autres.
 *
 * Chaque ingrédient est décrit par un **terme de recherche** et non par un
 * code CIQUAL. Les codes de l'ANSES changent d'un millésime à l'autre, et une
 * liste de codes en dur se serait tue le jour où l'un d'eux aurait disparu :
 * la recette se serait installée avec des ingrédients pointant vers rien.
 * Le terme, lui, passe par la même recherche que l'utilisateur.
 */

export interface StarterIngredient {
  /** Désignation affichée dans la recette, courte et lisible. */
  label: string;
  /** Ce qu'on cherche dans CIQUAL pour trouver la fiche nutritionnelle. */
  searchTerm: string;
  quantityG: number;
  unitName?: string;
  unitGrams?: number;
}

export interface StarterRecipe {
  name: string;
  servings: number;
  prepMinutes: number;
  steps: string[];
  ingredients: StarterIngredient[];
}

/**
 * Cinq plats simples, économiques et protéinés.
 *
 * Les quantités sont données pour deux parts, sauf l'omelette qui n'a de sens
 * qu'à une : c'est un plat qu'on fait pour soi, le soir, sans y penser.
 */
export const STARTER_RECIPES: readonly StarterRecipe[] = [
  {
    name: 'Riz, œufs et légumes',
    servings: 2,
    prepMinutes: 15,
    steps: [
      'Mettre le riz à cuire dans un grand volume d’eau salée.',
      'Faire revenir les légumes surgelés à la poêle avec un filet d’huile, 8 minutes à feu vif.',
      'Casser les œufs sur les légumes, brouiller à la spatule jusqu’à ce qu’ils prennent.',
      'Mélanger le riz égoutté aux légumes, saler et poivrer.',
    ],
    ingredients: [
      { label: 'Riz', searchTerm: 'riz blanc cuit', quantityG: 300 },
      { label: 'Œufs', searchTerm: 'oeuf dur', quantityG: 200, unitName: 'œuf', unitGrams: 50 },
      {
        label: 'Légumes surgelés',
        searchTerm: 'legumes melange surgeles',
        quantityG: 300,
      },
      { label: 'Huile d’olive', searchTerm: 'huile d olive', quantityG: 10 },
    ],
  },
  {
    name: 'Poulet, patate douce et brocolis',
    servings: 2,
    prepMinutes: 35,
    steps: [
      'Préchauffer le four à 200 °C.',
      'Couper les patates douces en cubes, les huiler, les enfourner 25 minutes.',
      'Saisir les cuisses de poulet à la poêle, 6 minutes de chaque côté.',
      'Cuire les brocolis à la vapeur 8 minutes, servir le tout ensemble.',
    ],
    ingredients: [
      { label: 'Cuisses de poulet', searchTerm: 'poulet cuisse cuit', quantityG: 300 },
      { label: 'Patate douce', searchTerm: 'patate douce cuite', quantityG: 400 },
      { label: 'Brocolis', searchTerm: 'brocoli cuit', quantityG: 300 },
      { label: 'Huile d’olive', searchTerm: 'huile d olive', quantityG: 10 },
    ],
  },
  {
    name: 'Lentilles, thon et tomates',
    servings: 2,
    prepMinutes: 10,
    steps: [
      'Égoutter et rincer les lentilles, égoutter le thon.',
      'Couper les tomates en dés.',
      'Tout mélanger, arroser d’huile d’olive, saler et poivrer.',
    ],
    ingredients: [
      { label: 'Lentilles cuites', searchTerm: 'lentille cuite', quantityG: 400 },
      {
        label: 'Thon au naturel',
        searchTerm: 'thon au naturel',
        quantityG: 160,
        unitName: 'boîte',
        unitGrams: 80,
      },
      { label: 'Tomates', searchTerm: 'tomate ronde crue', quantityG: 200 },
      { label: 'Huile d’olive', searchTerm: 'huile d olive', quantityG: 10 },
    ],
  },
  {
    name: 'Omelette et fromage blanc',
    servings: 1,
    prepMinutes: 10,
    steps: [
      'Battre les œufs, saler, poivrer.',
      'Cuire à la poêle à feu moyen, 4 minutes, sans remuer la fin.',
      'Servir le fromage blanc à part, en dessert ou en collation.',
    ],
    ingredients: [
      { label: 'Œufs', searchTerm: 'oeuf dur', quantityG: 150, unitName: 'œuf', unitGrams: 50 },
      { label: 'Fromage blanc 0 %', searchTerm: 'fromage blanc 0%', quantityG: 200 },
    ],
  },
  {
    name: 'Pâtes complètes, sauce tomate et steak haché',
    servings: 2,
    prepMinutes: 20,
    steps: [
      'Mettre les pâtes à cuire.',
      'Émietter le steak haché à la poêle, 5 minutes à feu vif.',
      'Verser la sauce tomate, laisser réduire 5 minutes.',
      'Mélanger aux pâtes égouttées.',
    ],
    ingredients: [
      { label: 'Pâtes complètes', searchTerm: 'pates completes cuites', quantityG: 400 },
      { label: 'Coulis de tomate', searchTerm: 'coulis de tomate', quantityG: 200 },
      { label: 'Steak haché 5 %', searchTerm: 'steak hache 5%', quantityG: 250 },
    ],
  },
];
