---
name: NutriPerso
description: Registre alimentaire personnel. Sombre par défaut, pouce-first, aucune gamification.
colors:
  surface-base: '#12151A'
  surface-raised: '#1B1F26'
  surface-sunken: '#0C0E12'
  ink-primary: '#ECEFF4'
  ink-secondary: '#9AA3B2'
  ink-disabled: '#5A6274'
  accent: '#5EC08A'
  accent-pressed: '#4AA574'
  border-hairline: '#262B34'
  danger: '#D96A6A'
  macro-protein: '#7EA6E0'
  macro-carb: '#E0B87E'
  macro-fat: '#C08ED4'
typography:
  title:
    note: 'iOS Title 2 — écran, en-tête de journal'
  figure:
    note: 'iOS Title 1, chiffres tabulaires — totaux de macros'
  body:
    note: 'iOS Body — désignations d aliments, libellés'
  meta:
    note: 'iOS Footnote — quantités, sources, horodatages'
rounded:
  sm: 8px
  md: 14px
  full: 999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
---

## Identité et posture

NutriPerso est un registre, pas un coach. Cette distinction gouverne chaque décision visuelle. Aucun anneau de progression, aucune barre remplie vers un objectif, aucune couleur qui juge une valeur. L'application affiche des chiffres et n'a pas d'opinion à leur sujet.

Le produit s'utilise debout, à une main, souvent au moment du repas, sur un iPhone tenu dans la main qui ne porte pas l'assiette. La densité d'information est donc faible, les cibles tactiles sont larges, et tout ce qui compte vit dans la moitié basse de l'écran.

Le thème sombre est le thème, pas une option. Un thème clair n'est pas livré en v1.

## Couleurs

La palette est structurée en trois surfaces et un accent unique. Elle ne code jamais une valeur nutritionnelle comme bonne ou mauvaise.

- **Fond (`#12151A`)** est le canevas de tous les écrans. Sombre sans être noir, pour éviter le halo des écrans OLED en usage nocturne.
- **Surface relevée (`#1B1F26`)** porte les cartes, les lignes de journal et les champs de saisie. Elle se distingue du fond par le ton seul, jamais par une ombre.
- **Surface creusée (`#0C0E12`)** est réservée au viseur du scanner, qui doit disparaître derrière le flux vidéo.
- **Vert (`#5EC08A`)** est le seul accent. Il signale l'action principale d'un écran et rien d'autre : le bouton d'ajout central, la validation d'une entrée. Il ne décore pas, ne code aucun état, ne remplit aucun fond de texte.
- **Rouge (`#D96A6A`)** est réservé à la suppression et aux messages d'échec. Jamais à une valeur nutritionnelle.
- **Bleu, ambre, violet (`#7EA6E0`, `#E0B87E`, `#C08ED4`)** identifient respectivement protéines, glucides et lipides. Ce sont des étiquettes d'identité, pas des jugements : les trois couleurs ont une saturation et une luminosité équivalentes pour qu'aucune ne domine.

À éviter : les dégradés, les fonds colorés derrière du texte, les couleurs de sémantique nutritionnelle (vert « sain », rouge « à éviter »), et toute variante saturée de l'accent.

## Typographie

Les conventions iOS font la spécification. Les totaux de macros et les quantités utilisent des chiffres tabulaires, sans quoi les colonnes de nombres tremblent au défilement.

L'échelle est courte : quatre niveaux, pas davantage. Les titres sont rares, un seul par écran. Les désignations d'aliments sont en `body`, tronquées sur une ligne dans les listes et affichées en entier sur les écrans de détail. Aucune capitale forcée, aucun libellé en majuscules.

La typographie dynamique d'iOS est respectée à tous les niveaux. Au réglage d'accessibilité maximal, le journal reste lisible et les totaux ne se chevauchent pas.

## Mise en page et espacement

Échelle : 4 / 8 / 12 / 16 / 24 / 32 px. Marges latérales de 16 px, conformes aux conventions iOS. Colonne unique, toujours.

La règle structurante est la zone du pouce. Le tiers supérieur de l'écran ne porte que de l'information en lecture : titre de l'écran, totaux du jour. Toute cible tactile fréquente vit dans les deux tiers inférieurs. Le champ de saisie de quantité et ses raccourcis sont ancrés en bas de l'écran, au-dessus du clavier.

Les zones sûres d'iOS sont respectées : la barre d'onglets se pose au-dessus de l'indicateur d'accueil, et rien de cliquable ne s'approche de l'encoche.

## Élévation et profondeur

Aucune ombre portée pour signifier une hiérarchie. La hiérarchie vient du ton des surfaces et de la mise en page. La seule exception est le bouton d'ajout central de la barre d'onglets, qui porte une ombre douce parce qu'il déborde physiquement de la barre.

## Formes

`rounded/sm` (8 px) pour les champs, les lignes de liste et les puces de raccourci. `rounded/md` (14 px) pour les cartes et les feuilles modales. `rounded/full` uniquement pour le bouton d'ajout central. Aucune autre forme parfaitement circulaire.

## Composants

- **Carte de totaux** — En tête du journal. Surface relevée. L'énergie en `figure`, les trois macros en dessous sur une ligne, chacune précédée d'une pastille de 6 px à sa couleur. Aucun objectif, aucune barre de progression.
- **Ligne d'entrée** — Désignation en `body` tronquée sur une ligne, quantité et énergie en `meta` à droite. Séparateur en filet, pas de fond. Le balayage vers la gauche révèle la suppression en rouge.
- **Barre d'onglets** — Quatre destinations : Journal, Ajouter, Historique, Réglages. L'onglet Ajouter est un bouton circulaire vert de 56 px qui déborde vers le haut, avec une ombre douce. Les trois autres sont des icônes de 24 px avec libellé en `meta`.
- **Feuille de choix de mode** — Ouverte par le bouton d'ajout. Trois lignes pleine largeur de 64 px de haut : Scanner, Rechercher, Photo. Dans cet ordre, qui est celui de la fréquence d'usage réelle.
- **Viseur de scanner** — Flux vidéo plein écran sur surface creusée, avec un cadre de visée en filet blanc à 40 % d'opacité. Un bouton d'annulation en bas à gauche, une bascule vers la saisie manuelle du code en bas à droite. Aucun autre élément.
- **Ligne de résultat de recherche** — Désignation en `body`, source en `meta` à droite sous forme d'étiquette textuelle discrète, « CIQUAL » ou « Scanné ». Hauteur de 56 px minimum.
- **Pavé de quantité** — Ancré en bas. Un champ numérique large, et au-dessus une rangée de puces de raccourci horizontales. La portion de référence porte son libellé complet, les autres affichent le nombre suivi de « g ».
- **Puce de raccourci** — `rounded/sm`, surface relevée, texte en `body`. Hauteur de 44 px. Taper une puce remplit le champ sans valider.
- **Carte de candidat** — Écran de reconnaissance photo. Le nom reconnu en `body` sur sa propre ligne, puis les candidats en lignes sélectionnables en dessous. Un candidat issu d'un alias mémorisé porte la mention « déjà choisi » en `meta`.
- **État vide** — Une phrase en `ink-secondary`, centrée, sans illustration ni bouton d'appel à l'action.

## À faire et à ne pas faire

| À faire | À ne pas faire |
|---|---|
| Afficher les chiffres tels quels | Coder une valeur en vert ou en rouge selon un seuil |
| Un seul accent, sur l'action principale | Colorer les icônes de la barre d'onglets |
| Chiffres tabulaires pour toute valeur numérique | Chiffres proportionnels dans les listes |
| Cibles tactiles de 44 px minimum, en bas d'écran | Placer une action fréquente près de l'encoche |
| États textuels courts et factuels | Icônes d'état, points d'exclamation, encouragements |
| Filets de séparation au contraste minimal lisible | Ombres de carte, fonds colorés, dégradés |
| Thème sombre unique et assumé | Bascule clair/sombre en v1 |
