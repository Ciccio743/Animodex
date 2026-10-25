import type { DB } from '../db/database';
import type { AnimodexCard } from '../domain/models';

export function listCards(db: DB): Promise<AnimodexCard[]> {
  return db.getAll('cards');
}

export function getCardForSpecies(db: DB, speciesId: string): Promise<AnimodexCard | undefined> {
  return db.getFromIndex('cards', 'bySpecies', speciesId);
}
