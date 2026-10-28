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

const reverseSchema = z.object({
  address: z
    .object({ state: z.string().optional(), region: z.string().optional(), county: z.string().optional(), country: z.string().optional() })
    .optional(),
});

/**
 * Région administrative d'un point (ex. « Auvergne-Rhône-Alpes »), à partir de coordonnées
 * arrondies par l'appelant. Hors de France, l'équivalent (État, province) ou à défaut le pays.
 */
export async function reverseRegion(lat: number, lng: number, signal?: AbortSignal): Promise<string | undefined> {
  const url = `${NOMINATIM_API}/reverse?format=jsonv2&zoom=5&accept-language=fr&lat=${lat}&lon=${lng}`;
  const res = await fetchJson(url, reverseSchema, { source: 'OpenStreetMap', minIntervalMs: 1100, signal });
  const a = res.address;
  return a?.state ?? a?.region ?? a?.county ?? a?.country;
}
