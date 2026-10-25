import type { HabitatCode, Observation, Rarity, Species, TaxonGroup, AnimodexType } from './models';

export interface CollectionProgress {
  /** Espèces débloquées : au moins une observation confirmée. */
  discoveredSpeciesIds: Set<string>;
  /** Espèces vues mais seulement avec une identification incertaine. */
  pendingSpeciesIds: Set<string>;
  totalObservations: number;
  toIdentifyCount: number;
  catalogSize: number;
  percent: number;
  firstObservationBySpecies: Map<string, Observation>;
  lastObservationBySpecies: Map<string, Observation>;
  observationCountBySpecies: Map<string, number>;
}

function byObservedAt(a: Observation, b: Observation): number {
  return a.observedAt.localeCompare(b.observedAt) || a.createdAt.localeCompare(b.createdAt);
}

export function isDiscovery(o: Observation): o is Observation & { speciesId: string } {
  return o.identificationStatus === 'confirmed' && !!o.speciesId;
}

/** Une espèce ne compte qu'une fois, quel que soit le nombre d'observations. */
export function computeProgress(observations: readonly Observation[], catalog: readonly Species[]): CollectionProgress {
  const catalogIds = new Set(catalog.map((s) => s.id));
  const discovered = new Set<string>();
  const pending = new Set<string>();
  const first = new Map<string, Observation>();
  const last = new Map<string, Observation>();
  const counts = new Map<string, number>();
  let toIdentify = 0;

  for (const o of [...observations].sort(byObservedAt)) {
    if (o.identificationStatus === 'to_identify' || !o.speciesId) {
      toIdentify++;
      continue;
    }
    counts.set(o.speciesId, (counts.get(o.speciesId) ?? 0) + 1);
    if (isDiscovery(o)) {
      discovered.add(o.speciesId);
      if (!first.has(o.speciesId)) first.set(o.speciesId, o);
      last.set(o.speciesId, o);
    }
  }
  for (const [id] of counts) if (!discovered.has(id)) pending.add(id);

  const discoveredInCatalog = [...discovered].filter((id) => catalogIds.has(id)).length;
  return {
    discoveredSpeciesIds: discovered,
    pendingSpeciesIds: pending,
    totalObservations: observations.length,
    toIdentifyCount: toIdentify,
    catalogSize: catalog.length,
    percent: catalog.length ? Math.round((discoveredInCatalog / catalog.length) * 100) : 0,
    firstObservationBySpecies: first,
    lastObservationBySpecies: last,
    observationCountBySpecies: counts,
  };
}

export function isSpeciesKnown(speciesId: string, observations: readonly Observation[]): boolean {
  return observations.some((o) => isDiscovery(o) && o.speciesId === speciesId);
}

export interface Breakdown<K extends string> {
  key: K;
  discovered: number;
  total: number;
}

export function breakdownBy<K extends string>(
  catalog: readonly Species[],
  discovered: ReadonlySet<string>,
  keysOf: (s: Species) => K[],
): Breakdown<K>[] {
  const map = new Map<K, Breakdown<K>>();
  for (const s of catalog) {
    for (const k of keysOf(s)) {
      const b = map.get(k) ?? { key: k, discovered: 0, total: 0 };
      b.total++;
      if (discovered.has(s.id)) b.discovered++;
      map.set(k, b);
    }
  }
  return [...map.values()];
}

export type { HabitatCode, Rarity, TaxonGroup, AnimodexType };
