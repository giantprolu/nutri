---
title: NutriPerso
created: 2026-09-10
updated: 2026-09-10
project_level: 2
---

# PRD : NutriPerso

## 0. Objet du document

Ce PRD est le document de référence pour la conception technique et le découpage en stories de NutriPerso. Il s'appuie sur le product brief situé dans `_bmad-output/planning-artifacts/briefs/brief-nutri-perso-2026-09-10/brief.md` et ne le répète pas : le brief porte le pourquoi, ce document porte le quoi. Le vocabulaire est fixé au glossaire (§3) et employé tel quel partout ailleurs. Les fonctionnalités sont regroupées en §4, chacune portant ses exigences fonctionnelles numérotées globalement de FR-1 à FR-25. Les hypothèses inférées sans confirmation sont marquées en ligne et reprises en §9.

## 1. Vision

NutriPerso est un registre alimentaire personnel. Son propriétaire y note ce qu'il mange, avec les macronutriments correspondants, et peut le relire. Rien de plus : ni objectif, ni conseil, ni score.

L'application est une PWA installée sur l'écran d'accueil d'un iPhone, servie par Vercel, adossée à une base Postgres qui fait autorité. Elle est mono-utilisateur au sens fort du terme : il n'y a pas de notion de compte, un mot de passe unique déverrouille l'application entière.

Son enjeu de conception unique est le coût d'enregistrement d'un repas. Chaque interaction supprimée du parcours d'ajout compte davantage que n'importe quelle fonctionnalité ajoutée. C'est le critère qui arbitre tous les compromis de ce document.

## 2. Utilisateur cible

### 2.1 Jobs to be done

- Savoir ce que j'ai mangé aujourd'hui, en quantité de macronutriments, sans avoir à faire le calcul moi-même.
- Enregistrer un produit industriel que je tiens en main, en le scannant, sans le chercher dans une liste.
- Enregistrer un aliment brut cuisiné à la maison, en le retrouvant par son nom.
- Retrouver ce que j'ai mangé un jour précis, des semaines plus tard, et savoir que ces chiffres sont ceux que j'avais enregistrés.
- Ne pas payer d'abonnement, ne pas créer de compte, ne pas céder mes données alimentaires à un tiers.

### 2.2 Non-utilisateurs (v1)

Toute personne autre que le propriétaire de l'instance. Il n'y a pas de second utilisateur possible : le modèle de données ne porte aucune notion de propriétaire, et l'authentification est un secret partagé unique. Un usage à plusieurs exigerait une refonte, pas une extension.

### 2.3 Parcours utilisateurs clés

- **UJ-1. Nathan scanne un yaourt au petit-déjeuner.**
  Il est debout dans la cuisine, le pot en main. L'application est déjà déverrouillée depuis la veille. Il ouvre NutriPerso depuis l'écran d'accueil, tape le bouton d'ajout central, tape « Scanner ». La caméra démarre, il présente le code-barres, le décodage aboutit en moins d'une seconde. La fiche produit s'affiche avec sa portion déclarée. Il tape « 125 g », l'entrée est enregistrée et il revient au journal du jour, dont les totaux ont augmenté. **Cas limite :** si le produit a déjà été scanné, la fiche vient du cache local sans appel réseau et les dernières quantités saisies pour ce produit sont proposées en premier.

- **UJ-2. Nathan enregistre des pâtes cuites après le déjeuner.**
  Il vient de manger un plat cuisiné maison, aucun code-barres à scanner. Il tape le bouton d'ajout, tape « Rechercher », saisit « pates ». La recherche, insensible aux accents, remonte les entrées CIQUAL correspondantes classées par pertinence. Il choisit « Pâtes alimentaires, cuites », saisit 200 g, valide. **Cas limite :** s'il a déjà enregistré cet aliment, sa dernière quantité est proposée en raccourci et l'enregistrement tient en deux interactions.

- **UJ-3. Nathan photographie une assiette au restaurant.**
  Il ne connaît pas la composition exacte et n'a rien à scanner. Il tape le bouton d'ajout, tape « Photo », prend une photo de l'assiette. Le serveur interroge le modèle de vision, qui renvoie une liste de noms d'aliments en français. Pour chaque nom, l'application propose cinq aliments CIQUAL candidats. Il retient ceux qui correspondent, ignore les autres, et saisit une quantité pour chacun. Ses choix de correspondance sont mémorisés. **Cas limite :** si le modèle est indisponible ou répond hors format, l'application le signale et bascule sur la recherche textuelle sans perdre la photo prise.

- **UJ-4. Nathan relit la semaine écoulée.**
  Un dimanche soir, il ouvre l'historique et fait défiler les jours. Chaque jour affiche ses totaux et le détail de ses entrées. Les chiffres d'il y a trois semaines sont exactement ceux qu'il avait enregistrés, même si la fiche Open Food Facts d'un produit a été corrigée entre-temps.

- **UJ-5. Nathan scanne un produit inconnu d'Open Food Facts.**
  Le décodage réussit mais la base ne connaît pas le code, ou la fiche ne porte aucune valeur nutritionnelle exploitable. L'application le dit clairement et propose un formulaire de saisie manuelle pré-rempli avec le code-barres. Il recopie les valeurs de l'étiquette. Le produit rejoint le cache local et sera reconnu au prochain scan.

- **UJ-6. Nathan installe l'application sur son iPhone.**
  Il ouvre l'URL dans Safari, saisit le mot de passe, arrive sur le journal. Un écran de réglages lui explique comment ajouter l'application à l'écran d'accueil via le menu de partage. Une fois installée, l'application s'ouvre en plein écran et le cookie de session la garde déverrouillée.

## 3. Glossaire

- **Journal** — L'ensemble des entrées rattachées à une date donnée. Il y a exactement un journal par date, créé implicitement à la première entrée.
- **Entrée** — Une ligne du journal. Porte une date, une désignation d'aliment, une quantité en grammes, et ses macros figées. Une entrée ne dépend d'aucune autre table pour son affichage.
- **Macros** — Le quadruplet énergie (kcal), protéines (g), glucides (g), lipides (g). C'est le seul jeu de valeurs nutritionnelles suivi par le produit.
- **Macros figées** — Les macros recopiées dans une entrée au moment de son enregistrement, exprimées pour la quantité effectivement consommée. Elles ne sont jamais recalculées.
- **Aliment de référence** — Une fiche nutritionnelle exprimée pour 100 g, servant de source à une entrée. C'est un terme générique : un aliment de référence est soit un aliment CIQUAL, soit un produit.
- **Entrée ad hoc** — Une entrée dont les valeurs nutritionnelles ont été saisies directement par l'utilisateur, sans aliment de référence. Elle ne laisse aucune trace réutilisable : rien n'est ajouté au cache produits ni aux aliments CIQUAL.
- **Aliment CIQUAL** — Un aliment de référence issu de la table CIQUAL de l'ANSES, identifié par son code CIQUAL. Environ 3200 lignes, importées une fois depuis un fichier CSV.
- **Produit** — Un aliment de référence identifié par un code-barres, issu d'Open Food Facts ou saisi manuellement, et conservé dans le cache produits. La clé est le code-barres.
- **Cache produits** — La table locale des produits. Alimentée par chaque scan réussi et par chaque saisie manuelle. Elle est consultée avant tout appel réseau.
- **Code-barres** — Une chaîne numérique au format EAN-13, EAN-8 ou UPC-A, identifiant un produit.
- **Portion de référence** — Une quantité en grammes déclarée par Open Food Facts pour un produit, proposée comme raccourci de saisie quand elle existe.
- **Quantité** — La masse en grammes effectivement consommée, saisie par l'utilisateur pour chaque entrée.
- **Alias d'aliment** — L'association mémorisée entre un nom libre en français et un aliment de référence. Créé quand l'utilisateur choisit un candidat après une reconnaissance photo. Un nom libre porte au plus un alias.
- **Candidat** — Un aliment de référence proposé en réponse à un nom libre, avec son score de similarité. Une reconnaissance photo produit au plus cinq candidats par nom.
- **Session** — L'état déverrouillé de l'application, matérialisé par un cookie signé et httpOnly. Il n'y a pas d'utilisateur derrière une session, seulement la preuve que le mot de passe a été fourni.

## 4. Fonctionnalités

### 4.1 Accès et session

**Description :** L'application entière est derrière un mot de passe unique stocké en variable d'environnement. Il n'y a ni inscription, ni identifiant, ni récupération. Fournir le mot de passe ouvre une session ; toute requête sans session valide est redirigée vers l'écran de déverrouillage. Réalise UJ-6.

**Exigences fonctionnelles :**

#### FR-1 : Déverrouillage par mot de passe

L'utilisateur peut ouvrir une session en saisissant le mot de passe attendu sur l'écran de déverrouillage. Réalise UJ-6.

**Conséquences (testables) :**
- Un mot de passe correct crée un cookie de session signé, `httpOnly`, `secure` et `sameSite=lax`, puis redirige vers le journal du jour.
- Un mot de passe incorrect réaffiche l'écran de déverrouillage avec un message d'erreur et ne crée aucun cookie.
- La comparaison du mot de passe s'effectue en temps constant.
- Le mot de passe n'apparaît jamais dans un bundle client, une réponse HTTP ou un journal applicatif.

#### FR-2 : Protection des routes

Le système refuse l'accès à toute route applicative et à toute route serveur de données en l'absence de session valide.

**Conséquences (testables) :**
- Une requête de navigation sans cookie valide est redirigée vers l'écran de déverrouillage.
- Une requête vers une route serveur sans cookie valide reçoit un code 401 et aucun corps métier.
- L'écran de déverrouillage et les ressources statiques de la PWA restent accessibles sans session.

#### FR-3 : Durée et fin de session

La session persiste suffisamment longtemps pour qu'un usage quotidien ne demande jamais de ressaisie, et peut être close explicitement.

**Conséquences (testables) :**
- Le cookie de session a une durée de vie d'au moins 30 jours. `[ASSUMPTION : durée non spécifiée dans le cadrage ; 30 jours couvre un usage quotidien sans ressaisie.]`
- L'écran de réglages propose une action de verrouillage qui supprime le cookie et redirige vers l'écran de déverrouillage.

### 4.2 Journal du jour

**Description :** L'écran d'accueil de l'application. Il affiche les totaux de macros de la journée en cours et la liste de ses entrées, dans l'ordre de saisie. Chaque entrée peut être supprimée. C'est le point de retour systématique après un ajout. Réalise UJ-1, UJ-2, UJ-4.

**Exigences fonctionnelles :**

#### FR-4 : Affichage du journal du jour

L'utilisateur peut consulter, sur l'écran d'accueil, les totaux de macros et le détail des entrées de la date du jour. Réalise UJ-1.

**Conséquences (testables) :**
- Les totaux affichés sont la somme des macros figées des entrées de la date, calculée côté serveur.
- Chaque entrée affiche sa désignation, sa quantité en grammes et ses macros figées.
- Un journal sans entrée affiche un état vide explicite et des totaux à zéro, sans erreur.
- La date du jour est déterminée dans le fuseau `Europe/Paris`.

#### FR-5 : Suppression d'une entrée

L'utilisateur peut supprimer une entrée du journal.

**Conséquences (testables) :**
- La suppression retire l'entrée et met à jour les totaux affichés sans rechargement complet de la page.
- La suppression est définitive et ne demande pas de confirmation. `[ASSUMPTION : le geste est peu coûteux à refaire et une confirmation ajouterait une interaction au parcours ; à revoir si des suppressions accidentelles surviennent.]`

**Hors périmètre :**
- La modification d'une entrée existante. Supprimer et ré-ajouter suffit en v1.

### 4.3 Aliments de référence et recherche

**Description :** La table CIQUAL est importée une fois depuis le CSV de l'ANSES et constitue le socle des aliments bruts. La recherche textuelle interroge simultanément les aliments CIQUAL et le cache produits, tolère les fautes de frappe et ignore les accents grâce à la similarité trigramme. Réalise UJ-2.

**Exigences fonctionnelles :**

#### FR-6 : Import de la table CIQUAL

Le système dispose d'une commande d'import qui charge les aliments CIQUAL depuis le fichier CSV de l'ANSES.

**Conséquences (testables) :**
- L'import est idempotent : le relancer ne crée pas de doublon et met à jour les lignes existantes sur la clé du code CIQUAL.
- Les valeurs numériques du CSV utilisant la virgule décimale, les traces (`traces`, `< 0,1`) et les valeurs manquantes sont normalisées sans faire échouer l'import.
- Un aliment dont l'énergie ou les trois macros ne sont pas exploitables est importé mais marqué comme incomplet et exclu des résultats de recherche.
- Le nombre de lignes importées est affiché en fin d'exécution.

#### FR-7 : Recherche textuelle d'un aliment de référence

L'utilisateur peut rechercher un aliment de référence par son nom, parmi les aliments CIQUAL et le cache produits. Réalise UJ-2.

**Conséquences (testables) :**
- Une recherche sans accents (« pates ») remonte les aliments accentués correspondants (« Pâtes alimentaires, cuites »).
- Les résultats sont classés par similarité décroissante et limités à 20.
- Une recherche de moins de 3 caractères ne déclenche aucune requête.
- La recherche s'exécute sur un index trigramme et non par balayage de table.
- Chaque résultat indique s'il provient de CIQUAL ou du cache produits.

### 4.4 Ajout d'une entrée

**Description :** L'étape terminale commune aux trois chemins d'ajout. Une fois un aliment de référence désigné, l'utilisateur saisit la quantité en grammes. L'interface propose des raccourcis pour éviter la saisie au clavier : la portion de référence quand elle existe, 100 g, et les dernières quantités saisies pour cet aliment. À la validation, les macros sont calculées au prorata de la quantité et figées dans l'entrée. Réalise UJ-1, UJ-2, UJ-3.

**Exigences fonctionnelles :**

#### FR-8 : Saisie de la quantité

L'utilisateur peut saisir la quantité en grammes pour un aliment de référence choisi. Réalise UJ-1.

**Conséquences (testables) :**
- Le champ de quantité accepte un entier strictement positif et inférieur à 5000.
- Une quantité vide, nulle, négative ou non numérique bloque la validation avec un message explicite.
- Le clavier numérique s'ouvre par défaut sur mobile.

#### FR-9 : Raccourcis de quantité

Le système propose des quantités préremplies pour éviter la saisie clavier.

**Conséquences (testables) :**
- La portion de référence est proposée en premier lorsque l'aliment de référence est un produit qui en déclare une.
- Un raccourci « 100 g » est toujours proposé.
- Les deux dernières quantités distinctes saisies pour ce même aliment de référence sont proposées, les plus récentes d'abord.
- Taper un raccourci renseigne le champ de quantité sans valider, l'utilisateur gardant la main pour ajuster.

#### FR-10 : Enregistrement avec macros figées

L'utilisateur peut enregistrer une entrée, dont les macros sont calculées puis figées. Réalise UJ-1, UJ-2.

**Conséquences (testables) :**
- Les macros de l'entrée valent celles de l'aliment de référence pour 100 g, multipliées par la quantité et divisées par 100.
- L'entrée conserve la désignation de l'aliment au moment de l'enregistrement, en plus de la référence à sa source.
- Modifier ensuite l'aliment de référence source ne change aucune entrée déjà enregistrée. Vérifie la règle métier centrale du brief.
- Après enregistrement, l'application revient au journal du jour avec les totaux à jour.

#### FR-25 : Entrée ad hoc

L'utilisateur peut enregistrer une entrée en saisissant lui-même sa désignation et ses valeurs nutritionnelles, sans passer par un aliment de référence.

**Conséquences (testables) :**
- Le formulaire exige une désignation, l'énergie et les trois macros pour 100 g, puis une quantité.
- L'entrée créée porte `source_kind` à `manual` et aucune référence de source.
- Rien n'est ajouté au cache produits ni aux aliments CIQUAL : une entrée ad hoc ne pollue aucune table de référence.
- Les macros sont figées selon la même règle que toute autre entrée (FR-10).

**Hors périmètre :**
- La réutilisation d'une entrée ad hoc comme aliment de référence. Les raccourcis de quantité (FR-9) restent disponibles sur la désignation exacte, ce qui suffit à l'usage répété d'un même plat maison.

### 4.5 Scan de code-barres

**Description :** Le chemin d'ajout prioritaire. La caméra arrière est ouverte après un geste utilisateur explicite, le flux est décodé dans le navigateur par `zxing-wasm` pour les formats EAN-13, EAN-8 et UPC-A. Le code obtenu est cherché d'abord dans le cache produits, puis, si absent, auprès d'Open Food Facts depuis le navigateur. Réalise UJ-1, UJ-5.

**Exigences fonctionnelles :**

#### FR-11 : Ouverture de la caméra et décodage

L'utilisateur peut démarrer le scanner et obtenir un code-barres décodé depuis le flux vidéo. Réalise UJ-1.

**Conséquences (testables) :**
- Le flux caméra ne démarre qu'après une action explicite de l'utilisateur, jamais au chargement de l'écran.
- La caméra arrière est demandée en priorité.
- Le décodage accepte les formats EAN-13, EAN-8 et UPC-A, et ignore les autres symbologies.
- Le flux vidéo est arrêté et ses pistes libérées dès qu'un code est décodé ou que l'écran est quitté.
- Un refus de permission caméra affiche un message expliquant comment la réactiver et propose la recherche textuelle en repli.
- Après 20 secondes sans décodage, l'application propose explicitement la saisie manuelle du code ou la recherche textuelle.

#### FR-12 : Résolution d'un code-barres via le cache produits

Le système cherche le code-barres dans le cache produits avant tout appel réseau.

**Conséquences (testables) :**
- Un code présent dans le cache produits affiche la fiche sans aucune requête vers Open Food Facts.
- Le cache est consulté par une route serveur, la table Postgres n'étant pas accessible depuis le navigateur.

#### FR-13 : Interrogation d'Open Food Facts depuis le client

Le système interroge Open Food Facts depuis le navigateur pour un code-barres absent du cache produits. Réalise UJ-1.

**Conséquences (testables) :**
- La requête part du navigateur, à destination de `world.openfoodfacts.org/api/v2/product/{barcode}.json`, et non d'une route serveur.
- La réponse renvoyant HTTP 200 en toutes circonstances, le succès est déterminé par le champ `status` valant 1, jamais par le code HTTP.
- La requête porte un en-tête `User-Agent` identifiant l'application, conformément aux conditions d'usage de l'API.
- Un délai de réponse dépassant 8 secondes est traité comme un échec et bascule sur le parcours de produit inconnu.
- Les champs exploités sont restreints via le paramètre `fields` de l'API pour limiter le volume transféré.

#### FR-14 : Mise en cache d'un produit trouvé

Tout produit résolu avec succès est enregistré dans le cache produits.

**Conséquences (testables) :**
- Le produit est écrit dans le cache produits avec son code-barres pour clé, via une route serveur.
- Un second scan du même code n'engendre aucune requête vers Open Food Facts.
- Un produit déjà en cache est mis à jour, jamais dupliqué.

#### FR-15 : Produit inconnu ou fiche incomplète

L'utilisateur peut saisir manuellement les valeurs d'un produit qu'Open Food Facts ne connaît pas ou ne renseigne pas. Réalise UJ-5.

**Conséquences (testables) :**
- Un `status` différent de 1 ouvre le formulaire de saisie manuelle, pré-rempli avec le code-barres décodé.
- Une fiche trouvée dont l'énergie ou les trois macros sont absentes est traitée comme incomplète et ouvre le même formulaire, pré-rempli avec les valeurs disponibles.
- Le formulaire exige un nom, l'énergie et les trois macros pour 100 g.
- Le produit ainsi saisi rejoint le cache produits et est reconnu tel quel au scan suivant.

#### FR-16 : Saisie manuelle d'un code-barres

L'utilisateur peut saisir un code-barres au clavier lorsque le décodage échoue.

**Conséquences (testables) :**
- Le champ n'accepte que des chiffres, sur 8, 12 ou 13 positions.
- Le code saisi suit exactement le même parcours de résolution qu'un code décodé.

### 4.6 Reconnaissance d'aliments par photo

**Description :** Le chemin de confort, livré en dernier. Une photo part vers une route serveur Next.js qui interroge Pixtral, la clé d'API restant côté serveur. Le modèle renvoie uniquement des noms d'aliments en français, sans quantité ni calories. Chaque nom est rapproché des aliments CIQUAL par similarité trigramme, cinq candidats sont proposés, l'utilisateur tranche, et le choix devient un alias d'aliment réutilisé les fois suivantes. Réalise UJ-3.

**Exigences fonctionnelles :**

#### FR-17 : Envoi d'une photo et reconnaissance

L'utilisateur peut envoyer une photo de repas et obtenir une liste de noms d'aliments. Réalise UJ-3.

**Conséquences (testables) :**
- L'appel au modèle part exclusivement d'une route serveur ; la clé d'API n'apparaît dans aucun bundle client ni aucune réponse HTTP.
- L'image est redimensionnée côté client avant envoi, sa plus grande dimension ne dépassant pas 1024 pixels.
- La route rejette toute image de plus de 4 Mo avec un code 413.
- La route renvoie un tableau de chaînes en français, et rien d'autre.
- Une réponse du modèle non conforme au format attendu est traitée comme un échec de reconnaissance, sans propager d'erreur brute à l'interface.
- L'indisponibilité du modèle affiche un message explicite et propose la recherche textuelle en repli, sans perdre la photo.

**NFR spécifiques :**
- La photo n'est pas conservée après traitement, ni sur disque, ni en base.

#### FR-18 : Proposition de candidats

Le système propose, pour chaque nom reconnu, les aliments CIQUAL les plus proches. Réalise UJ-3.

**Conséquences (testables) :**
- Au plus cinq candidats sont proposés par nom, classés par similarité décroissante.
- Le rapprochement ignore les accents et la casse.
- Un nom sans candidat au-dessus du seuil de similarité est affiché comme non résolu, avec accès à la recherche textuelle.
- L'utilisateur peut ignorer un nom reconnu sans créer d'entrée.

#### FR-19 : Mémorisation des alias d'aliment

Le système mémorise le choix de l'utilisateur pour réutilisation. Réalise UJ-3.

**Conséquences (testables) :**
- Choisir un candidat pour un nom crée ou met à jour l'alias d'aliment correspondant.
- Une reconnaissance ultérieure produisant le même nom propose directement l'aliment de référence associé, en tête des candidats.
- Un nom libre porte au plus un alias ; un nouveau choix remplace le précédent.

### 4.7 Historique

**Description :** La consultation des journaux passés, jour par jour. Aucun graphique, aucune agrégation sur plusieurs jours. Réalise UJ-4.

**Exigences fonctionnelles :**

#### FR-20 : Liste des journaux passés

L'utilisateur peut parcourir les dates pour lesquelles des entrées existent. Réalise UJ-4.

**Conséquences (testables) :**
- Les dates sont listées de la plus récente à la plus ancienne, avec leurs totaux de macros.
- Seules les dates portant au moins une entrée apparaissent.
- La liste est paginée ou chargée progressivement au-delà de 30 dates.

#### FR-21 : Détail d'un journal passé

L'utilisateur peut ouvrir une date et consulter le détail de ses entrées. Réalise UJ-4.

**Conséquences (testables) :**
- Le détail affiche les mêmes informations que le journal du jour, en lecture seule.
- Les macros affichées sont les macros figées, identiques à celles enregistrées le jour même.

### 4.8 Socle PWA et réglages

**Description :** Les éléments qui font de l'application une PWA installable sur iOS, et l'écran de réglages qui regroupe le peu de paramètres existants. Réalise UJ-6.

**Exigences fonctionnelles :**

#### FR-22 : Installation sur l'écran d'accueil

L'utilisateur peut installer l'application sur l'écran d'accueil de son iPhone. Réalise UJ-6.

**Conséquences (testables) :**
- Un manifeste web déclare le nom, les icônes aux tailles requises par iOS, le mode d'affichage autonome et les couleurs de thème.
- Une fois installée, l'application s'ouvre sans barre d'adresse Safari.
- L'écran de réglages explique la procédure d'installation par le menu de partage, aucune invite automatique n'étant possible sur iOS.

#### FR-23 : Service worker de cache applicatif

Le système met en cache les ressources statiques de l'application, et elles seules.

**Conséquences (testables) :**
- Le service worker met en cache les ressources de la coquille applicative.
- Aucune réponse de route serveur portant des données métier n'est mise en cache.
- Une navigation hors ligne affiche un écran de repli explicite, jamais des données potentiellement périmées présentées comme à jour.

#### FR-24 : Écran de réglages

L'utilisateur peut accéder à un écran regroupant les actions et informations de configuration.

**Conséquences (testables) :**
- L'écran propose le verrouillage de session (FR-3).
- L'écran affiche la procédure d'installation PWA (FR-22).
- L'écran affiche la version applicative et la date du dernier import CIQUAL.

## 5. Non-objectifs explicites

- NutriPerso ne donne aucun conseil nutritionnel, aucune recommandation, aucun score. Un produit qui interprète l'alimentation entre dans un champ réglementaire et éditorial que ce projet refuse.
- NutriPerso ne fixe aucun objectif calorique et ne compare aucune valeur à une cible.
- NutriPerso n'est pas multi-utilisateur et ne le deviendra pas par extension.
- NutriPerso ne suit pas le poids, l'activité physique ni aucune autre mesure corporelle.
- NutriPerso n'envoie aucune notification.
- NutriPerso ne fonctionne pas hors ligne au-delà de l'affichage de sa coquille applicative.
- NutriPerso ne micronutrimente pas : ni fibres, ni sels, ni vitamines. Le quadruplet de macros est le périmètre complet.

## 6. Périmètre du MVP

### 6.1 Dans le périmètre

- Déverrouillage par mot de passe unique et protection de toutes les routes.
- Journal du jour avec totaux de macros, ajout et suppression d'entrées.
- Import de la table CIQUAL et recherche textuelle tolérante aux accents.
- Ajout par recherche textuelle, avec raccourcis de quantité.
- Ajout par saisie ad hoc, sans aliment de référence.
- Ajout par scan de code-barres, avec cache produits et repli en saisie manuelle.
- Ajout par reconnaissance photo, avec candidats CIQUAL et alias mémorisés.
- Historique consultable par date.
- Écran de réglages et installation PWA sur iOS.

### 6.2 Hors périmètre du MVP

- Notifications push. Non supportées de façon fiable dans une PWA iOS et sans usage identifié.
- Mode hors ligne complet avec écritures différées. La purge du stockage local iOS après sept jours rend une source de vérité locale non fiable.
- Export des données. `[NOTE FOR PM] La réversibilité des données est le seul élément différé qui a une vraie valeur ; un export CSV coûte peu et mérite d'être repris en v2.`
- Graphiques d'évolution et agrégations multi-jours.
- Gestion de recettes et de plats composés. Différé en v2, cité dans le brief comme la direction d'évolution la plus probable.
- Modification d'une entrée existante.
- Estimation automatique des quantités par le modèle de vision. Techniquement non fiable, explicitement écarté à la conception.

## 7. Indicateurs de réussite

**Primaires**
- **SM-1** : Persistance de l'usage. Le journal porte au moins une entrée sur la majorité des jours d'une période de six semaines consécutives. Valide l'ensemble du produit, et en particulier FR-4, FR-10.

**Secondaires**
- **SM-2** : Coût d'un ajout par scan. Le parcours de l'ouverture de l'application à l'entrée enregistrée tient en trois interactions pour un produit en cache. Valide FR-9, FR-11, FR-12.
- **SM-3** : Taux de résolution par le cache. Après quelques semaines d'usage, la majorité des scans se résolvent sans appel à Open Food Facts. Valide FR-12, FR-14.
- **SM-4** : Stabilité de l'historique. Les macros d'une entrée relue à trois semaines d'intervalle sont identiques à l'octet près. Valide FR-10, FR-21.

**Contre-indicateurs (à ne pas optimiser)**
- **SM-C1** : Nombre de fonctionnalités. Contrebalance SM-1 : la tentation naturelle face à un usage qui s'installe est d'enrichir le produit, alors que sa valeur tient à sa petitesse.
- **SM-C2** : Précision de la reconnaissance photo. Contrebalance SM-2 : investir dans la qualité du modèle détournerait l'effort du chemin qui porte l'essentiel de l'usage, le scan et la recherche.

## 8. Questions ouvertes

1. Les entrées doivent-elles porter un type de repas (petit-déjeuner, déjeuner, dîner, collation) ? Le cadrage n'en parle pas. La v1 traite le journal comme une liste chronologique plate ; ajouter un champ de repas plus tard est simple, mais réorganiser l'affichage l'est moins.
2. Le fichier CSV CIQUAL de l'ANSES doit-il être versionné dans le dépôt, ou téléchargé à l'import ? Le versionner rend l'import reproductible mais alourdit le dépôt de plusieurs mégaoctets.
3. Quelle valeur de seuil de similarité trigramme retenir pour écarter un candidat ? À calibrer empiriquement après l'import CIQUAL, une valeur trop basse noyant l'utilisateur sous des candidats absurdes.
4. Le niveau gratuit de l'API Mistral suffit-il à l'usage réel, et que se passe-t-il en cas de dépassement de quota ? À vérifier avant de livrer la reconnaissance photo.
5. Faut-il conserver un historique des produits dont la fiche Open Food Facts a été rafraîchie ? Les entrées étant figées, l'intérêt est faible, mais la question se pose pour le diagnostic.

## 9. Index des hypothèses

- §4.1, FR-3 — La durée de session est fixée à 30 jours minimum, valeur non spécifiée dans le cadrage.
- §4.2, FR-5 — La suppression d'une entrée ne demande pas de confirmation, pour ne pas allonger le parcours.
- §4.2 — Le journal est une liste chronologique plate, sans typologie de repas. Voir question ouverte 1.
- §4.4, FR-8 — Le plafond de quantité est fixé à 5000 g, borne de garde-fou et non contrainte métier.
- §4.5, FR-13 — Le délai maximal d'attente d'Open Food Facts est fixé à 8 secondes.
- §4.6, FR-17 — La photo est redimensionnée à 1024 pixels au plus et n'est jamais conservée après traitement.
- §7 — Les cibles chiffrées des indicateurs sont volontairement qualitatives, le brief refusant explicitement les objectifs chiffrés.

## 10. NFR transverses

- **Plateforme.** Cible unique : Safari iOS sur iPhone, en mode PWA installée. Le fonctionnement sur navigateur de bureau est utile au développement mais n'est pas une exigence produit.
- **Sécurité.** Aucun secret dans le bundle client. La clé d'API du modèle de vision et l'URL de la base de données ne sont lues que côté serveur. Le mot de passe applicatif n'est jamais journalisé.
- **Confidentialité.** Aucune donnée de journal ne quitte l'infrastructure du projet. Les seuls appels sortants sont la consultation d'Open Food Facts, qui ne transmet qu'un code-barres, et l'envoi d'une photo au modèle de vision, à l'initiative explicite de l'utilisateur.
- **Intégrité.** Les macros figées sont la garantie centrale du produit. Aucune fonctionnalité ne peut réécrire les macros d'une entrée existante.
- **Performance.** Le journal du jour s'affiche en moins d'une seconde sur une connexion mobile ordinaire. La recherche textuelle répond en moins de 300 ms côté serveur, ce qui suppose un index trigramme et exclut tout balayage de table.
- **Accessibilité tactile.** Toute cible tactile mesure au moins 44 pixels de côté. Aucun contrôle critique n'est placé dans le tiers supérieur de l'écran.
- **Qualité de code.** TypeScript strict, aucun `any`. La compilation et l'analyse statique passent sans avertissement, condition d'acceptation de chaque story.
- **Coût.** L'ensemble doit tenir dans les niveaux gratuits de Vercel, Neon et Mistral. Aucun composant payant n'est acceptable pour un usage personnel.
