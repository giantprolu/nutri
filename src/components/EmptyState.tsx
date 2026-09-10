/** État vide : une phrase, pas d'illustration, pas d'appel à l'action (DESIGN.md). */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-10 text-center text-sm text-ink-secondary">{children}</p>
  );
}
