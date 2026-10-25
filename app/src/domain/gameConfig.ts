import type { Rarity } from './models';

/**
 * Paramètres des règles de jeu. Toute modification qui change le résultat pour une espèce existante
 * doit incrémenter GAME_RULES_VERSION (les cartes existantes gardent leur version d'origine).
 * Documentation : docs/GAME_RULES.md
 */
export const GAME_RULES_VERSION = 1;

/** Fourchettes de PV par rareté (statistique de jeu fictive). */
export const HP_RANGES: Record<Rarity, { min: number; max: number }> = {
  common: { min: 30, max: 50 },
  rare: { min: 60, max: 90 },
  epic: { min: 100, max: 130 },
  legendary: { min: 140, max: 180 },
};
export const HP_STEP = 5;

/**
 * Rareté selon le nombre mondial d'observations iNaturalist (seuils inclusifs, du plus observé au moins observé).
 * Critère ludique de difficulté de rencontre, figé dans la carte à sa création.
 */
export const RARITY_BY_OBSERVATIONS: { rarity: Rarity; minObservations: number }[] = [
  { rarity: 'common', minObservations: 50_000 },
  { rarity: 'rare', minObservations: 10_000 },
  { rarity: 'epic', minObservations: 1_000 },
  { rarity: 'legendary', minObservations: 0 },
];
/** Rareté attribuée si la source ne fournit pas de nombre d'observations. */
export const UNKNOWN_COUNT_RARITY: Rarity = 'rare';

/**
 * Découverte surprise : poids de tirage par rareté (transparent, modifiable).
 * Les poids s'appliquent par espèce ; ils ne coûtent rien et ne débloquent rien.
 */
export const SURPRISE_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5,
};
