/**
 * Écran de repli hors ligne (FR-23, AD-5).
 * Il n'affiche aucune donnée de journal : Postgres est la seule source de
 * vérité, et un cache local présenté comme à jour serait un mensonge.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center text-center">
      <h1 className="text-xl font-semibold">Hors ligne</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        Le journal vient du serveur. Reconnecte-toi pour le consulter.
      </p>
    </div>
  );
}
