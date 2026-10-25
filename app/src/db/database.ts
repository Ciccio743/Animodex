import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AnimodexCard, Observation, Photo, Settings, Species } from '../domain/models';

export const DB_NAME = 'animodex';
/** Version du schéma IndexedDB. Chaque incrément doit ajouter une migration dans MIGRATIONS. */
export const DB_VERSION = 2;

export interface MetaEntry {
  key: 'schemaVersion' | 'lastBackupAt' | 'lastImportAt' | 'lastArea';
  value: string | number;
}

export interface AnimodexDB extends DBSchema {
  observations: { key: string; value: Observation; indexes: { bySpecies: string; byObservedAt: string } };
  photos: { key: string; value: Photo; indexes: { byObservation: string } };
  cards: { key: string; value: AnimodexCard; indexes: { bySpecies: string; byNumber: string } };
  settings: { key: string; value: Settings };
  meta: { key: string; value: MetaEntry };
  /** Catalogue local : espèces consultées, téléchargées ou observées (données sourcées). */
  species: { key: string; value: Species; indexes: { byGroup: string } };
  /** Cache des réponses d'API (listes de zone…) avec date de récupération. */
  apiCache: { key: string; value: ApiCacheEntry };
}

export interface ApiCacheEntry {
  key: string;
  fetchedAt: string;
  value: unknown;
}

export type DB = IDBPDatabase<AnimodexDB>;

type Migration = (db: DB) => void;

/** Migrations versionnées : MIGRATIONS[n] fait passer le schéma de la version n à n+1. */
const MIGRATIONS: Record<number, Migration> = {
  0: (db) => {
    const obs = db.createObjectStore('observations', { keyPath: 'id' });
    obs.createIndex('bySpecies', 'speciesId');
    obs.createIndex('byObservedAt', 'observedAt');
    const photos = db.createObjectStore('photos', { keyPath: 'id' });
    photos.createIndex('byObservation', 'observationId');
    const cards = db.createObjectStore('cards', { keyPath: 'id' });
    cards.createIndex('bySpecies', 'speciesId', { unique: true });
    cards.createIndex('byNumber', 'cardNumber', { unique: true });
    db.createObjectStore('settings', { keyPath: 'id' });
    db.createObjectStore('meta', { keyPath: 'key' });
  },
  // v1 → v2 : catalogue local alimenté par les sources externes (le catalogue embarqué disparaît).
  1: (db) => {
    const species = db.createObjectStore('species', { keyPath: 'id' });
    species.createIndex('byGroup', 'group');
    db.createObjectStore('apiCache', { keyPath: 'key' });
  },
};

export function openAnimodexDB(name = DB_NAME): Promise<DB> {
  return openDB<AnimodexDB>(name, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      for (let v = oldVersion; v < DB_VERSION; v++) MIGRATIONS[v](db);
      void tx.objectStore('meta').put({ key: 'schemaVersion', value: DB_VERSION });
    },
  });
}

let shared: Promise<DB> | null = null;

export function getDB(): Promise<DB> {
  shared ??= openAnimodexDB();
  return shared;
}

/** Réservé aux tests : ferme et oublie la connexion partagée. */
export async function resetDBConnectionForTests(): Promise<void> {
  if (shared) (await shared).close();
  shared = null;
}
