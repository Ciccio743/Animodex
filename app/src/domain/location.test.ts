import { describe, expect, it } from 'vitest';
import { displayPosition, positionToStore, roundCoord } from './location';

describe('positions et vie privée', () => {
  it('« approximative » arrondit à ~1 km, « exacte » garde ~1 m', () => {
    expect(positionToStore(45.764043, 4.835659, 'approximate')).toEqual({ latitude: 45.76, longitude: 4.84 });
    expect(positionToStore(45.7640432, 4.8356591, 'exact')).toEqual({ latitude: 45.76404, longitude: 4.83566 });
    expect(roundCoord(-0.125, 2)).toBe(-0.12);
  });

  it('pas de coordonnées = rien sur la carte', () => {
    expect(displayPosition({ locationPrecision: 'none' })).toBeUndefined();
    expect(displayPosition({ locationPrecision: 'exact', latitude: 45 })).toBeUndefined();
  });

  it('point exact, zone de 1 km pour une position approximative', () => {
    expect(displayPosition({ locationPrecision: 'exact', latitude: 45.76404, longitude: 4.83566 })).toEqual({ lat: 45.76404, lng: 4.83566, radiusM: 0, masked: false });
    expect(displayPosition({ locationPrecision: 'approximate', latitude: 45.76, longitude: 4.84 })?.radiusM).toBe(1000);
  });

  it('espèce sensible : position toujours floutée à ~10 km, même si elle est exacte', () => {
    const d = displayPosition({ locationPrecision: 'exact', latitude: 45.76404, longitude: 4.83566 }, { sensitive: true });
    expect(d).toEqual({ lat: 45.8, lng: 4.8, radiusM: 10_000, masked: true });
  });
});
