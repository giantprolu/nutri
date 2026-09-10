# Blocages — NutriPerso

Consigné pendant le sprint BMAD. Chaque entrée dit ce qui manque, ce qui a été
fait pour continuer malgré tout, et ce qui reste à faire côté humain.

## B-1 — Push GitHub impossible

**Constat.** `ssh -T git@github.com` répond `Permission denied (publickey)`.
Aucune clé dans `~/.ssh`, et `gh` n'est pas installé.

**Contournement.** La branche `bmad/dev` existe en local et reçoit tous les
commits. Le remote `origin` est configuré sur
`git@github.com:giantprolu/nutri-perso.git` mais n'a jamais été joint.

**À faire côté humain.** Générer une clé (`ssh-keygen -t ed25519`), l'ajouter au
compte GitHub, créer le dépôt s'il n'existe pas, puis
`git push -u origin main && git push -u origin bmad/dev`. Ou installer `gh` et
lancer `gh auth login`.

## B-2 — Aucune base de données

**Constat.** `DATABASE_URL` n'est pas fournie. Aucune base Neon n'est
provisionnée.

**Contournement.** Le schéma Drizzle, les migrations et les requêtes sont
écrits et compilent. `src/server/db/client.ts` échoue explicitement au premier
appel si la variable manque, plutôt que de se rabattre silencieusement sur des
données factices. Les critères d'acceptation vérifiables sans base (build,
lint, structure) sont tenus ; ceux qui exigent une exécution en base ne le sont
pas.

**À faire côté humain.** Créer une base sur Neon, renseigner `DATABASE_URL`
dans `.env.local` et sur Vercel, puis `npm run db:migrate`.

## B-3 — Aucune clé Mistral

**Constat.** `MISTRAL_API_KEY` n'est pas fournie.

**Contournement.** La route `/api/recognize` et le client Mistral sont écrits
derrière une interface. En l'absence de clé, la route répond 503 avec le code
`model_unavailable`, ce que l'interface traite déjà comme une reconnaissance
indisponible.

**À faire côté humain.** Créer une clé sur console.mistral.ai, la renseigner
dans `.env.local` et sur Vercel.

## B-4 — Fichier CSV CIQUAL absent

**Constat.** `data/ciqual.csv` n'est pas dans le dépôt. Le fichier vient du site
de l'ANSES et n'est pas récupérable sans intervention humaine (acceptation de
conditions, page de téléchargement).

**Contournement.** `scripts/import-ciqual.ts` accepte un chemin en argument et
détecte les colonnes du CSV de l'ANSES. Il échoue avec un message explicite si
le fichier est absent.

**À faire côté humain.** Télécharger la table de composition CIQUAL depuis
ciqual.anses.fr, la placer dans `data/ciqual.csv`, puis
`npm run import:ciqual data/ciqual.csv`.

## B-5 — Identifiant du modèle de vision non vérifié

**Constat.** `pixtral-12b-2409` est la valeur par défaut de `MISTRAL_MODEL`.
Sa disponibilité sur le niveau gratuit n'a pas pu être confirmée sans clé
d'API. Question ouverte 4 du PRD.

**Contournement.** Le modèle est une variable d'environnement, pas une
constante. En changer ne demande aucune modification de code.

**À faire côté humain.** Lister les modèles disponibles une fois la clé créée,
et ajuster `MISTRAL_MODEL` si nécessaire.

## B-6 — ESLint figé sur la ligne 9

**Constat.** `eslint-config-next@15.5.25` déclare un pair `eslint ^9`. ESLint 10
est disponible mais sortirait de cette plage. La 9.39.5 retenue affiche un
avertissement de dépréciation à l'installation.

**Contournement.** Aucun. L'avertissement apparaît à `npm install` et jamais à
`npm run lint`, la Definition of Done reste tenue.

**À faire côté humain.** Rien pour l'instant. Le point se résoudra en passant
à Next 16, dont la configuration ESLint suit la ligne 10.

---

## Bilan de fin de sprint

Les 15 stories sont livrées. `npm run build`, `npm run lint`,
`npm run typecheck` et `npm run verify` passent sans erreur ni avertissement.

**Ce qui a été vérifié en exécution.** Les 12 routes serveur ont été
interrogées sur un serveur de production local : codes 401 sans session, 400
sur entrée invalide, 413 au-delà de 4 Mo, 404 sur date inexistante, et
`Cache-Control: no-store` sur `/api`. Le contrat avec Open Food Facts a été
confronté au service réel. Les invariants d'architecture ont été vérifiés par
inspection du code : aucun appel Open Food Facts côté serveur, SDK Mistral
importé dans un seul fichier, aucune clé dans le bundle client, aucune
jointure d'affichage entre le journal et les tables de référence.

**Ce qui reste non vérifié, faute de base.** Tout ce qui exige une exécution
SQL : l'idempotence réelle de l'import CIQUAL, le plan d'exécution de la
recherche trigramme, les totaux sommés par Postgres, l'unicité des alias.
Le code compile et les requêtes sont écrites, mais elles n'ont jamais tourné.
C'est la conséquence directe de B-2 et B-4.

**Premier geste après avoir provisionné la base.** Appliquer les migrations,
importer CIQUAL deux fois de suite pour confirmer l'idempotence, puis lancer
un `EXPLAIN ANALYZE` sur la requête de recherche pour confirmer que l'index
GIN est bien retenu. Si un balayage séquentiel apparaît, l'expression de la
requête a divergé de celle de l'index de la migration 0003.
