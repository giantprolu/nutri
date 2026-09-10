/**
 * En-tête d'écran. Lecture seule : le tiers supérieur ne porte aucune
 * cible tactile fréquente (UX-DR-3).
 */
export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="pt-6 pb-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p> : null}
    </header>
  );
}
