/** État vide : une phrase, pas d'illustration, pas d'appel à l'action (DESIGN.md). */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="note py-10 text-center">{children}</p>;
}
