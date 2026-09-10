---
title: "Product Brief : NutriPerso"
status: draft
created: 2026-09-10
updated: 2026-09-10
project_level: 2
---

# Product Brief : NutriPerso

## Résumé exécutif

NutriPerso est une application web progressive (PWA) de suivi alimentaire quotidien, conçue pour un seul utilisateur : son auteur. Elle remplace un abonnement à une application commerciale type Yazio par un outil personnel, installable sur iPhone depuis Safari, qui fait exactement ce dont son propriétaire a besoin et rien de plus : enregistrer ce qui est mangé, avec les macronutriments correspondants, et le consulter.

Le problème que résout NutriPerso n'est pas l'absence d'outil de suivi alimentaire, le marché en est saturé. C'est le coût de friction de ces outils. Les applications grand public imposent un compte, une synchronisation cloud opaque, de la publicité, un mur payant sur les fonctions élémentaires, et une base de données alimentaire de qualité inégale alimentée par les utilisateurs. Pour un usage strictement personnel, ce fardeau est disproportionné.

NutriPerso s'appuie sur deux sources de données ouvertes et complémentaires : la table CIQUAL de l'ANSES (environ 3200 aliments bruts, licence Etalab) pour les aliments non transformés, et Open Food Facts pour les produits industriels identifiés par code-barres. Trois chemins d'entrée mènent au journal : scan de code-barres dans le navigateur, reconnaissance d'aliments sur photo par un modèle de vision, et recherche textuelle. Dans les trois cas, l'utilisateur reste maître de la quantité saisie.

## Le problème

Suivre son alimentation au quotidien demande de répéter, plusieurs fois par jour, une opération qui doit être triviale : identifier un aliment, préciser une quantité, l'enregistrer. Toute friction ajoutée à cette boucle fait abandonner le suivi en quelques jours.

Les applications existantes ajoutent de la friction sur trois axes. La friction d'accès d'abord, avec création de compte, connexion, écrans d'onboarding et notifications de rétention. La friction commerciale ensuite : le scan de code-barres, qui est précisément la fonction la plus utile au quotidien, est fréquemment réservé aux abonnements payants. La friction de saisie enfin, car les bases de données propriétaires mélangent des fiches contradictoires pour un même produit et il faut arbitrer manuellement entre plusieurs entrées douteuses.

S'y ajoute un problème plus insidieux, l'instabilité de l'historique. Quand les valeurs nutritionnelles d'un journal sont calculées à la volée depuis une fiche produit collaborative, une correction apportée à cette fiche six mois plus tard réécrit rétroactivement le passé. Un historique alimentaire qui bouge tout seul n'a plus de valeur.

## La solution

Une PWA mono-utilisateur, installée sur l'écran d'accueil de l'iPhone, protégée par un mot de passe unique. Quatre écrans : le journal du jour, l'ajout d'un aliment, l'historique, les réglages.

L'ajout d'un aliment emprunte l'un de trois chemins.

**Scan de code-barres.** La caméra du téléphone est lue via getUserMedia, et le flux vidéo est décodé dans le navigateur par zxing-wasm pour les formats EAN-13, EAN-8 et UPC-A. Le code obtenu interroge l'API Open Food Facts. Cet appel part du navigateur et non du serveur : la limite de débit d'Open Food Facts est de 15 requêtes par minute et par adresse IP, et une route serveur mutualiserait l'IP de tous les appels derrière un seul quota. Chaque produit trouvé est recopié dans une table locale, qui sert de cache et rend les scans suivants instantanés et indépendants de la disponibilité du service distant. Si le produit est inconnu ou sa fiche incomplète, un formulaire de saisie manuelle prend le relais.

**Photo et reconnaissance.** Une photo du repas est envoyée à Pixtral via une route serveur Next.js, la clé d'API ne devant jamais atteindre le navigateur. Le modèle a un rôle volontairement étroit : il renvoie une liste de noms d'aliments en français, rien d'autre. Il n'estime ni quantité ni calories, parce qu'un modèle de vision n'a aucun moyen fiable d'évaluer la masse d'une portion sur une image. Chaque nom retourné est ensuite rapproché de la table CIQUAL par similarité trigramme, en ignorant les accents. Les cinq meilleurs candidats sont proposés et l'utilisateur tranche. Ce choix est mémorisé, de sorte que la même reconnaissance produira directement le bon aliment la fois suivante.

**Recherche textuelle.** Une recherche directe dans CIQUAL et dans le cache de produits scannés.

Dans les trois cas, l'utilisateur saisit lui-même les grammes ingérés. L'interface propose des raccourcis pour absorber l'essentiel de cette saisie : la portion déclarée par Open Food Facts quand elle existe, 100 g, et les deux ou trois dernières quantités saisies pour cet aliment précis.

La règle métier centrale est la suivante. Au moment de l'enregistrement, les valeurs nutritionnelles sont recopiées et figées dans la ligne de journal. Elles ne sont jamais recalculées depuis la fiche produit. L'historique est un enregistrement de faits, pas une vue dérivée.

## Ce qui rend ce produit différent

Il n'y a pas d'avantage concurrentiel ici, et il serait malhonnête d'en inventer un. NutriPerso n'a pas de concurrents, il a un seul utilisateur. Ce qui le distingue est un ensemble de choix que seul un produit sans ambition commerciale peut se permettre.

L'absence de comptes utilisateurs élimine une catégorie entière de complexité : pas d'inscription, pas de récupération de mot de passe, pas d'isolation de données entre locataires, pas d'obligations RGPD. Le refus de tout conseil nutritionnel maintient le produit hors du champ réglementaire de la santé et hors du piège du coaching algorithmique. Le périmètre fonctionnel peut rester délibérément petit, parce qu'aucune pression de marché ne pousse à l'élargir. Et le choix de sources de données ouvertes évite tout coût de licence.

Le seul risque de dépendance externe réel concerne le niveau gratuit de l'API Mistral, susceptible d'évoluer. Il est contenu par le fait que la reconnaissance photo est un confort et non un chemin critique : les deux autres modes d'ajout fonctionnent sans elle.

## Qui cela sert

Un utilisateur unique, propriétaire et développeur de l'application, qui veut savoir ce qu'il mange sans y consacrer d'attention. Il utilise l'application debout, à une main, souvent au moment du repas, sur un iPhone. Son critère de réussite est simple : enregistrer un repas doit prendre moins de temps que d'y penser.

Il connaît les valeurs nutritionnelles usuelles et n'a besoin d'aucune pédagogie. Il ne veut pas d'objectif calorique imposé, pas de notification de rappel, pas de score, pas de recommandation. Il veut un registre.

## Critères de réussite

Le suivi tient dans la durée : le journal est renseigné la plupart des jours sur plusieurs semaines consécutives, sans effort de discipline particulier. C'est le seul indicateur qui compte vraiment, parce qu'une application de suivi abandonnée au bout de dix jours a échoué quelle que soit sa qualité technique.

En corollaire mesurable, le parcours de scan et d'enregistrement tient en trois interactions depuis l'ouverture de l'application. Un produit déjà scanné une fois est retrouvé sans appel réseau. Les valeurs affichées dans l'historique sont identiques à celles enregistrées le jour même, quelles que soient les évolutions ultérieures des fiches produits.

## Périmètre

**Dans la première version.** Journal du jour avec totaux de macronutriments. Ajout d'un aliment par scan de code-barres, par recherche textuelle et par saisie manuelle. Import de la table CIQUAL. Reconnaissance d'aliments sur photo avec sélection manuelle du candidat. Historique consultable par date. Authentification par mot de passe unique. Installation PWA sur iOS.

**Explicitement hors périmètre.** Notifications push. Mode hors-ligne complet. Export de données. Graphiques d'évolution. Gestion de recettes et de plats composés. Objectifs caloriques. Suivi du poids. Toute forme de recommandation ou de coaching nutritionnel.

L'ordre de priorité est net. Le scan de code-barres et la saisie manuelle couvrent l'essentiel de l'usage réel et passent en premier. La reconnaissance photo vient après.

## Contraintes structurantes

Ces contraintes sont des données d'entrée de la conception, pas des ajustements de fin de projet.

Le stockage local d'une PWA sur iOS est purgé après sept jours sans ouverture de l'application. Postgres est donc la source de vérité et le stockage local n'est qu'un cache d'affichage : aucune donnée métier ne peut y résider seule. La synchronisation en arrière-plan n'existe pas sur iOS, donc toute écriture se fait pendant que l'application est au premier plan. L'accès à la caméra exige HTTPS et un geste utilisateur explicite pour démarrer le flux. L'installation sur l'écran d'accueil reste un geste manuel via le menu de partage de Safari, sans invite automatique possible.

Côté Open Food Facts, deux particularités méritent d'être traitées explicitement : la limite de 15 requêtes par minute et par IP, qui impose l'appel depuis le client, et le fait que l'API répond HTTP 200 même lorsque le produit est introuvable. Le seul indicateur d'échec exploitable est le champ status du corps de la réponse, dont la valeur 1 signifie que le produit a été trouvé.

## Vision

NutriPerso n'a pas de trajectoire de croissance et n'en cherche pas. Sa réussite à deux ans serait de fonctionner encore, sans maintenance notable, avec la même sobriété fonctionnelle qu'au premier jour.

Si le produit devait évoluer, ce serait vers plus de mémoire et moins de saisie : des plats composés enregistrés une fois et réutilisés, une reconnaissance photo qui s'appuie sur l'historique des choix pour proposer directement le bon aliment, une estimation de quantité fondée sur les portions habituelles de l'utilisateur plutôt que sur une analyse d'image. Toujours dans la même logique, réduire le coût d'enregistrement, jamais interpréter à la place de l'utilisateur.

---

*[ASSUMPTION] Les critères de réussite ont été inférés du contexte fourni : le cadrage d'entrée ne fixe aucun indicateur chiffré, ce qui est cohérent avec le refus explicite d'objectifs. Les seuils énoncés, trois interactions et stabilité de l'historique, reformulent des contraintes déjà présentes dans le cadrage.*
