import type { AnimodexType, Rarity, Species, TaxonGroup } from './models';
import { SURPRISE_WEIGHTS } from './gameConfig';
import { assignRarity } from './rarity';
import { assignTypes } from './typing';
import { normalize } from '../utils/format';

export interface SpeciesFilter {
  query?: string;
  group?: TaxonGroup;
  type?: AnimodexType;
  rarity?: Rarity;
}

export function matchesQuery(names: (string | undefined)[], query: string): boolean {
  const q = normalize(query);
  return names.some((n) => !!n && normalize(n).includes(q));
}

export function matchesFilter(s: Species, f: SpeciesFilter): boolean {
  if (f.group && s.group !== f.group) return false;
  if (f.type) {
    const t = assignTypes(s);
    if (t.primary !== f.type && t.secondary !== f.type) return false;
  }
  if (f.rarity && assignRarity(s) !== f.rarity) return false;
  if (f.query && !matchesQuery([s.frenchName, s.scientificName, ...s.commonNames], f.query)) return false;
  return true;
}

/** Niveau de confiance d'une suggestion de zone, d'après le nombre d'observations validées. */
export function areaConfidence(count: number): { level: 'high' | 'medium' | 'low'; label: string } {
  if (count >= 20) return { level: 'high', label: 'souvent observée dans la zone' };
  if (count >= 5) return { level: 'medium', label: 'observée régulièrement dans la zone' };
  return { level: 'low', label: 'rarement observée dans la zone' };
}

export interface SurpriseResult<T> {
  item: T;
  rarity: Rarity;
  /** Probabilité réelle de ce tirage parmi les candidats. */
  probability: number;
  candidates: number;
}

/**
 * Découverte surprise : tire un animal À RECHERCHER, pondéré par rareté ludique.
 * Ne crée aucune observation et ne débloque aucune carte.
 */
export function pickSurprise<T>(pool: readonly T[], rarityOf: (t: T) => Rarity, rng: () => number = Math.random): SurpriseResult<T> | undefined {
  if (pool.length === 0) return undefined;
  const weighted = pool.map((item) => {
    const r = rarityOf(item);
    return { item, r, w: SURPRISE_WEIGHTS[r] };
  });
  const total = weighted.reduce((t, x) => t + x.w, 0);
  let roll = rng() * total;
  let chosen = weighted[weighted.length - 1];
  for (const x of weighted) {
    roll -= x.w;
    if (roll < 0) {
      chosen = x;
      break;
    }
  }
  return { item: chosen.item, rarity: chosen.r, probability: chosen.w / total, candidates: pool.length };
}
