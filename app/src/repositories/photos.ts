import type { DB } from '../db/database';
import type { Photo } from '../domain/models';

export function getPhoto(db: DB, id: string): Promise<Photo | undefined> {
  return db.get('photos', id);
}

export function listPhotosForObservation(db: DB, observationId: string): Promise<Photo[]> {
  return db.getAllFromIndex('photos', 'byObservation', observationId);
}
