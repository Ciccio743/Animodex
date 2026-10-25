import type { Ability, AnimodexType, Species } from './models';
import { findTaxonRule } from './taxonRules';

/** Capacité de repli par type si aucune capacité candidate n'existe. */
export const DEFAULT_ABILITY_BY_TYPE: Record<AnimodexType, string> = {
  water: 'plongeon',
  air: 'vol-rapide',
  earth: 'course-endurante',
  fire: 'bain-de-soleil',
  plant: 'camouflage',
  ice: 'fourrure-isolante',
  rock: 'carapace',
  shadow: 'vision-nocturne',
  light: 'parure-eclatante',
  insect: 'metamorphose',
};

/**
 * Choisit la capacité d'une espèce parmi les candidates de sa règle taxonomique :
 * 1. première candidate associée au type principal ; 2. sinon première candidate ;
 * 3. sinon capacité par défaut du type principal.
 */
export function selectAbility(species: Pick<Species, 'taxonomy'>, primaryType: AnimodexType, catalog: ReadonlyMap<string, Ability>): Ability {
  const candidates = findTaxonRule(species).abilities.map((id) => catalog.get(id)).filter((a): a is Ability => !!a);
  const chosen = candidates.find((a) => a.associatedTypes.includes(primaryType)) ?? candidates[0] ?? catalog.get(DEFAULT_ABILITY_BY_TYPE[primaryType]);
  if (!chosen) throw new Error('Aucune capacité disponible');
  return chosen;
}
