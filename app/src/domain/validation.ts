import { z } from 'zod';
import type { Observation } from './models';

export const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide');

export const observationSchema = z
  .object({
    id: z.string().min(1),
    speciesId: z.string().min(1).optional(),
    observedAt: isoDate,
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    locationPrecision: z.enum(['exact', 'approximate', 'none']),
    locationLabel: z.string().max(200).optional(),
    photoIds: z.array(z.string().min(1)),
    identificationStatus: z.enum(['confirmed', 'uncertain', 'to_identify']),
    identificationConfidence: z.number().min(0).max(1).optional(),
    identificationSource: z.string().min(1),
    notes: z.string().max(5000).optional(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

export interface ValidationIssue {
  field: string;
  message: string;
}

/** Règles métier d'une observation, en plus du schéma. */
export function validateObservation(input: unknown, options: { now?: Date; knownSpeciesIds?: ReadonlySet<string> } = {}): {
  ok: boolean;
  issues: ValidationIssue[];
  value?: Observation;
} {
  const parsed = observationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ field: i.path.join('.') || '(racine)', message: i.message })),
    };
  }
  const o = parsed.data as Observation;
  const issues: ValidationIssue[] = [];
  const hasLat = o.latitude !== undefined;
  const hasLng = o.longitude !== undefined;
  if (hasLat !== hasLng) issues.push({ field: 'latitude', message: 'Latitude et longitude vont ensemble' });
  if (o.locationPrecision === 'none' && (hasLat || hasLng))
    issues.push({ field: 'locationPrecision', message: 'Une observation sans coordonnées ne peut pas avoir de latitude/longitude' });
  if (o.locationPrecision !== 'none' && !(hasLat && hasLng))
    issues.push({ field: 'locationPrecision', message: 'Une précision de position exige des coordonnées réelles' });
  if (o.identificationStatus !== 'to_identify' && !o.speciesId)
    issues.push({ field: 'speciesId', message: 'Choisis une espèce ou marque l’observation « À identifier »' });
  if (o.speciesId && options.knownSpeciesIds && !options.knownSpeciesIds.has(o.speciesId))
    issues.push({ field: 'speciesId', message: 'Espèce inconnue du catalogue' });
  const now = options.now ?? new Date();
  if (Date.parse(o.observedAt) > now.getTime() + 5 * 60_000)
    issues.push({ field: 'observedAt', message: 'La date d’observation ne peut pas être dans le futur' });
  return { ok: issues.length === 0, issues, value: issues.length === 0 ? o : undefined };
}

/** Une observation potentielle (suggestion, découverte surprise) n'est jamais une observation réelle. */
export interface SpeciesSuggestion {
  kind: 'suggestion';
  speciesId: string;
  reason: string;
  source: string;
}

export function isRealObservation(x: Observation | SpeciesSuggestion): x is Observation {
  return (x as SpeciesSuggestion).kind !== 'suggestion' && 'observedAt' in x;
}
