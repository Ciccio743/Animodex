import type { DB, MetaEntry } from '../db/database';
import { DEFAULT_SETTINGS, type Settings } from '../domain/models';

export async function getSettings(db: DB): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.get('settings', 'settings')) };
}

export async function saveSettings(db: DB, patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const next = { ...(await getSettings(db)), ...patch, id: 'settings' as const };
  await db.put('settings', next);
  return next;
}

export async function getMeta(db: DB, key: MetaEntry['key']): Promise<MetaEntry['value'] | undefined> {
  return (await db.get('meta', key))?.value;
}

export async function setMeta(db: DB, key: MetaEntry['key'], value: MetaEntry['value']): Promise<void> {
  await db.put('meta', { key, value });
}
