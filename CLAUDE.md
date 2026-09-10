# Projet : NutriPerso

App PWA de suivi alimentaire, mono-utilisateur, usage strictement personnel.
Pas d'App Store, pas de multi-tenant, pas de RGPD, pas d'onboarding public.

## Stack imposée
- Next.js 15 (App Router) + TypeScript strict
- Tailwind + daisyUI
- Postgres (Neon) + Drizzle ORM, extensions `pg_trgm` et `unaccent`
- Déploiement Vercel
- Auth : mot de passe unique en variable d'env, pas de système de comptes

## Definition of Done (obligatoire, chaque story)
1. `npm run build` passe sans erreur ni warning TypeScript
2. `npm run lint` passe
3. `git add -A && git commit -m "feat(story-<id>): <résumé>"`
4. `git push origin bmad/dev`
5. Marquer la story comme terminée dans le sprint status BMAD

Ne jamais passer à la story suivante si le build échoue.
Ne jamais pusher sur `main`. Uniquement `bmad/dev`.
Si une commande échoue deux fois de suite, s'arrêter et écrire le blocage
dans `BLOCKERS.md` plutôt que de contourner.

## Interdits
- Pas de secrets en dur, pas de clé API côté client
- Pas de `any` en TypeScript
- Pas de localStorage comme source de vérité (iOS purge après 7 jours)
