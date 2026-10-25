import { z } from 'zod';
import { fetchJson } from './http';

/**
 * Recherche de lieu OpenStreetMap (Nominatim). Politique d'usage respectée :
 * 1 requête par seconde au plus, uniquement sur action (pas d'autocomplétion), attribution OSM.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

const resultSchema = z.array(
  z.object({
    display_name: z.string(),
    lat: z.coerce.number(),
    lon: z.coerce.number(),
  }),
);

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

export async function searchPlace(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = `${NOMINATIM_API}/search?format=jsonv2&limit=5&accept-language=fr&q=${encodeURIComponent(query.trim())}`;
  const res = await fetchJson(url, resultSchema, { source: 'OpenStreetMap', minIntervalMs: 1100, signal });
  return res.map((r) => ({ label: r.display_name, lat: r.lat, lng: r.lon }));
}
