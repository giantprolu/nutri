# Gate de préparation à l'implémentation — NutriPerso

Date : 2026-09-10
Verdict : **CONCERNS**

Le plan est implémentable. Les réserves portent sur des ressources externes absentes de la machine, pas sur la cohérence des artefacts.

## Traçabilité

Les 25 exigences fonctionnelles du PRD sont couvertes par au moins une story. Aucune story n'existe sans exigence associée. Les 10 exigences de conception UX sont couvertes. Les décisions d'architecture AD-1 à AD-12 sont référencées dans les critères d'acceptation des stories qu'elles lient.

Aucune story ne dépend d'une story qui la suit. Les dépendances vérifiées : le pavé de quantité construit en 3.1 est réutilisé par 4.2, 4.3, 5.2 et 7.2 ; la table `products` créée en 4.2 est lue par 5.2 ; la fonction `unaccent` enveloppée créée en 5.1 est utilisée par 5.2 et 7.2.

## Incohérence détectée et corrigée

La story 3.1 introduisait la saisie ad hoc d'un aliment, avec `source_kind = 'manual'` et des macros tapées à la main. Aucune exigence du PRD n'enregistrait cette capacité : la saisie manuelle du PRD, FR-15, est attachée à un code-barres. C'était une story orpheline au sens du gate.

Correction appliquée avant la Phase 4 : ajout de FR-25 « Entrée ad hoc » au PRD, ajout du terme « Entrée ad hoc » au glossaire, ajout de la capacité au périmètre du MVP, et référencement de FR-25 dans les critères d'acceptation de la story 3.1.

## Réserves

**Aucune base de données.** `DATABASE_URL` n'est pas fournie. Les stories 2.1 et suivantes écrivent des migrations et des requêtes qui compilent, mais dont l'exécution ne peut pas être vérifiée. Le build et l'analyse statique restent des critères valides ; les critères d'acceptation qui exigent une vérification en base ne le sont pas.

**Aucune clé Mistral.** `MISTRAL_API_KEY` n'est pas fournie. La story 7.1 est écrite derrière une interface, l'appel réel n'est pas vérifiable.

**Fichier CSV CIQUAL absent.** La story 5.1 attend `data/ciqual.csv`, à télécharger depuis le site de l'ANSES. Le script d'import accepte un chemin en argument, ce qui rend la story implémentable sans le fichier mais non vérifiable.

**Modèle de vision non confirmé.** L'identifiant `pixtral-12b-2409` et sa disponibilité sur le niveau gratuit n'ont pas pu être vérifiés sans clé d'API. Question ouverte 4 du PRD.

**Push GitHub impossible.** Ni clé SSH ni `gh` sur la machine. La branche `bmad/dev` existe en local, les commits s'accumulent, le push est différé.

## Suite

Ces réserves relèvent toutes des règles d'arrêt prévues par le cadrage : noter dans `BLOCKERS.md`, stubber proprement derrière une interface, continuer. Aucune ne justifie de suspendre le sprint.
