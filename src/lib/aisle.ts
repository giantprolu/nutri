/**
 * Rayon d'un ingrédient, pour ranger la liste de courses.
 *
 * Module pur, sans dépendance à la base : la même fonction classe un aliment
 * CIQUAL au moment de la génération de la liste et sert aux vérifications de
 * `scripts/verify-pure.ts`.
 *
 * Le classement part du groupe alimentaire de l'ANSES (`alim_grp_code`), déjà
 * présent dans le CSV importé, plutôt que d'une liste de mots-clés écrite à la
 * main. Un référentiel de trois mille aliments classés par ses auteurs vaut
 * mieux qu'une heuristique qui se trompe sur le premier cas particulier.
 *
 * Le froid est la seule exception, et elle est structurelle : l'ANSES classe
 * un aliment par sa nature, pas par son mode de conservation. Les petits pois
 * surgelés sont dans le groupe des légumes, au même titre que les frais. Or ce
 * qui décide du rayon en magasin, c'est bien la température.
 */

/**
 * Les rayons, dans l'ordre où on les traverse.
 *
 * Les surgelés ferment la liste, et ce n'est pas un détail d'affichage : les
 * prendre en premier, c'est les laisser dégeler le temps du reste des courses.
 * L'ordre d'un écran de liste est une consigne de parcours.
 */
export const AISLES = [
  'produce',
  'butcher',
  'dairy',
  'grocery',
  'drinks',
  'frozen',
  'other',
] as const;

export type Aisle = (typeof AISLES)[number];

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: 'Fruits et légumes',
  butcher: 'Boucherie, poissonnerie',
  dairy: 'Crèmerie',
  grocery: 'Épicerie',
  drinks: 'Boissons',
  frozen: 'Surgelés',
  other: 'Divers',
};

export function isAisle(value: unknown): value is Aisle {
  return typeof value === 'string' && (AISLES as readonly string[]).includes(value);
}

/**
 * Groupe alimentaire de l'ANSES vers rayon.
 *
 * Les codes sont ceux de la colonne `alim_grp_code` de la table CIQUAL, sur
 * deux caractères. Le groupe 01, « entrées et plats composés », tombe en
 * épicerie : un plat préparé de rayon frais y serait mal rangé, mais ce groupe
 * ne devrait quasiment jamais servir d'ingrédient à une recette.
 */
const GROUP_AISLES: Record<string, Aisle> = {
  '01': 'grocery',
  '02': 'produce',
  '03': 'grocery',
  '04': 'butcher',
  '05': 'dairy',
  '06': 'drinks',
  '07': 'grocery',
  '08': 'grocery',
  '09': 'frozen',
  '10': 'grocery',
  '11': 'other',
};

/**
 * Vrai si la désignation annonce un produit congelé.
 *
 * L'accent est optionnel dans le motif : les libellés viennent tantôt de
 * l'ANSES, tantôt d'Open Food Facts, où la saisie est libre et l'accent
 * aléatoire. « Surgele » et « surgelé » désignent le même rayon.
 */
function looksFrozen(label: string): boolean {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return /\b(surgel|congel)/.test(normalized);
}

/**
 * Le rayon d'un ingrédient.
 *
 * `groupCode` est absent pour un produit à code-barres, qui ne porte aucun
 * groupe ANSES, et pour un aliment importé avant que la colonne n'existe. Le
 * repli est « Divers » plutôt qu'« Épicerie » : un article mal rangé se
 * cherche longtemps dans une liste de trente lignes, alors qu'un article en
 * fin de liste se voit.
 */
export function aisleFor(label: string, groupCode: string | null): Aisle {
  if (looksFrozen(label)) {
    return 'frozen';
  }
  if (groupCode === null) {
    return 'other';
  }
  // Le code est cadré à deux chiffres : le CSV publie « 02 », mais un export
  // retraité par un tableur rend « 2 », le zéro de tête ayant été mangé.
  const key = groupCode.trim().padStart(2, '0').slice(0, 2);
  return GROUP_AISLES[key] ?? 'other';
}
