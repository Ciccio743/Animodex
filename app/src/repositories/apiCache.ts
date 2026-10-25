import type { DB } from '../db/database';

/** Lecture du cache : renvoie la valeur et sa date, en signalant si elle a dépassé sa durée de validité. */
export async function readCache<T>(db: DB, key: string, ttlMs: number, now = Date.now()): Promise<{ value: T; fetchedAt: string; stale: boolean } | undefined> {
  const e = await db.get('apiCache', key);
  if (!e) return undefined;
  return { value: e.value as T, fetchedAt: e.fetchedAt, stale: now - Date.parse(e.fetchedAt) > ttlMs };
}

export async function writeCache(db: DB, key: string, value: unknown, now = new Date()): Promise<void> {
  await db.put('apiCache', { key, value, fetchedAt: now.toISOString() });
}
