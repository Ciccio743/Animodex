import { z } from 'zod';
import type { DB } from '../db/database';
import type { AnimodexCard, Observation, Photo, Settings, Species } from '../domain/models';
import { ANIMODEX_TYPES, RARITIES, DEFAULT_SETTINGS, TAXON_GROUPS, displayName } from '../domain/models';
import { isoDate, observationSchema, validateObservation } from '../domain/validation';
import { generateCard } from '../domain/cards';
import { CARD_FINISHES } from '../domain/finishes';
import { ABILITY_MAP } from '../data/abilities';
import { setMeta } from '../repositories/settings';
import { notifyDataChanged } from './dataEvents';

export const BACKUP_FORMAT = 'animodex-backup';
export const BACKUP_SCHEMA_VERSION = 2;

/** Espèce du catalogue : champs indispensables validés, le reste conservé tel quel (données sourcées). */
const speciesSchema = z
  .object({
    id: z.string().regex(/^inat-\d+$/),
    cardNumber: z.string().regex(/^AX-\d+$/),
    inatTaxonId: z.number().int().positive(),
    scientificName: z.string().min(1),
    rank: z.string(),
    frenchName: z.string().optional(),
    commonNames: z.array(z.string()),
    group: z.enum(TAXON_GROUPS),
    taxonomy: z.record(z.string()),
    habitats: z.array(z.string()),
    adaptations: z.array(z.string()),
    media: z.array(
      z.object({ id: z.string(), speciesId: z.string(), url: z.string().url(), license: z.string().min(1), attribution: z.string().min(1), source: z.string() }).passthrough(),
    ),
    sensitive: z.boolean(),
    sourceReferences: z.array(z.object({ label: z.string(), url: z.string() }).passthrough()),
    fetchedAt: isoDate,
  })
  .passthrough()
  .refine((s) => s.id === `inat-${s.inatTaxonId}` && s.cardNumber === `AX-${s.inatTaxonId}`, 'Identifiant ou numéro de carte incohérent');

const cardSchema = z
  .object({
    id: z.string().min(1),
    speciesId: z.string().min(1),
    cardNumber: z.string().min(1),
    primaryType: z.enum(ANIMODEX_TYPES),
    secondaryType: z.enum(ANIMODEX_TYPES).optional(),
    rarity: z.enum(RARITIES),
    baseHp: z.number().int().positive(),
    abilityId: z.string().min(1),
    visualVariant: z.string(),
    finish: z.enum(CARD_FINISHES).optional(),
    finishesFound: z.array(z.enum(CARD_FINISHES)).optional(),
    rulesVersion: z.number().int().positive(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const photoSchema = z
  .object({
    id: z.string().min(1),
    observationId: z.string().min(1),
    mimeType: z.string().regex(/^image\//),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    source: z.enum(['camera', 'import']),
    createdAt: isoDate,
    data: z.string().min(1),
    thumbData: z.string().min(1),
  })
  .strict();

const settingsSchema = z
  .object({
    id: z.literal('settings'),
    locationPermission: z.enum(['unknown', 'granted', 'denied']),
    defaultLocationPrecision: z.enum(['exact', 'approximate', 'none']),
    autoLocate: z.boolean().optional(),
    units: z.enum(['metric', 'imperial']),
    language: z.literal('fr'),
    reducedMotion: z.enum(['system', 'reduce', 'full']),
    textScale: z.enum(['normal', 'large']),
    dataStorageMode: z.literal('local'),
  })
  .strict();

export const backupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    schemaVersion: z.number().int(),
    exportedAt: isoDate,
    app: z.object({ name: z.literal('Animodex'), version: z.string() }),
    data: z.object({
      species: z.array(speciesSchema),
      observations: z.array(observationSchema),
      cards: z.array(cardSchema),
      photos: z.array(photoSchema),
      settings: settingsSchema.optional(),
    }),
  })
  .strict();

export type BackupFile = z.infer<typeof backupSchema>;
type SerializedPhoto = z.infer<typeof photoSchema>;

// --- Encodage des images -------------------------------------------------------------

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

// --- Export --------------------------------------------------------------------------

export async function buildBackup(db: DB, now = new Date()): Promise<BackupFile> {
  const [species, observations, cards, photos, settings] = await Promise.all([
    db.getAll('species'),
    db.getAll('observations'),
    db.getAll('cards'),
    db.getAll('photos'),
    db.get('settings', 'settings'),
  ]);
  const serialized: SerializedPhoto[] = [];
  for (const p of photos) {
    serialized.push({
      id: p.id,
      observationId: p.observationId,
      mimeType: p.mimeType,
      width: p.width,
      height: p.height,
      source: p.source,
      createdAt: p.createdAt,
      data: await blobToBase64(p.blob),
      thumbData: await blobToBase64(p.thumbBlob),
    });
  }
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    app: { name: 'Animodex', version: __APP_VERSION__ },
    data: { species: species as unknown as BackupFile['data']['species'], observations, cards, photos: serialized, settings },
  };
}

export async function markBackupDone(db: DB, now = new Date()): Promise<void> {
  await setMeta(db, 'lastBackupAt', now.toISOString());
  notifyDataChanged();
}

// --- Validation ----------------------------------------------------------------------

export interface ParseResult {
  ok: boolean;
  errors: string[];
  backup?: BackupFile;
}

/** Valide entièrement un fichier de sauvegarde, sans rien écrire. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Le fichier n’est pas un JSON valide.'] };
  }
  const head = z.object({ format: z.string(), schemaVersion: z.number() }).safeParse(json);
  if (!head.success || head.data.format !== BACKUP_FORMAT)
    return { ok: false, errors: ['Ce fichier n’est pas une sauvegarde Animodex.'] };
  if (head.data.schemaVersion < 2)
    return { ok: false, errors: ['Ancien format (catalogue de démonstration) : incompatible avec le catalogue issu des sources libres.'] };
  if (head.data.schemaVersion > BACKUP_SCHEMA_VERSION)
    return {
      ok: false,
      errors: [`Sauvegarde créée par une version plus récente (schéma ${head.data.schemaVersion}). Mets l’application à jour.`],
    };
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success)
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.')} : ${i.message}`),
    };
  const b = parsed.data;
  const errors: string[] = [];
  const speciesById = new Map(b.data.species.map((x) => [x.id, x]));
  const obsIds = new Set<string>();
  for (const o of b.data.observations) {
    if (obsIds.has(o.id)) errors.push(`Observation en double : ${o.id}`);
    obsIds.add(o.id);
    const v = validateObservation(o, { knownSpeciesIds: new Set(speciesById.keys()), now: new Date(8.64e15) });
    for (const i of v.issues) errors.push(`Observation ${o.id} — ${i.field} : ${i.message}`);
  }
  const photoIds = new Set(b.data.photos.map((p) => p.id));
  for (const p of b.data.photos)
    if (!obsIds.has(p.observationId)) errors.push(`Photo ${p.id} rattachée à une observation absente.`);
  for (const o of b.data.observations)
    for (const pid of o.photoIds) if (!photoIds.has(pid)) errors.push(`Observation ${o.id} : photo ${pid} absente du fichier.`);
  const cardSpecies = new Set<string>();
  for (const c of b.data.cards) {
    const sp = speciesById.get(c.speciesId);
    if (!sp) errors.push(`Carte ${c.id} : espèce inconnue ${c.speciesId}.`);
    else if (sp.cardNumber !== c.cardNumber)
      errors.push(`Carte ${c.id} : numéro ${c.cardNumber} différent du numéro stable ${sp.cardNumber}.`);
    if (cardSpecies.has(c.speciesId)) errors.push(`Deux cartes pour l’espèce ${c.speciesId}.`);
    cardSpecies.add(c.speciesId);
    if (!ABILITY_MAP.has(c.abilityId)) errors.push(`Carte ${c.id} : capacité inconnue ${c.abilityId}.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [], backup: b };
}

// --- Prévisualisation ----------------------------------------------------------------

export interface ImportPreview {
  observations: { added: number; updated: number; unchanged: number; keptLocal: number };
  species: { added: number; existing: number };
  cards: { added: number; existing: number };
  photos: { added: number; existing: number };
  current: { observations: number; cards: number; photos: number };
  exportedAt: string;
}

export async function previewImport(db: DB, b: BackupFile): Promise<ImportPreview> {
  const [obs, cards, photoKeys, speciesKeys] = await Promise.all([
    db.getAll('observations'),
    db.getAll('cards'),
    db.getAllKeys('photos'),
    db.getAllKeys('species'),
  ]);
  const localSpecies = new Set(speciesKeys);
  const localObs = new Map(obs.map((o) => [o.id, o]));
  const localCardSpecies = new Set(cards.map((c) => c.speciesId));
  const localPhotos = new Set(photoKeys);
  const p: ImportPreview = {
    observations: { added: 0, updated: 0, unchanged: 0, keptLocal: 0 },
    species: { added: 0, existing: 0 },
    cards: { added: 0, existing: 0 },
    photos: { added: 0, existing: 0 },
    current: { observations: obs.length, cards: cards.length, photos: photoKeys.length },
    exportedAt: b.exportedAt,
  };
  for (const o of b.data.observations) {
    const l = localObs.get(o.id);
    if (!l) p.observations.added++;
    else if (l.updatedAt === o.updatedAt) p.observations.unchanged++;
    else if (o.updatedAt > l.updatedAt) p.observations.updated++;
    else p.observations.keptLocal++;
  }
  for (const x of b.data.species) localSpecies.has(x.id) ? p.species.existing++ : p.species.added++;
  for (const c of b.data.cards) localCardSpecies.has(c.speciesId) ? p.cards.existing++ : p.cards.added++;
  for (const ph of b.data.photos) localPhotos.has(ph.id) ? p.photos.existing++ : p.photos.added++;
  return p;
}

// --- Import --------------------------------------------------------------------------

export type ImportMode = 'merge' | 'replace';

/**
 * Applique une sauvegarde déjà validée, dans UNE transaction : en cas d'erreur, rien n'est modifié.
 * - merge : ajoute ce qui manque ; pour une même observation, la version la plus récente gagne ;
 *   les cartes existantes sont conservées.
 * - replace : efface puis restaure (identifiants conservés). À n'appeler qu'après confirmation explicite.
 */
export async function applyImport(db: DB, b: BackupFile, mode: ImportMode, now = new Date()): Promise<void> {
  const photos: Photo[] = b.data.photos.map((p) => ({
    id: p.id,
    observationId: p.observationId,
    mimeType: p.mimeType,
    width: p.width,
    height: p.height,
    source: p.source,
    createdAt: p.createdAt,
    blob: base64ToBlob(p.data, p.mimeType),
    thumbBlob: base64ToBlob(p.thumbData, 'image/jpeg'),
  }));

  const tx = db.transaction(['observations', 'photos', 'cards', 'settings', 'meta', 'species'], 'readwrite');
  const speciesStore = tx.objectStore('species');
  const obsStore = tx.objectStore('observations');
  const photoStore = tx.objectStore('photos');
  const cardStore = tx.objectStore('cards');

  if (mode === 'replace') {
    await Promise.all([obsStore.clear(), photoStore.clear(), cardStore.clear(), speciesStore.clear(), tx.objectStore('settings').clear()]);
  }
  // Catalogue : on garde la fiche locale la plus récente.
  for (const sp of b.data.species as unknown as Species[]) {
    const local = mode === 'merge' ? await speciesStore.get(sp.id) : undefined;
    if (!local || local.fetchedAt < sp.fetchedAt) await speciesStore.put(sp);
  }

  const written: Observation[] = [];
  for (const o of b.data.observations as Observation[]) {
    const local = mode === 'merge' ? await obsStore.get(o.id) : undefined;
    if (local && local.updatedAt >= o.updatedAt) continue;
    if (local) for (const pid of local.photoIds) if (!o.photoIds.includes(pid)) await photoStore.delete(pid);
    await obsStore.put(o);
    written.push(o);
  }
  const writtenIds = new Set(written.map((o) => o.id));
  for (const p of photos) {
    if (!writtenIds.has(p.observationId)) continue;
    await photoStore.put(p);
  }
  for (const c of b.data.cards as AnimodexCard[]) {
    const existing = await cardStore.index('bySpecies').get(c.speciesId);
    if (!existing) await cardStore.put(c);
  }
  // Intégrité : toute espèce confirmée doit avoir sa carte.
  for (const o of written) {
    if (o.identificationStatus !== 'confirmed' || !o.speciesId) continue;
    if (!(await cardStore.index('bySpecies').get(o.speciesId)))
      await cardStore.put(generateCard((await speciesStore.get(o.speciesId))!, ABILITY_MAP, now));
  }
  if (mode === 'replace' && b.data.settings) await tx.objectStore('settings').put(b.data.settings as Settings);
  if (mode === 'replace' && !b.data.settings) await tx.objectStore('settings').put(DEFAULT_SETTINGS);
  await tx.objectStore('meta').put({ key: 'lastImportAt', value: now.toISOString() });
  await tx.done;
  notifyDataChanged();
}

/** Efface toutes les données personnelles (après confirmation explicite dans l'interface). */
export async function resetAllData(db: DB): Promise<void> {
  const tx = db.transaction(['observations', 'photos', 'cards', 'settings', 'meta', 'species', 'apiCache'], 'readwrite');
  await Promise.all([
    tx.objectStore('observations').clear(),
    tx.objectStore('photos').clear(),
    tx.objectStore('cards').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('species').clear(),
    tx.objectStore('apiCache').clear(),
    tx.objectStore('meta').delete('lastBackupAt'),
    tx.objectStore('meta').delete('lastImportAt'),
    tx.objectStore('meta').delete('lastArea'),
  ]);
  await tx.done;
  notifyDataChanged();
}

// --- Export CSV des observations ------------------------------------------------------

export function observationsToCsv(observations: readonly Observation[], speciesById: ReadonlyMap<string, Species>): string {
  const header = ['id', 'date', 'espece', 'nom_scientifique', 'statut', 'lieu', 'precision', 'latitude', 'longitude', 'notes'];
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = observations.map((o) => {
    const sp = o.speciesId ? speciesById.get(o.speciesId) : undefined;
    return [o.id, o.observedAt, sp && displayName(sp), sp?.scientificName, o.identificationStatus, o.locationLabel, o.locationPrecision, o.latitude, o.longitude, o.notes]
      .map(esc)
      .join(',');
  });
  return [header.join(','), ...rows].join('\n');
}
