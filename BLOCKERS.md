# Blocages — NutriPerso

Consigné pendant le sprint BMAD. Chaque entrée dit ce qui manque, ce qui a été
fait pour continuer malgré tout, et ce qui reste à faire côté humain.

## B-1 — Push GitHub impossible — **levé le 11/09/2026**

**Constat.** `ssh -T git@github.com` répond `Permission denied (publickey)`.
Aucune clé dans `~/.ssh`, et `gh` n'est pas installé.

**Contournement.** La branche `bmad/dev` existe en local et reçoit tous les
commits. Le remote `origin` est configuré sur
`git@github.com:giantprolu/nutri-perso.git` mais n'a jamais été joint.

**Résolution.** Le remote pointait sur `giantprolu/nutri-perso`, qui n'existe
pas. Le dépôt réel est `giantprolu/nutri`. `origin` est repassé en HTTPS, où
Git Credential Manager fournit déjà les identifiants : aucune clé SSH n'est
nécessaire. `main` est poussée et suivie.

## B-2 — Aucune base de données — **levé le 11/09/2026**

**Constat.** `DATABASE_URL` n'est pas fournie. Aucune base Neon n'est
provisionnée.

**Contournement.** Le schéma Drizzle, les migrations et les requêtes sont
écrits et compilent. `src/server/db/client.ts` échoue explicitement au premier
appel si la variable manque, plutôt que de se rabattre silencieusement sur des
données factices. Les critères d'acceptation vérifiables sans base (build,
lint, structure) sont tenus ; ceux qui exigent une exécution en base ne le sont
pas.

**Résolution.** Base Neon provisionnée, les quatre migrations sont appliquées,
`pg_trgm` et `unaccent` sont installées. Reste à reporter `DATABASE_URL` dans
`.env.local` et dans les variables d'environnement Vercel.

## B-3 — Aucune clé Mistral — **partiellement levé le 11/09/2026**

**Constat.** `MISTRAL_API_KEY` n'est pas fournie.

**Contournement.** La route `/api/recognize` et le client Mistral sont écrits
derrière une interface. En l'absence de clé, la route répond 503 avec le code
`model_unavailable`, ce que l'interface traite déjà comme une reconnaissance
indisponible.

**Résolution partielle.** La clé est créée et renseignée dans `.env.local`.
`GET /v1/models` répond 200 et liste 46 modèles, la clé est donc valide. Mais
`POST /v1/chat/completions` renvoie 429 « Rate limit exceeded » à chaque appel,
sur quatre tentatives espacées d'une minute. Aucune reconnaissance photo n'est
donc possible pour l'instant.

**À faire côté humain.** Activer l'espace de travail sur console.mistral.ai,
ce qui demande une vérification de numéro de téléphone, puis rejouer l'appel.
Reporter enfin la clé dans les variables d'environnement Vercel.

## B-4 — Fichier CSV CIQUAL absent — **levé le 11/09/2026**

**Constat.** `data/ciqual.csv` n'est pas dans le dépôt. Le fichier vient du site
de l'ANSES et n'est pas récupérable sans intervention humaine (acceptation de
conditions, page de téléchargement).

**Contournement.** `scripts/import-ciqual.ts` accepte un chemin en argument et
détecte les colonnes du CSV de l'ANSES. Il échoue avec un message explicite si
le fichier est absent.

**Résolution.** Le millésime 2025 est publié sur l'entrepôt Recherche Data Gouv
(DOI 10.57745/RDMHWY), téléchargeable sans acceptation de conditions. Le
classeur a été converti en CSV point-virgule dans `data/ciqual.csv`, hors
versionnement. 3484 aliments importés, dont 161 incomplets exclus de la
recherche. L'import a été rejoué deux fois : le total ne bouge pas,
l'idempotence est vérifiée.

Deux écarts du millésime 2025 ont demandé une correction du code d'import :
ses en-têtes remplacent la barre oblique par un retour à la ligne
(« Glucides (g/100 g) » devient « Glucides (g ¶ 100 g) »), et ses libellés
d'aliments contiennent eux aussi des retours à la ligne. Voir B-7.

## B-5 — Identifiant du modèle de vision non vérifié — **levé le 11/09/2026**

**Constat.** `pixtral-12b-2409` est la valeur par défaut de `MISTRAL_MODEL`.
Sa disponibilité sur le niveau gratuit n'a pas pu être confirmée sans clé
d'API. Question ouverte 4 du PRD.

**Contournement.** Le modèle est une variable d'environnement, pas une
constante. En changer ne demande aucune modification de code.

**Résolution.** La liste a été obtenue : `pixtral-12b-2409` n'existe plus, et
aucun modèle `pixtral` ne figure au catalogue. Les modèles de vision encore
publiés sont `mistral-small-latest`, `mistral-medium-latest`, la famille
`ministral` et les modèles OCR. Le défaut du code passe à
`mistral-small-latest`, le moins cher des trois. `mistral-medium-latest` est
la relève si la reconnaissance se révèle trop approximative à l'usage.

La qualité de reconnaissance reste non mesurée : le premier appel réel se
heurte au 429 de B-3.

## B-6 — ESLint figé sur la ligne 9

**Constat.** `eslint-config-next@15.5.25` déclare un pair `eslint ^9`. ESLint 10
est disponible mais sortirait de cette plage. La 9.39.5 retenue affiche un
avertissement de dépréciation à l'installation.

**Contournement.** Aucun. L'avertissement apparaît à `npm install` et jamais à
`npm run lint`, la Definition of Done reste tenue.

**À faire côté humain.** Rien pour l'instant. Le point se résoudra en passant
à Next 16, dont la configuration ESLint suit la ligne 10.

## B-7 — Import CIQUAL cassé par le millésime 2025 — **corrigé le 11/09/2026**

**Constat.** Trois défauts, tous révélés au premier import réel.
`normalizeHeader` ne reconnaissait plus la colonne énergie, l'ANSES ayant
remplacé la barre oblique de ses en-têtes par un retour à la ligne.
`csv-parse` était appelé avec `delimiter: [';', ',']`, ce qui découpait toute
ligne dont le libellé contient une virgule (« Lait, demi-écrémé ») et faisait
échouer l'import dès la ligne 216. Enfin les libellés importés gardaient les
retours à la ligne du tableur.

**Correction.** La barre oblique est traitée comme un séparateur dans
`normalizeHeader`, de sorte que 2020 et 2025 se ramènent à la même clé. Le
séparateur est déduit de l'en-tête au lieu d'être accepté au choix. Les
libellés passent par `cleanLabel`, qui les ramène à une seule ligne.

## B-8 — La recherche trigramme ignorait son index — **corrigé le 11/09/2026**

**Constat.** C'est le balayage séquentiel annoncé en fin de sprint.
`EXPLAIN ANALYZE` sur la recherche donnait un `Seq Scan` à 23 ms sur les 3484
lignes, index GIN jamais retenu, même avec `enable_seqscan = off`. L'expression
indexée n'était pourtant pas en cause : la requête écrivait
`terme <% nutri_normalize(name)`, et GIN n'indexe que l'opérande de gauche.

**Correction.** La clause est écrite `nutri_normalize(name) %> terme`, forme
commutée strictement équivalente (mêmes 8 résultats sur « camembert »). Le
plan passe en `Bitmap Index Scan` sur `ciqual_foods_name_trgm_idx`, à 0,2 ms.

**Reste ouvert.** Une requête de plusieurs mots ne remonte rien si ces mots ne
sont pas contigus dans le libellé : « yaourt » trouve, « yaourt nature » ne
trouve pas, parce que `word_similarity` mesure un extrait continu et que le
seuil est à 0,6. C'est le comportement de FR-18 tel qu'écrit, pas une
régression, mais c'est un point à rejouer à l'usage.

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
