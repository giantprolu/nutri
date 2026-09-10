import type { SearchHit } from '../types';

/** Aucune requête en dessous de trois caractères (FR-7). */
export const MIN_QUERY_LENGTH = 3;

/** Temporisation avant requête, pour ne pas interroger à chaque frappe. */
export const SEARCH_DEBOUNCE_MS = 250;

export type SearchOutcome =
  | { kind: 'hits'; hits: SearchHit[] }
  | { kind: 'too_short' }
  | { kind: 'error' };

export async function searchFoods(
  term: string,
  signal?: AbortSignal,
): Promise<SearchOutcome> {
  if (term.trim().length < MIN_QUERY_LENGTH) {
    return { kind: 'too_short' };
  }

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`, {
      signal,
    });
    if (!response.ok) {
      return { kind: 'error' };
    }
    const body = (await response.json()) as { hits: SearchHit[] };
    return { kind: 'hits', hits: body.hits };
  } catch {
    return { kind: 'error' };
  }
}
