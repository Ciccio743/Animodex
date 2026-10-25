import type { Observation } from '../domain/models';

let n = 0;
/** Fabrique d'observations pour les tests (données de test, pas des observations réelles). */
export function makeObservation(partial: Partial<Observation> = {}): Observation {
  n++;
  return {
    id: `obs_test_${n}`,
    speciesId: 'inat-900001',
    observedAt: '2026-05-01T10:00:00.000Z',
    locationPrecision: 'none',
    photoIds: [],
    identificationStatus: 'confirmed',
    identificationSource: 'manual',
    createdAt: '2026-05-01T10:05:00.000Z',
    updatedAt: '2026-05-01T10:05:00.000Z',
    ...partial,
  };
}
