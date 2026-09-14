/**
 * Écran de repli hors ligne (FR-23, AD-5).
 * Il n'affiche aucune donnée de journal : Postgres est la seule source de
 * vérité, et un cache local présenté comme à jour serait un mensonge.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center text-center">
      <p className="kicker">NutriPerso</p>
      <h1 className="display mt-1">Hors ligne</h1>
      <p className="note mx-auto mt-3 max-w-[28ch]">
        Le journal vient du serveur. Reconnecte-toi pour le consulter.
      </p>
    </div>
  );
}
