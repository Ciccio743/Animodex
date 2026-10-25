import type { DB } from '../db/database';
import type { Species } from '../domain/models';

export function listSpecies(db: DB): Promise<Species[]> {
  return db.getAll('species');
}

export function getSpecies(db: DB, id: string): Promise<Species | undefined> {
  return db.get('species', id);
}

/** Ajoute ou met à jour des espèces ; conserve les numéros historiques déjà rattachés. */
export async function upsertSpecies(db: DB, list: Species[]): Promise<void> {
  const tx = db.transaction('species', 'readwrite');
  for (const s of list) {
    const existing = await tx.store.get(s.id);
    await tx.store.put(existing?.legacyCardNumbers ? { ...s, legacyCardNumbers: existing.legacyCardNumbers } : s);
  }
  await tx.done;
}
