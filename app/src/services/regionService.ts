import type { DB } from '../db/database';
import type { Observation } from '../domain/models';
import { readCache, writeCache } from '../repositories/apiCache';
import { reverseRegion } from './sources/nominatim';

const YEAR_MS = 365 * 24 * 3600 * 1000;

/** Coordonnées arrondies à 0,1° (~10 km) : seule cette position approximative quitte l'appareil. */
export const regionKey = (lat: number, lng: number) => `${(Math.round(lat * 10) / 10).toFixed(1)},${(Math.round(lng * 10) / 10).toFixed(1)}`;

/** Région d'une case de ~10 km, gardée en cache local (une seule requête par case). */
export async function regionOf(db: DB, key: string, signal?: AbortSignal): Promise<string | undefined> {
  const cacheKey = `region:${key}`;
  const cached = await readCache<{ name?: string }>(db, cacheKey, YEAR_MS);
  if (cached) return cached.value.name;
  const [lat, lng] = key.split(',').map(Number);
  const name = await reverseRegion(lat, lng, signal);
  await writeCache(db, cacheKey, { name });
  return name;
}

/** Cases de ~10 km des observations confirmées (avec position), et les espèces vues dans chacune. */
export function speciesByRegionKey(observations: readonly Observation[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const o of observations) {
    if (o.identificationStatus !== 'confirmed' || !o.speciesId || o.latitude === undefined || o.longitude === undefined) continue;
    const k = regionKey(o.latitude, o.longitude);
    out.set(k, (out.get(k) ?? new Set()).add(o.speciesId));
  }
  return out;
}
