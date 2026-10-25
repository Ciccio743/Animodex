import type { Rarity, Species } from './models';
import { HP_RANGES, HP_STEP, RARITY_BY_OBSERVATIONS, UNKNOWN_COUNT_RARITY } from './gameConfig';

/**
 * Rareté LUDIQUE fondée sur la difficulté de rencontre, estimée par le nombre mondial d'observations
 * sur iNaturalist au moment de la création de la carte (puis figée dans la carte).
 * Ce n'est ni une rareté locale, ni un statut de conservation.
 */
export function assignRarity(species: Pick<Species, 'observationsCount'>): Rarity {
  const n = species.observationsCount;
  if (n === undefined) return UNKNOWN_COUNT_RARITY;
  return RARITY_BY_OBSERVATIONS.find((t) => n >= t.minObservations)!.rarity;
}

/** PV = borne basse + variation fixe dérivée de l'identifiant du taxon (même espèce → mêmes PV). */
export function computeHp(rarity: Rarity, taxonId: number): number {
  const { min, max } = HP_RANGES[rarity];
  const steps = Math.floor((max - min) / HP_STEP) + 1;
  return min + (Math.abs(Math.trunc(taxonId)) % steps) * HP_STEP;
}
