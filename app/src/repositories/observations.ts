import type { DB } from '../db/database';
import type { Observation } from '../domain/models';

export async function listObservations(db: DB): Promise<Observation[]> {
  const all = await db.getAllFromIndex('observations', 'byObservedAt');
  return all.reverse();
}

export function getObservation(db: DB, id: string): Promise<Observation | undefined> {
  return db.get('observations', id);
}

export function listObservationsForSpecies(db: DB, speciesId: string): Promise<Observation[]> {
  return db.getAllFromIndex('observations', 'bySpecies', speciesId);
}
