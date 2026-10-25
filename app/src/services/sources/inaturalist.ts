import { fetchJson } from './http';
import { inatPlacesSchema, inatSpeciesCountsSchema, inatTaxaResponseSchema, type InatPlace, type InatTaxon } from './inatSchemas';

/**
 * Client iNaturalist (API publique v1, sans clé, CORS autorisé).
 * Recommandations de l'API respectées : ~1 requête/seconde, pas de téléchargement massif.
 */
export const INAT_API = (import.meta.env?.VITE_INATURALIST_API_URL as string | undefined) ?? 'https://api.inaturalist.org/v1';
const SOURCE = 'iNaturalist';
const OPTS = { source: SOURCE, minIntervalMs: 1000, timeoutMs: 12_000 };

/** Groupes iconiques d'animaux transmis à l'API (exclut plantes et champignons). */
export const ANIMAL_ICONIC_TAXA = ['Aves', 'Mammalia', 'Reptilia', 'Amphibia', 'Actinopterygii', 'Insecta', 'Arachnida', 'Mollusca', 'Animalia'];

export async function searchTaxa(query: string, signal?: AbortSignal): Promise<InatTaxon[]> {
  const p = new URLSearchParams({ q: query, locale: 'fr', is_active: 'true', rank: 'species', taxon_id: '1', per_page: '10' });
  const res = await fetchJson(`${INAT_API}/taxa/autocomplete?${p}`, inatTaxaResponseSchema, { ...OPTS, signal });
  return res.results;
}

/** Détails complets (ancêtres, photos, résumé Wikipédia, statut) — 30 identifiants max par requête. */
export async function getTaxa(ids: number[], signal?: AbortSignal): Promise<InatTaxon[]> {
  const out: InatTaxon[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    const res = await fetchJson(`${INAT_API}/taxa/${chunk.join(',')}?locale=fr`, inatTaxaResponseSchema, { ...OPTS, signal });
    out.push(...res.results);
  }
  return out;
}

export type DiscoveryArea =
  | { kind: 'place'; placeId: number; label: string }
  | { kind: 'point'; lat: number; lng: number; radiusKm: number; label: string };

export interface SpeciesCountsQuery {
  area: DiscoveryArea;
  /** Mois (1–12) pour la saisonnalité ; absent = toute l'année. */
  month?: number;
  iconicTaxa?: string[];
  perPage?: number;
}

/** Espèces ayant des observations de qualité « recherche » dans la zone, triées par nombre d'observations. */
export async function speciesCounts(q: SpeciesCountsQuery, signal?: AbortSignal) {
  const p = new URLSearchParams({
    quality_grade: 'research',
    locale: 'fr',
    rank: 'species',
    iconic_taxa: (q.iconicTaxa ?? ANIMAL_ICONIC_TAXA).join(','),
    per_page: String(q.perPage ?? 50),
  });
  if (q.area.kind === 'place') p.set('place_id', String(q.area.placeId));
  else {
    p.set('lat', q.area.lat.toFixed(2));
    p.set('lng', q.area.lng.toFixed(2));
    p.set('radius', String(q.area.radiusKm));
  }
  if (q.month) p.set('month', String(q.month));
  const res = await fetchJson(`${INAT_API}/observations/species_counts?${p}`, inatSpeciesCountsSchema, { ...OPTS, signal });
  return res;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<InatPlace[]> {
  const p = new URLSearchParams({ q: query, per_page: '8' });
  const res = await fetchJson(`${INAT_API}/places/autocomplete?${p}`, inatPlacesSchema, { ...OPTS, signal });
  return res.results;
}

/**
 * Tuiles « grille » d'iNaturalist : carrés colorés là où l'espèce a été observée (observations vérifiables).
 * Ce sont des observations réelles, pas une aire de répartition complète : absence de carré ≠ absence de l'animal.
 */
export function observationGridTilesUrl(taxonId: number, color: string): string {
  const p = new URLSearchParams({ taxon_id: String(taxonId), color, verifiable: 'true' });
  return `${INAT_API}/grid/{z}/{x}/{y}.png?${p}`;
}
