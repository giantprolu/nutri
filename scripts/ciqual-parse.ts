/**
 * Normalisation du CSV CIQUAL (FR-6).
 *
 * Séparé du script d'import pour être vérifiable sans base ni fichier ANSES
 * (voir B-2 et B-4 de BLOCKERS.md).
 */

/**
 * Les en-têtes varient selon le millésime publié par l'ANSES. On accepte
 * plusieurs libellés par colonne plutôt que d'imposer un format exact.
 */
export const COLUMN_ALIASES = {
  code: ['alim_code', 'code'],
  name: ['alim_nom_fr', 'nom', 'libelle'],
  kcal: [
    'energie, règlement ue n° 1169/2011 (kcal/100 g)',
    'energie (kcal/100 g)',
    'energie kcal',
  ],
  protein: [
    'protéines, n x facteur de jones (g/100 g)',
    'protéines (g/100 g)',
    'proteines',
  ],
  carbs: ['glucides (g/100 g)', 'glucides'],
  fat: ['lipides (g/100 g)', 'lipides'],
} as const;

export type ColumnKey = keyof typeof COLUMN_ALIASES;

/**
 * Minuscules, sans accents, espaces normalisés.
 *
 * La barre oblique compte pour un séparateur au même titre qu'un espace :
 * le millésime 2025 coupe ses en-têtes par un retour à la ligne là où 2020
 * écrivait « Glucides (g/100 g) ». Les deux se ramènent ainsi à la même clé.
 */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s/]+/g, ' ');
}

/**
 * Associe chaque colonne attendue à l'en-tête réellement présent.
 * Renvoie la liste des colonnes manquantes plutôt que de lever (AD-12).
 */
export function mapColumns(
  headers: readonly string[],
): { ok: true; columns: Record<ColumnKey, string> } | { ok: false; missing: ColumnKey[] } {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  const columns = {} as Record<ColumnKey, string>;
  const missing: ColumnKey[] = [];

  for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as [
    ColumnKey,
    readonly string[],
  ][]) {
    const exact = aliases
      .map((alias) => normalized.get(normalizeHeader(alias)))
      .find((header) => header !== undefined);

    if (exact !== undefined) {
      columns[key] = exact;
      continue;
    }

    // Repli sur un préfixe : « Energie ... (kcal/100 g) » couvre les variantes
    // de libellé réglementaire d'une année à l'autre.
    const prefix = normalizeHeader(aliases[0] ?? '').split('(')[0]?.trim();
    const loose =
      prefix === undefined || prefix === ''
        ? undefined
        : [...normalized.entries()].find(([candidate]) => candidate.startsWith(prefix));

    if (loose) {
      columns[key] = loose[1];
      continue;
    }
    missing.push(key);
  }

  return missing.length > 0 ? { ok: false, missing } : { ok: true, columns };
}

/**
 * Normalise une valeur nutritionnelle.
 * « traces » et « < 0,1 » valent zéro ; « - », « nd » et le vide valent inconnu.
 * La virgule décimale française est convertie.
 */
export function parseNutrient(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (value === '' || value === '-' || value === 'nd' || value === 'na') {
    return null;
  }
  if (value.startsWith('traces') || value.startsWith('<')) {
    return 0;
  }
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Un aliment n'est exploitable que si les quatre valeurs sont lisibles (FR-6). */
export function isCompleteRow(values: {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}): boolean {
  return (
    values.kcal !== null &&
    values.protein !== null &&
    values.carbs !== null &&
    values.fat !== null
  );
}
