import type { LocationPrecision, Observation, Species } from './models';

/**
 * Règles de position (vie privée). Les coordonnées ne quittent jamais l'appareil ;
 * ces règles décident de ce qui est enregistré et de ce qui est affiché.
 */
/** « Approximative » : arrondi à 2 décimales, soit environ 1 km. */
export const APPROX_DECIMALS = 2;
/** Espèce sensible : affichage arrondi à 1 décimale, soit environ 10 km. */
export const SENSITIVE_DECIMALS = 1;
/** « Exacte » : 5 décimales (~1 m), au-delà ce serait une fausse précision. */
export const EXACT_DECIMALS = 5;

export function roundCoord(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Coordonnées à enregistrer selon la précision choisie. */
export function positionToStore(lat: number, lng: number, precision: Exclude<LocationPrecision, 'none'>): { latitude: number; longitude: number } {
  const d = precision === 'exact' ? EXACT_DECIMALS : APPROX_DECIMALS;
  return { latitude: roundCoord(lat, d), longitude: roundCoord(lng, d) };
}

export interface DisplayPosition {
  lat: number;
  lng: number;
  /** Rayon d'incertitude affiché, en mètres (0 = point exact). */
  radiusM: number;
  /** Vrai si la position est volontairement brouillée (espèce sensible). */
  masked: boolean;
}

/** Position à afficher sur la carte, ou rien si l'observation n'a pas de coordonnées réelles. */
export function displayPosition(o: Pick<Observation, 'latitude' | 'longitude' | 'locationPrecision'>, species?: Pick<Species, 'sensitive'>): DisplayPosition | undefined {
  if (o.locationPrecision === 'none' || o.latitude === undefined || o.longitude === undefined) return undefined;
  if (species?.sensitive)
    return { lat: roundCoord(o.latitude, SENSITIVE_DECIMALS), lng: roundCoord(o.longitude, SENSITIVE_DECIMALS), radiusM: 10_000, masked: true };
  if (o.locationPrecision === 'approximate') return { lat: o.latitude, lng: o.longitude, radiusM: 1_000, masked: false };
  return { lat: o.latitude, lng: o.longitude, radiusM: 0, masked: false };
}
