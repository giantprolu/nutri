/**
 * Panier de la semaine : bornes partagées. Module pur (AD-8).
 *
 * La borne vit ici et non dans le service parce que trois endroits en ont
 * besoin — le réglage de parts à l'écran, la validation du corps de requête et
 * le service — et que le premier tourne dans le navigateur, où un module
 * `server-only` ne peut pas entrer. Trois copies de la même borne finiraient
 * par diverger, et c'est l'écran qui laisserait passer ce que le serveur
 * refuse.
 */

/** Au-delà, ce n'est plus un nombre de parts mais une erreur de saisie. */
export const MAX_BASKET_SERVINGS = 20;
