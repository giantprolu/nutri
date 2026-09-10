---
stepsCompleted: [step-01, step-02, step-03, step-04]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-nutri-perso-2026-09-10/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-nutri-perso-2026-09-10/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-nutri-perso-2026-09-10/DESIGN.md
  - _bmad-output/planning-artifacts/architecture/architecture-nutri-perso-2026-09-10/spine.md
---

# NutriPerso — Découpage en epics

## Vue d'ensemble

Ce document décompose le PRD, les spécifications UX et l'architecture de NutriPerso en 7 epics et 15 stories implémentables. Chaque story est verticale : elle produit quelque chose de vérifiable dans le navigateur, et ne dépend que des stories qui la précèdent.

L'ordre des epics est imposé par le cadrage : socle, puis journal en lecture, puis saisie manuelle, puis scan de code-barres, puis import CIQUAL et recherche, puis historique, et enfin reconnaissance photo. Cet ordre place le chemin qui porte l'essentiel de l'usage réel avant le chemin de confort.

Chaque story crée uniquement les tables dont elle a besoin. Aucune migration ne prépare le terrain de stories futures.

## Inventaire des exigences

### Exigences fonctionnelles

- **FR-1** Déverrouillage par mot de passe
- **FR-2** Protection des routes
- **FR-3** Durée et fin de session
- **FR-4** Affichage du journal du jour
- **FR-5** Suppression d'une entrée
- **FR-6** Import de la table CIQUAL
- **FR-7** Recherche textuelle d'un aliment de référence
- **FR-8** Saisie de la quantité
- **FR-9** Raccourcis de quantité
- **FR-10** Enregistrement avec macros figées
- **FR-11** Ouverture de la caméra et décodage
- **FR-12** Résolution d'un code-barres via le cache produits
- **FR-13** Interrogation d'Open Food Facts depuis le client
- **FR-14** Mise en cache d'un produit trouvé
- **FR-15** Produit inconnu ou fiche incomplète
- **FR-16** Saisie manuelle d'un code-barres
- **FR-17** Envoi d'une photo et reconnaissance
- **FR-18** Proposition de candidats
- **FR-19** Mémorisation des alias d'aliment
- **FR-20** Liste des journaux passés
- **FR-21** Détail d'un journal passé
- **FR-22** Installation sur l'écran d'accueil
- **FR-23** Service worker de cache applicatif
- **FR-24** Écran de réglages
- **FR-25** Entrée ad hoc

### Exigences non fonctionnelles

- **NFR-1 Plateforme** — Cible unique Safari iOS en PWA installée.
- **NFR-2 Sécurité** — Aucun secret dans le bundle client, mot de passe jamais journalisé.
- **NFR-3 Confidentialité** — Seuls appels sortants : Open Food Facts avec un code-barres, Mistral avec une photo à l'initiative de l'utilisateur.
- **NFR-4 Intégrité** — Aucune fonctionnalité ne réécrit les macros d'une entrée existante.
- **NFR-5 Performance** — Journal affiché en moins d'une seconde, recherche en moins de 300 ms côté serveur.
- **NFR-6 Accessibilité tactile** — Cibles de 44 px minimum, aucun contrôle critique dans le tiers supérieur.
- **NFR-7 Qualité de code** — TypeScript strict, aucun `any`, compilation et analyse statique sans avertissement.
- **NFR-8 Coût** — Tout tient dans les niveaux gratuits de Vercel, Neon et Mistral.

### Exigences complémentaires (architecture)

Les décisions d'architecture AD-1 à AD-12 du spine lient toutes les stories. Les plus structurantes pour l'implémentation :

- **AD-1** Macros figées dans `entries`, aucune jointure d'affichage vers les tables de référence.
- **AD-2** Open Food Facts appelé depuis le navigateur uniquement.
- **AD-3** Succès d'Open Food Facts lu dans le champ `status`, pas dans le code HTTP.
- **AD-4** Clé Mistral confinée au serveur.
- **AD-5** Postgres seule source de vérité, service worker limité à la coquille.
- **AD-6** Recherche sur index GIN trigramme, avec fonction `unaccent` enveloppée en `IMMUTABLE`.
- **AD-9** Colonnes nutritionnelles en `numeric(10,3)`, sommes calculées par Postgres.
- **AD-11** Dates de journal calculées en `Europe/Paris`.
- **AD-12** Échecs modélisés en types discriminés, jamais en exceptions.

### Exigences de conception UX

- **UX-DR-1** Barre d'onglets basse à quatre destinations, bouton d'ajout central circulaire de 56 px qui déborde vers le haut.
- **UX-DR-2** Thème sombre daisyUI unique, sans bascule vers un thème clair.
- **UX-DR-3** Toute cible tactile mesure au moins 44 px, aucun contrôle fréquent dans le tiers supérieur.
- **UX-DR-4** Le parcours de scan d'un produit en cache tient en trois interactions depuis l'ouverture.
- **UX-DR-5** Microcopie factuelle, tutoiement, aucun encouragement ni point d'exclamation.
- **UX-DR-6** Chaque état vide ou en échec porte le texte défini dans la table des motifs d'état.
- **UX-DR-7** Retour systématique au journal du jour après un enregistrement, quel que soit le chemin.
- **UX-DR-8** Balayage vers la gauche sur une ligne d'entrée pour la supprimer, seul geste non standard.
- **UX-DR-9** Chiffres tabulaires pour toute valeur numérique en liste.
- **UX-DR-10** Typographie dynamique iOS honorée, sans troncature au réglage maximal.

### Carte de couverture des exigences

| Exigence | Epic | Story |
|---|---|---|
| FR-1, FR-2, FR-3 | 1 | 1.2 |
| FR-4 | 2 | 2.1 |
| FR-5 | 2 | 2.2 |
| FR-6 | 5 | 5.1 |
| FR-7 | 5 | 5.2 |
| FR-8, FR-10, FR-25 | 3 | 3.1 |
| FR-9 | 3 | 3.2 |
| FR-11, FR-16 | 4 | 4.1 |
| FR-12, FR-13, FR-14 | 4 | 4.2 |
| FR-15 | 4 | 4.3 |
| FR-17 | 7 | 7.1 |
| FR-18, FR-19 | 7 | 7.2 |
| FR-20, FR-21 | 6 | 6.1 |
| FR-22, FR-23, FR-24 | 1 | 1.3 |
| NFR-1, NFR-7 | 1 | 1.1 |
| NFR-2, NFR-3 | 1, 4, 7 | 1.2, 4.2, 7.1 |
| NFR-4 | 2, 3 | 2.1, 3.1 |
| NFR-5 | 2, 5 | 2.1, 5.2 |
| NFR-6, NFR-8 | 1 | 1.1, 1.3 |
| UX-DR-1, UX-DR-2, UX-DR-3, UX-DR-9, UX-DR-10 | 1 | 1.1 |
| UX-DR-5, UX-DR-6 | toutes | toutes |
| UX-DR-4 | 3, 4 | 3.2, 4.2 |
| UX-DR-7 | 3 | 3.1 |
| UX-DR-8 | 2 | 2.2 |

## Liste des epics

| Epic | Titre | Stories | Exigences |
|---|---|---|---|
| 1 | Socle applicatif et accès | 3 | FR-1 à FR-3, FR-22 à FR-24 |
| 2 | Journal du jour | 2 | FR-4, FR-5 |
| 3 | Ajout manuel d'une entrée | 2 | FR-8 à FR-10, FR-25 |
| 4 | Scan de code-barres | 3 | FR-11 à FR-16 |
| 5 | CIQUAL et recherche textuelle | 2 | FR-6, FR-7 |
| 6 | Historique | 1 | FR-20, FR-21 |
| 7 | Reconnaissance d'aliments par photo | 2 | FR-17 à FR-19 |

---

## Epic 1 : Socle applicatif et accès

Mettre en place une application Next.js 15 déployable, installable sur iPhone, dont l'accès est protégé par un mot de passe unique. À l'issue de cet epic, l'application est une coquille navigable et verrouillée, sans aucune donnée.

### Story 1.1 : Squelette applicatif et navigation

En tant qu'utilisateur,
je veux ouvrir l'application et naviguer entre ses quatre destinations,
afin de disposer d'une coquille sur laquelle les fonctionnalités viendront se greffer.

**Critères d'acceptation :**

**Étant donné** un dépôt vide,
**Quand** j'installe le projet et lance `npm run dev`,
**Alors** l'application démarre sur Next.js 15.5.25 avec React 19, TypeScript 5.9.3 en mode strict, Tailwind 4.3.3 et daisyUI 5.7.34,
**Et** `npm run build` et `npm run lint` passent sans erreur ni avertissement.

**Étant donné** l'application ouverte,
**Quand** j'observe l'écran,
**Alors** une barre d'onglets basse affiche Journal, Ajouter, Historique et Réglages,
**Et** l'onglet Ajouter est un bouton circulaire vert de 56 px qui déborde vers le haut de la barre (UX-DR-1),
**Et** chaque cible tactile mesure au moins 44 px (UX-DR-3, NFR-6).

**Étant donné** la barre d'onglets,
**Quand** je tape une destination,
**Alors** l'écran correspondant s'affiche, même vide,
**Et** le thème sombre daisyUI défini dans DESIGN.md est appliqué, sans bascule vers un thème clair (UX-DR-2).

**Étant donné** l'arborescence du projet,
**Quand** j'inspecte `src/`,
**Alors** les répertoires `app`, `server`, `lib` et `components` existent conformément à la graine structurelle du spine,
**Et** aucun `any` n'apparaît dans le code (NFR-7).

**Commande de validation :** `npm run build && npm run lint`

### Story 1.2 : Déverrouillage par mot de passe

En tant qu'utilisateur,
je veux déverrouiller l'application avec un mot de passe unique,
afin que mes données restent inaccessibles à qui découvrirait l'URL.

**Critères d'acceptation :**

**Étant donné** aucune session ouverte,
**Quand** j'atteins n'importe quelle route applicative,
**Alors** je suis redirigé vers l'écran de déverrouillage (FR-2),
**Et** le champ mot de passe reçoit le focus automatiquement.

**Étant donné** l'écran de déverrouillage,
**Quand** je saisis le mot de passe attendu,
**Alors** un cookie de session signé, `httpOnly`, `secure` et `sameSite=lax` est posé pour au moins 30 jours,
**Et** je suis redirigé vers le journal du jour (FR-1, FR-3).

**Étant donné** l'écran de déverrouillage,
**Quand** je saisis un mot de passe incorrect,
**Alors** le message « Mot de passe incorrect. » s'affiche (UX-DR-5),
**Et** aucun cookie n'est posé,
**Et** la comparaison a été effectuée en temps constant.

**Étant donné** une route serveur sous `/api/`,
**Quand** je l'appelle sans cookie valide,
**Alors** je reçois un code 401 et aucun corps métier (FR-2).

**Étant donné** le bundle client construit,
**Quand** je cherche la valeur du mot de passe,
**Alors** elle n'y figure pas, et n'apparaît dans aucune réponse HTTP ni aucun journal (NFR-2).

**Commande de validation :** `npm run build && npm run lint`, puis `curl -i http://localhost:3000/api/session -X GET` doit renvoyer 401.

### Story 1.3 : PWA installable et écran de réglages

En tant qu'utilisateur,
je veux installer l'application sur l'écran d'accueil de mon iPhone,
afin de l'ouvrir en plein écran comme une application native.

**Critères d'acceptation :**

**Étant donné** l'application servie en HTTPS,
**Quand** j'inspecte `public/manifest.json`,
**Alors** il déclare le nom, les icônes aux tailles requises par iOS, `display: standalone` et les couleurs de thème de DESIGN.md (FR-22).

**Étant donné** l'application ouverte dans Safari iOS,
**Quand** je l'ajoute à l'écran d'accueil via le menu de partage puis l'ouvre,
**Alors** elle s'affiche sans barre d'adresse.

**Étant donné** le service worker configuré avec Serwist 9.5.12,
**Quand** j'inspecte son manifeste de précache,
**Alors** il ne contient que des ressources statiques de la coquille applicative,
**Et** aucune réponse de `/api/` n'y figure (FR-23, AD-5),
**Et** toute réponse de `/api/` porte l'en-tête `Cache-Control: no-store`.

**Étant donné** l'application hors ligne,
**Quand** je navigue,
**Alors** un écran de repli s'affiche, sans aucune donnée de journal (AD-5).

**Étant donné** l'onglet Réglages,
**Quand** je l'ouvre,
**Alors** il affiche la procédure d'installation par le menu de partage, la version applicative, et une action de verrouillage qui supprime le cookie et redirige vers le déverrouillage (FR-24, FR-3).

**Commande de validation :** `npm run build && npm run lint`, puis vérifier la présence de `public/manifest.json` et l'absence de route `/api/` dans le manifeste de précache généré.

---

## Epic 2 : Journal du jour

Donner à l'application sa surface principale : le journal du jour, avec ses totaux et ses entrées, alimenté par Postgres. À l'issue de cet epic, le journal affiche des entrées et permet de les supprimer, mais rien ne permet encore d'en créer depuis l'interface.

### Story 2.1 : Affichage du journal du jour

En tant qu'utilisateur,
je veux voir les totaux de macros et le détail des entrées du jour,
afin de savoir ce que j'ai mangé sans faire le calcul moi-même.

**Critères d'acceptation :**

**Étant donné** une base Neon accessible,
**Quand** j'exécute la migration initiale,
**Alors** la table `entries` existe avec `id`, `entry_date` en `date`, `food_label` en `text`, `quantity_g`, `kcal`, `protein_g`, `carbs_g`, `fat_g` en `numeric(10,3)`, `source_kind`, `source_ref` et `created_at` en `timestamptz` (AD-1, AD-9),
**Et** aucune colonne ne porte de notion d'utilisateur (AD-7),
**Et** aucune clé étrangère ne relie `entries` à une table de référence (AD-1).

**Étant donné** des entrées présentes pour la date du jour,
**Quand** j'ouvre le journal,
**Alors** la carte de totaux affiche l'énergie et les trois macros, sommées par Postgres depuis `entries` seule (FR-4, AD-1, AD-9),
**Et** chaque ligne affiche la désignation, la quantité en grammes et l'énergie, en chiffres tabulaires (UX-DR-9).

**Étant donné** une entrée enregistrée hier à 23 h 30 heure de Paris,
**Quand** j'ouvre le journal à 00 h 30 heure de Paris,
**Alors** cette entrée n'apparaît pas dans le journal du jour, la date étant déterminée dans `Europe/Paris` par l'utilitaire unique de `src/lib/date.ts` (AD-11).

**Étant donné** aucune entrée pour la date du jour,
**Quand** j'ouvre le journal,
**Alors** le message « Aucune entrée aujourd'hui. » s'affiche et les totaux montrent zéro, sans erreur (UX-DR-6).

**Étant donné** la page du journal,
**Quand** j'inspecte son code,
**Alors** c'est un composant serveur qui n'importe aucun module client, et aucun composant client n'importe `src/server` (AD-10).

**Commande de validation :** `npm run build && npm run lint`, puis insérer deux entrées en base et vérifier que les totaux affichés en sont la somme exacte.

### Story 2.2 : Suppression d'une entrée

En tant qu'utilisateur,
je veux supprimer une entrée mal saisie,
afin que mon journal reflète ce que j'ai réellement mangé.

**Critères d'acceptation :**

**Étant donné** une entrée dans le journal du jour,
**Quand** je balaye sa ligne vers la gauche,
**Alors** une action de suppression rouge apparaît (UX-DR-8).

**Étant donné** l'action de suppression révélée,
**Quand** je la tape,
**Alors** l'entrée disparaît et les totaux se mettent à jour sans rechargement complet de la page (FR-5),
**Et** aucune confirmation n'est demandée.

**Étant donné** une requête de suppression sans session valide,
**Quand** elle atteint la route serveur,
**Alors** elle reçoit un code 401 et aucune entrée n'est supprimée (FR-2).

**Étant donné** une entrée supprimée,
**Quand** je consulte les autres entrées du journal,
**Alors** leurs macros sont inchangées (NFR-4).

**Commande de validation :** `npm run build && npm run lint`, puis supprimer une entrée depuis l'interface et vérifier que les totaux décroissent exactement de ses macros.

---

## Epic 3 : Ajout manuel d'une entrée

Rendre le journal alimentable sans aucune dépendance externe. Cet epic construit l’étape terminale commune aux trois chemins d'ajout : le pavé de quantité, le calcul de prorata et le figeage des macros. Les chemins suivants s'y brancheront.

### Story 3.1 : Saisie manuelle complète d'une entrée

En tant qu'utilisateur,
je veux saisir moi-même un aliment et ses valeurs nutritionnelles,
afin d'enregistrer n'importe quoi sans dépendre d'une base de données externe.

**Critères d'acceptation :**

**Étant donné** le journal ouvert,
**Quand** je tape le bouton d'ajout central,
**Alors** une feuille monte avec trois lignes dans cet ordre : Scanner, Rechercher, Photo, plus une entrée de saisie manuelle,
**Et** les modes non encore implémentés sont visiblement désactivés plutôt qu'absents.

**Étant donné** le formulaire de saisie manuelle,
**Quand** je renseigne un nom, l'énergie et les trois macros pour 100 g, puis une quantité,
**Alors** la validation est possible (FR-8, FR-25),
**Et** le clavier numérique s'ouvre par défaut sur les champs numériques.

**Étant donné** le champ de quantité,
**Quand** je saisis une valeur vide, nulle, négative, non numérique ou supérieure ou égale à 5000,
**Alors** la validation est bloquée avec un message explicite (FR-8).

**Étant donné** un aliment à 250 kcal pour 100 g et une quantité de 150 g,
**Quand** j'enregistre,
**Alors** l'entrée porte 375 kcal, calculées par la fonction pure de `src/lib/nutrition.ts` et écrites en `numeric(10,3)` (FR-10, AD-8, AD-9),
**Et** l'entrée conserve la désignation saisie dans `food_label` (AD-1),
**Et** `source_kind` vaut `manual` et aucune référence de source n'est posée (FR-25),
**Et** rien n'est ajouté au cache produits ni aux aliments CIQUAL (FR-25).

**Étant donné** un enregistrement réussi,
**Quand** l'opération se termine,
**Alors** je reviens au journal du jour avec les totaux à jour (UX-DR-7).

**Étant donné** le corps d'une requête d'enregistrement,
**Quand** il atteint la route serveur,
**Alors** il est validé par Zod avant tout usage, et une entrée invalide reçoit un code 400 avec un corps `{ error: { code, message } }`.

**Commande de validation :** `npm run build && npm run lint`, puis enregistrer 150 g d'un aliment à 250 kcal/100 g et vérifier que le journal affiche 375 kcal.

### Story 3.2 : Raccourcis de quantité

En tant qu'utilisateur,
je veux que les quantités que j'utilise souvent soient proposées d'un tap,
afin de ne pas ouvrir le clavier à chaque repas.

**Critères d'acceptation :**

**Étant donné** le pavé de quantité pour un aliment jamais enregistré,
**Quand** il s'ouvre,
**Alors** une puce « 100 g » est proposée (FR-9),
**Et** chaque puce mesure au moins 44 px de haut (UX-DR-3).

**Étant donné** un aliment déjà enregistré avec les quantités 150 g puis 200 g,
**Quand** j'ouvre son pavé de quantité,
**Alors** les puces 200 g et 150 g sont proposées dans cet ordre, la plus récente d'abord (FR-9),
**Et** au plus deux quantités distinctes sont proposées.

**Étant donné** un aliment de référence déclarant une portion de référence,
**Quand** j'ouvre son pavé de quantité,
**Alors** la puce de portion est proposée en premier, avec son libellé complet (FR-9).

**Étant donné** une puce de raccourci,
**Quand** je la tape,
**Alors** le champ de quantité est renseigné sans que l'entrée soit validée (FR-9, UX-DR-4).

**Commande de validation :** `npm run build && npm run lint`, puis enregistrer deux fois le même aliment avec des quantités différentes et vérifier que les deux réapparaissent en puces au troisième ajout.

---

## Epic 4 : Scan de code-barres

Livrer le chemin d'ajout prioritaire. À l'issue de cet epic, scanner un produit industriel et l'enregistrer tient en trois interactions lorsque le produit est en cache.

### Story 4.1 : Scanner caméra et décodage

En tant qu'utilisateur,
je veux scanner le code-barres d'un produit avec la caméra,
afin de ne pas avoir à le chercher dans une liste.

**Critères d'acceptation :**

**Étant donné** l'écran Scanner,
**Quand** il s'ouvre,
**Alors** le flux caméra ne démarre pas tout seul, et démarre après l'action explicite qui a mené à cet écran (FR-11),
**Et** la caméra arrière est demandée en priorité.

**Étant donné** le flux caméra actif,
**Quand** je présente un code EAN-13, EAN-8 ou UPC-A,
**Alors** `zxing-wasm` 3.1.3 le décode et la valeur obtenue est affichée (FR-11),
**Et** les autres symbologies sont ignorées.

**Étant donné** un code décodé ou une sortie d'écran,
**Quand** l'événement se produit,
**Alors** le flux vidéo est arrêté et ses pistes libérées (FR-11).

**Étant donné** un refus de la permission caméra,
**Quand** j'ouvre le scanner,
**Alors** un message explique comment la réactiver dans les réglages iOS et propose un lien vers la recherche textuelle (FR-11, UX-DR-6, AD-12).

**Étant donné** 20 secondes de flux sans décodage,
**Quand** ce délai est atteint,
**Alors** un bandeau propose la saisie manuelle du code, le flux continuant en arrière-plan (FR-11).

**Étant donné** le champ de saisie manuelle du code,
**Quand** je saisis une valeur,
**Alors** il n'accepte que des chiffres sur 8, 12 ou 13 positions (FR-16),
**Et** le code saisi suit exactement le même parcours de résolution qu'un code décodé.

**Commande de validation :** `npm run build && npm run lint`, puis présenter un code-barres au scanner en HTTPS local et vérifier que la valeur décodée s'affiche.

### Story 4.2 : Résolution d'un code-barres et cache produits

En tant qu'utilisateur,
je veux que le produit scanné soit reconnu automatiquement,
afin d'enregistrer sans rien saisir d'autre que la quantité.

**Critères d'acceptation :**

**Étant donné** la migration de cette story,
**Quand** elle est appliquée,
**Alors** la table `products` existe avec `barcode` en clé primaire `text`, `name`, `kcal_100g`, `protein_100g`, `carbs_100g`, `fat_100g` en `numeric(10,3)`, `serving_size_g`, `source` et `updated_at` (AD-8, AD-9).

**Étant donné** un code-barres décodé,
**Quand** la résolution démarre,
**Alors** le cache produits est consulté en premier via une route serveur,
**Et** un produit trouvé en cache n'engendre aucune requête vers Open Food Facts (FR-12, UX-DR-4).

**Étant donné** un code-barres absent du cache,
**Quand** la résolution se poursuit,
**Alors** la requête vers `world.openfoodfacts.org/api/v2/product/{barcode}.json` part du navigateur et non d'une route serveur (FR-13, AD-2),
**Et** aucun fichier sous `src/server` ni `src/app/api` ne mentionne ce domaine,
**Et** la requête porte un en-tête `User-Agent` identifiant l'application et restreint les champs via le paramètre `fields`.

**Étant donné** une réponse d'Open Food Facts,
**Quand** elle est interprétée,
**Alors** le succès est déterminé par `status === 1` et non par le code HTTP (FR-13, AD-3),
**Et** la fonction renvoie une variante parmi `found`, `not_found`, `incomplete` et `error` (AD-12).

**Étant donné** une requête vers Open Food Facts dépassant 8 secondes,
**Quand** le délai est atteint,
**Alors** elle est traitée comme un échec et bascule sur le parcours de produit inconnu (FR-13).

**Étant donné** un produit résolu avec succès,
**Quand** l'enregistrement du cache s'effectue,
**Alors** il est écrit dans `products` par une route serveur en `INSERT ... ON CONFLICT DO UPDATE` (FR-14),
**Et** un second scan du même code n'engendre aucune requête réseau externe.

**Étant donné** un produit résolu et une quantité choisie,
**Quand** j'enregistre,
**Alors** l'entrée porte ses macros figées et `source_kind` vaut `product` avec `source_ref` égal au code-barres (AD-1).

**Commande de validation :** `npm run build && npm run lint`, puis scanner deux fois le même produit et vérifier dans l'onglet réseau du navigateur qu'aucune requête vers Open Food Facts ne part au second scan.

### Story 4.3 : Produit inconnu ou fiche incomplète

En tant qu'utilisateur,
je veux saisir moi-même les valeurs d'un produit qu'Open Food Facts ne connaît pas,
afin qu'il soit reconnu directement au scan suivant.

**Critères d'acceptation :**

**Étant donné** une réponse d'Open Food Facts dont `status` diffère de 1,
**Quand** elle est reçue,
**Alors** le message « Produit introuvable. Saisis ses valeurs. » s'affiche (UX-DR-5, UX-DR-6),
**Et** le formulaire de saisie s'ouvre avec le code-barres prérempli et non modifiable (FR-15).

**Étant donné** une fiche trouvée dont l'énergie ou l'une des trois macros est absente,
**Quand** elle est reçue,
**Alors** elle est traitée comme incomplète et ouvre le même formulaire, les champs disponibles préremplis et les manquants signalés (FR-15, AD-3).

**Étant donné** Open Food Facts injoignable,
**Quand** l'appel échoue,
**Alors** le message « Service indisponible. Saisis les valeurs. » s'affiche et le même formulaire s'ouvre (AD-12).

**Étant donné** le formulaire de saisie d'un produit,
**Quand** je valide,
**Alors** il exige un nom, l'énergie et les trois macros pour 100 g (FR-15),
**Et** le produit rejoint le cache produits avec `source` valant `manual`,
**Et** le pavé de quantité s'ouvre dans la foulée.

**Étant donné** un produit saisi manuellement,
**Quand** je scanne à nouveau son code-barres,
**Alors** il est reconnu depuis le cache sans aucun appel réseau externe (FR-12, FR-15).

**Commande de validation :** `npm run build && npm run lint`, puis scanner un code-barres inexistant, saisir ses valeurs, et vérifier au second scan qu'il est reconnu immédiatement.

---

## Epic 5 : CIQUAL et recherche textuelle

Doter l'application de sa base d'aliments bruts et d'une recherche qui tolère les fautes de frappe et les accents manquants.

### Story 5.1 : Import de la table CIQUAL

En tant qu'utilisateur,
je veux disposer des 3200 aliments de la table CIQUAL,
afin de retrouver un aliment brut sans le saisir moi-même.

**Critères d'acceptation :**

**Étant donné** la migration de cette story,
**Quand** elle est appliquée,
**Alors** les extensions `pg_trgm` et `unaccent` sont activées (AD-6),
**Et** une fonction enveloppe marquée `IMMUTABLE` rend `unaccent` indexable,
**Et** la table `ciqual_foods` existe avec `ciqual_code` en clé primaire `text`, `name`, les quatre colonnes nutritionnelles en `numeric(10,3)` et `is_complete` en `boolean` (AD-8, AD-9),
**Et** un index GIN trigramme couvre l'expression de nom normalisée, identique à celle employée par les requêtes de recherche.

**Étant donné** le fichier CSV de l'ANSES,
**Quand** j'exécute `npx tsx scripts/import-ciqual.ts`,
**Alors** les aliments sont importés et le nombre de lignes est affiché en fin d'exécution (FR-6).

**Étant donné** un import déjà effectué,
**Quand** je relance le script,
**Alors** aucun doublon n'est créé et les lignes existantes sont mises à jour sur `ciqual_code` (FR-6).

**Étant donné** des valeurs du CSV en virgule décimale, en traces (`traces`, `< 0,1`) ou manquantes,
**Quand** elles sont importées,
**Alors** elles sont normalisées sans faire échouer l'import (FR-6).

**Étant donné** un aliment dont l'énergie ou les trois macros ne sont pas exploitables,
**Quand** il est importé,
**Alors** il est enregistré avec `is_complete` à faux et sera exclu des résultats de recherche (FR-6).

**Commande de validation :** `npx tsx scripts/import-ciqual.ts data/ciqual.csv` deux fois de suite, puis vérifier que `SELECT count(*) FROM ciqual_foods` est identique après les deux exécutions.

### Story 5.2 : Recherche textuelle d'un aliment

En tant qu'utilisateur,
je veux rechercher un aliment par son nom sans me soucier des accents,
afin de l'enregistrer en quelques frappes.

**Critères d'acceptation :**

**Étant donné** l'écran Rechercher,
**Quand** il s'ouvre,
**Alors** le champ reçoit le focus et le clavier monte.

**Étant donné** le champ de recherche,
**Quand** je saisis moins de 3 caractères,
**Alors** aucune requête n'est déclenchée (FR-7),
**Et** au-delà, la requête est temporisée de 250 ms.

**Étant donné** la table CIQUAL importée,
**Quand** je recherche « pates » sans accent,
**Alors** « Pâtes alimentaires, cuites » figure dans les résultats (FR-7).

**Étant donné** une recherche,
**Quand** les résultats reviennent,
**Alors** ils portent sur `ciqual_foods` et sur le cache produits,
**Et** ils sont classés par similarité décroissante et limités à 20 (FR-7),
**Et** chaque résultat indique sa source, « CIQUAL » ou « Scanné ».

**Étant donné** le plan d'exécution de la requête de recherche,
**Quand** je l'analyse avec `EXPLAIN`,
**Alors** l'index GIN trigramme est utilisé et aucun balayage séquentiel de `ciqual_foods` n'apparaît (AD-6, NFR-5).

**Étant donné** une recherche sans résultat,
**Quand** elle se termine,
**Alors** le message « Aucun aliment trouvé. » s'affiche, sans suggestion ni correction (UX-DR-6).

**Étant donné** un résultat de recherche,
**Quand** je le tape,
**Alors** le pavé de quantité s'ouvre, et l'enregistrement produit une entrée avec `source_kind` valant `ciqual` ou `product` (AD-1).

**Commande de validation :** `npm run build && npm run lint`, puis `EXPLAIN ANALYZE` sur la requête de recherche pour confirmer l'usage de l'index GIN.

---

## Epic 6 : Historique

Rendre les journaux passés consultables, et matérialiser dans l'interface la garantie des macros figées.

### Story 6.1 : Consultation des journaux passés

En tant qu'utilisateur,
je veux relire ce que j'ai mangé les jours précédents,
afin de savoir que ces chiffres sont exactement ceux que j'avais enregistrés.

**Critères d'acceptation :**

**Étant donné** des entrées réparties sur plusieurs dates,
**Quand** j'ouvre l'onglet Historique,
**Alors** les dates sont listées de la plus récente à la plus ancienne, avec leurs totaux de macros (FR-20),
**Et** seules les dates portant au moins une entrée apparaissent.

**Étant donné** plus de 30 dates renseignées,
**Quand** je fais défiler la liste,
**Alors** les dates suivantes sont chargées progressivement (FR-20).

**Étant donné** une date de la liste,
**Quand** je la tape,
**Alors** son détail s'affiche avec les mêmes informations que le journal du jour, en lecture seule (FR-21),
**Et** aucune suppression ni modification n'est possible depuis cet écran.

**Étant donné** une entrée créée depuis un produit, dont la fiche dans `products` est ensuite modifiée,
**Quand** je consulte le journal passé qui la contient,
**Alors** ses macros sont inchangées (FR-21, AD-1, NFR-4),
**Et** la requête d'affichage n'a joint `entries` à aucune table de référence.

**Étant donné** aucune entrée en base,
**Quand** j'ouvre l'historique,
**Alors** le message « Rien d'enregistré pour l'instant. » s'affiche (UX-DR-6).

**Commande de validation :** `npm run build && npm run lint`, puis modifier une ligne de `products` en base et vérifier que le journal passé correspondant affiche toujours les valeurs d'origine.

---

## Epic 7 : Reconnaissance d'aliments par photo

Livrer le chemin de confort, en dernier. Le modèle ne fait qu'une chose : nommer des aliments. Tout le reste reste sous le contrôle de l'utilisateur.

### Story 7.1 : Envoi d'une photo et reconnaissance

En tant qu'utilisateur,
je veux photographier mon assiette et obtenir la liste des aliments qu'elle contient,
afin de ne pas avoir à les nommer un par un.

**Critères d'acceptation :**

**Étant donné** l'écran Photo,
**Quand** je prends une photo,
**Alors** l'image est redimensionnée côté client à 1024 pixels au plus sur sa plus grande dimension avant envoi (FR-17).

**Étant donné** une image envoyée,
**Quand** elle atteint `POST /api/recognize`,
**Alors** l'appel au modèle part de `src/server/clients/mistral.ts`, seul importateur du SDK Mistral (FR-17, AD-4),
**Et** la variable `MISTRAL_API_KEY` ne porte aucun préfixe `NEXT_PUBLIC_`,
**Et** elle n'apparaît ni dans le bundle client ni dans aucune réponse HTTP (NFR-2).

**Étant donné** une image de plus de 4 Mo,
**Quand** elle atteint la route,
**Alors** elle est rejetée avec un code 413 (FR-17).

**Étant donné** une réponse du modèle,
**Quand** elle est conforme,
**Alors** la route renvoie un tableau de chaînes en français et rien d'autre (FR-17).

**Étant donné** une réponse du modèle hors format,
**Quand** elle est reçue,
**Alors** elle est traitée comme un échec de reconnaissance avec un code 422, sans propager d'erreur brute à l'interface (FR-17, AD-12).

**Étant donné** le modèle indisponible,
**Quand** l'appel échoue,
**Alors** le message « Reconnaissance indisponible. » s'affiche, la photo reste à l'écran, et un lien vers la recherche textuelle est proposé (UX-DR-6, AD-12).

**Étant donné** une reconnaissance terminée,
**Quand** le traitement s'achève,
**Alors** la photo n'est conservée ni sur disque ni en base (FR-17, NFR-3).

**Commande de validation :** `npm run build && npm run lint`, puis `grep -r "MISTRAL_API_KEY" .next/static/` ne doit rien renvoyer.

### Story 7.2 : Candidats CIQUAL et alias mémorisés

En tant qu'utilisateur,
je veux choisir l'aliment CIQUAL correspondant à chaque nom reconnu,
afin que le même plat soit résolu directement la fois suivante.

**Critères d'acceptation :**

**Étant donné** la migration de cette story,
**Quand** elle est appliquée,
**Alors** la table `food_aliases` existe avec `alias_norm` en contrainte d'unicité, `target_kind`, `target_ref` et `updated_at` (FR-19).

**Étant donné** une liste de noms reconnus,
**Quand** l'écran de résolution s'affiche,
**Alors** chaque nom porte au plus cinq candidats CIQUAL, classés par similarité décroissante (FR-18),
**Et** le rapprochement ignore les accents et la casse (AD-6).

**Étant donné** un nom sans candidat au-dessus du seuil de similarité,
**Quand** il est affiché,
**Alors** il est marqué non résolu, avec un accès direct à la recherche textuelle (FR-18, UX-DR-6),
**Et** le seuil est une constante nommée dans `src/server/services/search.ts`.

**Étant donné** un nom reconnu,
**Quand** je choisis de l'ignorer,
**Alors** aucune entrée n'est créée pour lui et l'écran passe au nom suivant (FR-18).

**Étant donné** un nom reconnu et un candidat choisi,
**Quand** je valide la quantité,
**Alors** une entrée est créée avec ses macros figées,
**Et** l'alias correspondant est créé ou mis à jour dans `food_aliases` (FR-19).

**Étant donné** un nom déjà associé à un alias,
**Quand** il est reconnu à nouveau,
**Alors** l'aliment de référence associé est proposé en tête des candidats, avec la mention « déjà choisi » (FR-19),
**Et** un nouveau choix remplace l'alias précédent, un nom ne portant jamais plus d'un alias.

**Étant donné** tous les noms traités ou ignorés,
**Quand** le dernier est résolu,
**Alors** l'application revient au journal du jour (UX-DR-7).

**Commande de validation :** `npm run build && npm run lint`, puis reconnaître deux fois la même photo et vérifier que les choix de la première session sont proposés en tête à la seconde.

---

## Validation finale

**Couverture des exigences fonctionnelles.** Les 25 exigences FR-1 à FR-25 sont couvertes par au moins une story, conformément à la carte de couverture. Aucune n'est orpheline, aucune story n'existe sans exigence associée.

**Couverture des exigences UX.** UX-DR-1 à UX-DR-10 sont couvertes. UX-DR-5 et UX-DR-6, qui portent sur la microcopie et les états, s'appliquent transversalement et sont rappelées dans les critères d'acceptation de chaque story concernée.

**Dépendances.** Chaque story ne dépend que de stories antérieures. Le pavé de quantité, construit en 3.1, est réutilisé par 4.2, 4.3, 5.2 et 7.2. La table `products`, créée en 4.2, est lue par 5.2. La fonction `unaccent` enveloppée, créée en 5.1, est utilisée par 5.2 et 7.2. Aucune story ne dépend d'une story qui la suit.

**Dimensionnement.** 15 stories, sous le plafond fixé par le cadrage. Aucune story ne crée de table dont elle n'a pas besoin.

**Limite connue.** La story 3.1 affiche des modes d'ajout désactivés pour Scanner, Rechercher et Photo, activés respectivement en 4.1, 5.2 et 7.1. C'est un choix assumé : un mode absent puis apparaissant déroute davantage à la relecture qu'un mode visiblement inactif.
