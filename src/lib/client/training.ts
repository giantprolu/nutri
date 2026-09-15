/**
 * Appels navigateur vers les routes de séance.
 * Résultats discriminés plutôt qu'exceptions (AD-12).
 */

export type InstallProgramOutcome =
  | { kind: 'installed'; created: number; skipped: string[] }
  | { kind: 'error' };

export async function installProgram(): Promise<InstallProgramOutcome> {
  try {
    const response = await fetch('/api/training', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'install' }),
    });
    if (!response.ok) {
      return { kind: 'error' };
    }
    const body = (await response.json()) as { created: number; skipped: string[] };
    return { kind: 'installed', created: body.created, skipped: body.skipped };
  } catch {
    return { kind: 'error' };
  }
}

export type StartSessionOutcome =
  /** `alreadyOpen` signale qu'on rejoint une séance en cours au lieu d'en ouvrir une. */
  | { kind: 'started'; id: number; alreadyOpen: boolean }
  | { kind: 'error' };

export async function startSession(templateId: number | null): Promise<StartSessionOutcome> {
  try {
    const response = await fetch('/api/training/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId }),
    });
    if (!response.ok) {
      return { kind: 'error' };
    }
    const body = (await response.json()) as { id: number; alreadyOpen?: boolean };
    return { kind: 'started', id: body.id, alreadyOpen: body.alreadyOpen === true };
  } catch {
    return { kind: 'error' };
  }
}

export type SimpleOutcome = { kind: 'ok' } | { kind: 'error' };

/**
 * Enregistre une série, ou corrige celle qui occupe ce rang.
 *
 * Le rang est porté par l'appelant et non par le serveur : c'est lui qui sait
 * quelle case de la grille vient d'être remplie, et une série corrigée doit
 * remplacer la précédente plutôt que s'ajouter à elle.
 */
export async function recordSet(input: {
  sessionId: number;
  exerciseId: number;
  position: number;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
}): Promise<SimpleOutcome> {
  try {
    const response = await fetch('/api/training/sets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    return response.ok ? { kind: 'ok' } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export async function removeSet(setId: number): Promise<SimpleOutcome> {
  try {
    const response = await fetch('/api/training/sets', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ setId }),
    });
    return response.ok ? { kind: 'ok' } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export async function finishSession(id: number): Promise<SimpleOutcome> {
  try {
    const response = await fetch(`/api/training/sessions/${id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'finish' }),
    });
    return response.ok ? { kind: 'ok' } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

/** Abandonne une séance. Ses séries partent avec elle. */
export async function discardSession(id: number): Promise<SimpleOutcome> {
  try {
    const response = await fetch(`/api/training/sessions/${id}`, { method: 'DELETE' });
    return response.ok ? { kind: 'ok' } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
