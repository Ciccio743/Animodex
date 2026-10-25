import type { DB } from '../db/database';
import type { Species, TaxonGroup } from '../domain/models';
import { getSpecies, upsertSpecies } from '../repositories/species';
import { readCache, writeCache } from '../repositories/apiCache';
import { getTaxa, speciesCounts, type DiscoveryArea } from './sources/inaturalist';
import { speciesFromInat, summaryFromInat, type TaxonSummary } from './sources/inatMapping';
import { matchGbif } from './sources/gbif';
import { notifyDataChanged } from './dataEvents';

/** Durées de validité du cache. */
export const SPECIES_TTL_MS = 30 * 86_400_000;
export const AREA_TTL_MS = 7 * 86_400_000;
export const PACK_SIZE = 200;

export const GROUP_ICONIC: Record<TaxonGroup, string[]> = {
  bird: ['Aves'],
  mammal: ['Mammalia'],
  reptile: ['Reptilia'],
  amphibian: ['Amphibia'],
  fish: ['Actinopterygii'],
  insect: ['Insecta'],
  other_invertebrate: ['Arachnida', 'Mollusca', 'Animalia'],
};

export interface EnsureResult {
  species: Species;
  /** Vrai si la fiche vient du cache local faute de réseau. */
  stale: boolean;
}

/** Garantit qu'une espèce est dans le catalogue local (récupération iNaturalist si absente ou périmée). */
export async function ensureSpecies(db: DB, taxonId: number, opts: { force?: boolean; signal?: AbortSignal } = {}): Promise<EnsureResult> {
  const id = `inat-${taxonId}`;
  const existing = await getSpecies(db, id);
  if (existing && !opts.force && Date.now() - Date.parse(existing.fetchedAt) < SPECIES_TTL_MS) return { species: existing, stale: false };
  try {
    const [taxon] = await getTaxa([taxonId], opts.signal);
    const species = taxon ? speciesFromInat(taxon) : undefined;
    if (!species) throw new Error('Ce taxon n’est pas une espèce animale.');
    // Rattachement GBIF facultatif : son échec n'empêche pas l'ajout.
    try {
      const key = await matchGbif(species.scientificName, opts.signal);
      if (key) {
        species.gbifUsageKey = key;
        species.sourceReferences = species.sourceReferences.map((r) =>
          r.label.startsWith('GBIF') ? { ...r, url: `https://www.gbif.org/species/${key}`, accessedAt: species.fetchedAt } : r,
        );
      }
    } catch {
      /* GBIF indisponible : on garde le lien de recherche */
    }
    if (existing?.gbifUsageKey && !species.gbifUsageKey) species.gbifUsageKey = existing.gbifUsageKey;
    await upsertSpecies(db, [species]);
    notifyDataChanged();
    return { species, stale: false };
  } catch (e) {
    if (existing) return { species: existing, stale: true };
    throw e;
  }
}

export interface AreaSpecies {
  summary: TaxonSummary;
  /** Nombre d'observations « recherche » dans la zone (source iNaturalist). */
  count: number;
}

export interface AreaResult {
  items: AreaSpecies[];
  totalSpecies: number;
  fetchedAt: string;
  fromCache: boolean;
  stale: boolean;
}

export function areaKey(area: DiscoveryArea): string {
  return area.kind === 'place' ? `place:${area.placeId}` : `pt:${area.lat.toFixed(2)},${area.lng.toFixed(2)}:${area.radiusKm}`;
}

/**
 * Espèces observées dans une zone (données externes, jamais ajoutées à la collection).
 * Cache 7 jours ; en cas d'échec réseau, renvoie le cache périmé s'il existe.
 */
export async function getAreaSpecies(
  db: DB,
  q: { area: DiscoveryArea; month?: number; group?: TaxonGroup },
  opts: { signal?: AbortSignal; force?: boolean } = {},
): Promise<AreaResult> {
  const key = `species_counts:${areaKey(q.area)}:m${q.month ?? 0}:${q.group ?? 'all'}`;
  const cached = await readCache<Omit<AreaResult, 'fromCache' | 'stale' | 'fetchedAt'>>(db, key, AREA_TTL_MS);
  if (cached && !cached.stale && !opts.force) return { ...cached.value, fetchedAt: cached.fetchedAt, fromCache: true, stale: false };
  try {
    const res = await speciesCounts({ area: q.area, month: q.month, iconicTaxa: q.group ? GROUP_ICONIC[q.group] : undefined, perPage: 100 }, opts.signal);
    const items = res.results
      .map((r) => ({ summary: summaryFromInat(r.taxon), count: r.count }))
      .filter((r): r is AreaSpecies => !!r.summary);
    const value = { items, totalSpecies: res.total_results ?? items.length };
    const now = new Date();
    await writeCache(db, key, value, now);
    return { ...value, fetchedAt: now.toISOString(), fromCache: false, stale: false };
  } catch (e) {
    if (cached) return { ...cached.value, fetchedAt: cached.fetchedAt, fromCache: true, stale: true };
    throw e;
  }
}

/**
 * Pack hors ligne : télécharge les fiches des espèces les plus observées d'une zone (200 max,
 * 30 par requête) dans le catalogue local. Les photos sont mises en cache à l'affichage.
 */
export async function downloadAreaPack(
  db: DB,
  area: DiscoveryArea,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<number> {
  const res = await speciesCounts({ area, perPage: PACK_SIZE }, signal);
  const ids = res.results.filter((r) => r.taxon.rank === 'species').map((r) => r.taxon.id);
  let saved = 0;
  for (let i = 0; i < ids.length; i += 30) {
    const taxa = await getTaxa(ids.slice(i, i + 30), signal);
    const list = taxa.map((t) => speciesFromInat(t)).filter((s): s is Species => !!s);
    await upsertSpecies(db, list);
    saved += list.length;
    onProgress?.(Math.min(i + 30, ids.length), ids.length);
  }
  notifyDataChanged();
  return saved;
}
