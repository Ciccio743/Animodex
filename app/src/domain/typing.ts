import type { AnimodexType, Species } from './models';
import { findTaxonRule } from './taxonRules';

/** Types déterminés uniquement par la taxonomie de l'espèce (voir taxonRules.ts). */
export function assignTypes(species: Pick<Species, 'taxonomy'>): { primary: AnimodexType; secondary?: AnimodexType } {
  const rule = findTaxonRule(species);
  return { primary: rule.primary, secondary: rule.secondary };
}
