import { z } from 'zod';
import { fetchJson } from './http';

/** Client GBIF (API publique, sans clé). Utilisé pour rattacher une espèce à sa fiche GBIF. */
export const GBIF_API = (import.meta.env?.VITE_GBIF_API_URL as string | undefined) ?? 'https://api.gbif.org/v1';

const matchSchema = z.object({
  usageKey: z.number().optional(),
  scientificName: z.string().optional(),
  matchType: z.string(),
  confidence: z.number().optional(),
  rank: z.string().optional(),
});

/** Correspondance de nom ; renvoie la clé GBIF seulement si la correspondance est exacte et sûre. */
export async function matchGbif(scientificName: string, signal?: AbortSignal): Promise<number | undefined> {
  const p = new URLSearchParams({ name: scientificName, kingdom: 'Animalia', strict: 'true' });
  const res = await fetchJson(`${GBIF_API}/species/match?${p}`, matchSchema, { source: 'GBIF', minIntervalMs: 300, timeoutMs: 10_000, signal });
  return res.matchType === 'EXACT' && (res.confidence ?? 0) >= 90 ? res.usageKey : undefined;
}
