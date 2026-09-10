---
name: NutriPerso
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-nutri-perso-2026-09-10/prd.md
  - _bmad-output/planning-artifacts/briefs/brief-nutri-perso-2026-09-10/brief.md
updated: 2026-09-10
---

# NutriPerso — Colonne vertébrale de l'expérience

## Fondation

Surface unique : Safari iOS en PWA installée, sur iPhone. Pas de parité Android, pas de version bureau à concevoir. Les composants viennent de daisyUI sur Tailwind, en thème sombre. `DESIGN.md` porte l'identité visuelle, ce document porte le comportement.

L'utilisation de référence est debout, à une main, au moment du repas. Cette hypothèse est plus contraignante qu'un choix esthétique : elle interdit les cibles hautes, les gestes à deux mains et les formulaires longs.

## Architecture de l'information

| Surface | Atteinte depuis | Rôle |
|---|---|---|
| Journal | Ouverture de l'application | Totaux du jour et liste des entrées |
| Choix de mode | Bouton d'ajout central | Aiguillage vers l'un des trois chemins |
| Scanner | Choix de mode | Décodage caméra d'un code-barres |
| Recherche | Choix de mode | Recherche textuelle dans CIQUAL et le cache produits |
| Photo | Choix de mode | Prise de vue et reconnaissance d'aliments |
| Saisie de quantité | Fin des trois chemins | Quantité en grammes puis enregistrement |
| Saisie manuelle de produit | Scanner, produit inconnu | Formulaire de valeurs nutritionnelles |
| Historique | Barre d'onglets | Liste des dates renseignées |
| Détail d'un jour | Ligne d'historique | Journal passé en lecture seule |
| Réglages | Barre d'onglets | Verrouillage, installation, version |
| Déverrouillage | Toute requête sans session | Saisie du mot de passe |

Barre d'onglets basse à quatre destinations : Journal, Ajouter, Historique, Réglages. Aucun tiroir, aucun menu hamburger. Les feuilles modales ne s'empilent jamais sur plus d'un niveau.

Le retour après enregistrement est toujours le journal du jour, quel que soit le chemin emprunté. C'est la boucle fermée qui donne à l'utilisateur la preuve que son geste a compté.

## Voix et ton

Microcopie. La posture générale vit dans `DESIGN.md`.

| À faire | À ne pas faire |
|---|---|
| « Produit introuvable. Saisis ses valeurs. » | « Oups ! Nous n'avons pas trouvé ce produit 😕 » |
| « 1 240 kcal aujourd'hui » | « Plus que 760 kcal avant ton objectif ! » |
| « Aucune entrée aujourd'hui. » | « Commence ta journée du bon pied ! » |
| « Code illisible. Saisis-le à la main ? » | « Erreur de décodage » |
| « Reconnaissance indisponible. » | « Erreur 503 » |
| Phrases courtes et complètes, tutoiement. | Points d'exclamation, encouragements, félicitations. |

Aucun message ne commente une valeur nutritionnelle. Aucun message ne félicite d'un enregistrement.

## Motifs de composants

Comportemental. Les spécifications visuelles vivent dans `DESIGN.md`.

| Composant | Emploi | Règles de comportement |
|---|---|---|
| Bouton d'ajout | Barre d'onglets | Ouvre la feuille de choix de mode. Ne navigue pas directement vers un chemin. |
| Feuille de choix de mode | Depuis le bouton d'ajout | Trois lignes, ordre fixe : Scanner, Rechercher, Photo. Fermeture par balayage vers le bas. |
| Ligne d'entrée | Journal, détail d'un jour | Balayage vers la gauche pour supprimer, sans confirmation. Non interactive dans l'historique. |
| Viseur de scanner | Écran Scanner | Le flux ne démarre qu'après une action explicite. S'arrête au décodage et à la sortie d'écran. |
| Champ de recherche | Écran Recherche | Recherche déclenchée à partir de 3 caractères, avec 250 ms de temporisation. Focus automatique à l'ouverture. |
| Pavé de quantité | Fin des trois chemins | Clavier numérique. Le champ reçoit le focus à l'ouverture. Validation désactivée tant que la valeur est invalide. |
| Puce de raccourci | Pavé de quantité | Remplit le champ sans valider. Ordre fixe : portion de référence, dernières quantités, 100 g. |
| Carte de candidat | Écran Photo | Sélection unique par nom reconnu. Un nom peut être ignoré. |

## Motifs d'état

| État | Surface | Traitement |
|---|---|---|
| Ouverture à froid, session valide | Journal | Journal du jour rendu côté serveur. Aucun écran de chargement intermédiaire. |
| Ouverture à froid, sans session | Déverrouillage | Champ mot de passe avec focus automatique. |
| Journal vide | Journal | « Aucune entrée aujourd'hui. » Totaux à zéro affichés, pas masqués. |
| Recherche sans résultat | Recherche | « Aucun aliment trouvé. » Aucune suggestion, aucune correction proposée. |
| Permission caméra refusée | Scanner | Explication de la réactivation dans les réglages iOS, plus un lien vers la recherche textuelle. |
| Scan sans succès après 20 s | Scanner | Bandeau proposant la saisie manuelle du code. Le flux continue en arrière-plan. |
| Produit absent d'Open Food Facts | Scanner | Bascule vers la saisie manuelle, code-barres prérempli. |
| Fiche produit incomplète | Scanner | Même bascule, champs disponibles préremplis, champs manquants signalés. |
| Open Food Facts injoignable | Scanner | « Service indisponible. Saisis les valeurs. » Même bascule. |
| Reconnaissance indisponible | Photo | Message explicite, photo conservée à l'écran, lien vers la recherche textuelle. |
| Nom reconnu sans candidat | Photo | Le nom reste affiché, marqué non résolu, avec accès direct à la recherche. |
| Hors ligne | Toute surface | Écran de repli de la coquille applicative. Aucune donnée de journal affichée depuis un cache. |
| Historique vide | Historique | « Rien d'enregistré pour l'instant. » |

## Primitives d'interaction

Le balayage vers la gauche sur une ligne d'entrée révèle la suppression. C'est le seul geste non standard de l'application.

L'appui long n'est jamais capté : il reste à la sélection de texte du système.

La navigation arrière suit le geste de balayage depuis le bord gauche d'iOS. Aucune pile de navigation personnalisée ne l'intercepte.

Aucune animation dépassant 200 ms. Aucune transition entre onglets.

Aucun geste de rafraîchissement par traction : les données viennent du serveur à chaque navigation, il n'y a rien à rafraîchir manuellement.

## Plancher d'accessibilité

Toute cible tactile mesure au moins 44 par 44 points, y compris les puces de raccourci et les icônes d'onglet.

Le contraste du texte principal sur toutes les surfaces atteint au minimum 4,5 pour 1. Les couleurs de macros ne portent jamais une information seule : elles accompagnent toujours un libellé textuel.

La typographie dynamique d'iOS est honorée à tous les niveaux. Au réglage maximal, aucun total n'est tronqué et aucune ligne d'entrée ne chevauche sa voisine.

Chaque champ porte un libellé associé. Les états d'erreur sont annoncés par du texte, pas par une couleur de bordure seule.

L'écran du scanner reste utilisable sans caméra : la saisie manuelle du code est toujours accessible, pas seulement en repli après échec.

## Parcours clés

### Parcours 1 — Ajout par scan, produit déjà connu (UJ-1)

L'objectif est trois interactions, mesurées depuis l'ouverture de l'application.

1. L'application s'ouvre sur le journal du jour, session valide. **Interaction 1 :** appui sur le bouton d'ajout central. La feuille de choix de mode monte.
2. **Interaction 2 :** appui sur « Scanner ». La caméra démarre immédiatement, l'appui sur la ligne valant le geste utilisateur explicite exigé par iOS. Le code est décodé, trouvé dans le cache produits, et le pavé de quantité s'ouvre directement sur la fiche produit.
3. La dernière quantité saisie pour ce produit est proposée en première puce. **Interaction 3 :** appui sur cette puce, puis sur Valider.

Le compte tient si la puce et la validation sont perçues comme un même geste. Si la mesure retombe à quatre, la piste à explorer est la validation implicite sur appui d'une puce, au prix d'une possibilité d'erreur.

**Cas limite.** Produit absent du cache : un appel à Open Food Facts s'intercale, avec un indicateur de chargement dans le viseur. Le parcours ne change pas, seule sa durée augmente.

### Parcours 2 — Ajout par recherche (UJ-2)

L'application s'ouvre sur le journal. Appui sur le bouton d'ajout, puis sur « Rechercher ». Le champ reçoit le focus et le clavier monte. La saisie de trois caractères déclenche la recherche, les résultats s'affichent sous le champ, classés par pertinence, avec leur source. L'appui sur un résultat ouvre le pavé de quantité. Les raccourcis proposent 100 g et les dernières quantités saisies pour cet aliment.

**Cas limite.** Aucun résultat : le message est factuel et l'utilisateur peut affiner. Aucune correction orthographique n'est proposée, la similarité trigramme absorbant déjà les fautes de frappe courantes.

### Parcours 3 — Ajout par photo (UJ-3)

Appui sur le bouton d'ajout, puis sur « Photo ». La caméra s'ouvre en mode prise de vue. Après la capture, l'image est réduite côté client puis envoyée. Un indicateur de traitement s'affiche pendant l'appel au modèle.

La réponse produit un écran de résolution : chaque nom reconnu occupe un bloc, avec ses cinq candidats en dessous. L'utilisateur choisit un candidat, ou ignore le nom. Chaque choix ouvre le pavé de quantité pour cet aliment, puis l'écran revient à la liste des noms restants. Quand tous les noms sont traités ou ignorés, l'application revient au journal.

Ce parcours est volontairement plus long que les deux autres. Il est le chemin de dernier recours et n'a pas à être optimisé.

**Cas limite.** Le modèle est indisponible ou répond hors format : le message est explicite, la photo reste affichée, et la recherche textuelle est proposée sans perdre le contexte.

### Parcours 4 — Produit inconnu (UJ-5)

Le décodage réussit, Open Food Facts répond avec un `status` différent de 1. L'application l'annonce en une phrase et ouvre le formulaire de saisie, code-barres prérempli et non modifiable. L'utilisateur recopie le nom, l'énergie et les trois macros depuis l'étiquette, pour 100 g. La validation enregistre le produit dans le cache et enchaîne sur le pavé de quantité.

C'est le seul formulaire long de l'application. Il est acceptable parce qu'il ne se produit qu'une fois par produit.

### Parcours 5 — Relecture (UJ-4)

Appui sur l'onglet Historique. La liste des dates renseignées s'affiche, la plus récente en tête, chacune avec ses totaux. L'appui sur une date ouvre son détail en lecture seule. Aucune modification n'est possible depuis l'historique, ce qui matérialise dans l'interface la règle des macros figées.

### Parcours 6 — Première ouverture et installation (UJ-6)

L'URL est ouverte dans Safari, sans session. L'écran de déverrouillage s'affiche avec le focus sur le champ. Le mot de passe correct ouvre la session et redirige vers le journal.

L'onglet Réglages porte une section expliquant l'ajout à l'écran d'accueil par le menu de partage de Safari. Ce texte est permanent et non rejetable : iOS ne permet aucune invite automatique, et la procédure est suffisamment obscure pour mériter d'être rappelée.

## Références et anti-modèles

La référence assumée est le carnet de bord, pas l'application de fitness. La densité, la sobriété et la neutralité de ton d'un relevé bancaire sont plus proches de la cible que n'importe quelle application de nutrition grand public.

Les anti-modèles sont explicites. Pas d'anneaux de progression à la Apple Fitness. Pas de séries de jours consécutifs. Pas de notation d'aliment à la Yuka. Pas de célébration d'un objectif atteint. Pas d'écran d'onboarding. Ces éléments ne sont pas seulement inutiles ici, ils contredisent la raison d'être du produit.
