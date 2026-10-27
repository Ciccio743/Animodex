import type { IDBPTransaction } from 'idb';
import type { AnimodexDB, DB } from '../db/database';
import type { AnimodexCard, IdentificationStatus, LocationPrecision, Observation, Photo } from '../domain/models';
import { validateObservation, type ValidationIssue } from '../domain/validation';
import { applyFinishDraw, generateCard } from '../domain/cards';
import { drawFinish, type CardFinish } from '../domain/finishes';
import { ABILITY_MAP } from '../data/abilities';
import { newId } from './ids';
import { positionToStore } from '../domain/location';
import { notifyDataChanged } from './dataEvents';

export interface ObservationInput {
  speciesId?: string;
  observedAt: string;
  identificationStatus: IdentificationStatus;
  locationLabel?: string;
  locationPrecision?: LocationPrecision;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface NewPhoto {
  blob: Blob;
  thumbBlob: Blob;
  mimeType: string;
  width: number;
  height: number;
  source: Photo['source'];
}

export class ObservationValidationError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super(issues.map((i) => i.message).join(' · '));
  }
}

export interface SaveResult {
  observation: Observation;
  card?: AnimodexCard;
  /** Vrai si cette sauvegarde a débloqué la carte de l'espèce pour la première fois. */
  cardCreated: boolean;
  /** Finition tirée par cette sauvegarde (nouvelle carte ou nouvelle observation confirmée). */
  finishDrawn?: CardFinish;
  /** Vrai si la finition tirée est plus rare que celle de la carte et la remplace. */
  finishUpgraded?: boolean;
  /** Vrai si la finition tirée n'avait jamais été trouvée : une carte de plus dans la collection. */
  finishNew?: boolean;
}

type CardOutcome = { card?: AnimodexCard; created: boolean; finishDrawn?: CardFinish; finishUpgraded?: boolean; finishNew?: boolean };

function clean(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

function buildObservation(base: Partial<Observation>, input: ObservationInput, now: string): Observation {
  const hasCoords = input.latitude !== undefined && input.longitude !== undefined && input.locationPrecision !== 'none';
  const precision = hasCoords ? (input.locationPrecision === 'exact' ? 'exact' : 'approximate') : 'none';
  const o: Observation = {
    id: base.id ?? newId('obs'),
    speciesId: input.identificationStatus === 'to_identify' && !input.speciesId ? undefined : input.speciesId,
    observedAt: new Date(input.observedAt).toISOString(),
    locationPrecision: precision,
    locationLabel: clean(input.locationLabel),
    photoIds: base.photoIds ?? [],
    identificationStatus: input.identificationStatus,
    identificationSource: base.identificationSource ?? 'manual',
    notes: clean(input.notes),
    createdAt: base.createdAt ?? now,
    updatedAt: now,
  };
  if (hasCoords && precision !== 'none') Object.assign(o, positionToStore(input.latitude!, input.longitude!, precision));
  // Retire les clés undefined pour garder des objets propres (et sérialisables tels quels).
  for (const k of Object.keys(o) as (keyof Observation)[]) if (o[k] === undefined) delete o[k];
  return o;
}

function check(o: Observation, now: Date, speciesKnown: boolean): void {
  const res = validateObservation(o, { now });
  const issues = [...res.issues];
  if (o.speciesId && !speciesKnown) issues.push({ field: 'speciesId', message: 'Espèce absente du catalogue local' });
  if (issues.length) throw new ObservationValidationError(issues);
}

type WriteTx = IDBPTransaction<AnimodexDB, ('observations' | 'photos' | 'cards' | 'species')[], 'readwrite'>;
const STORES = ['observations', 'photos', 'cards', 'species'] as const;

/**
 * Carte de l'espèce d'une observation confirmée. Une nouvelle carte reçoit une finition tirée au sort ;
 * une nouvelle observation (`isNewObservation`) d'une espèce déjà débloquée retente sa chance.
 */
async function cardForConfirmed(
  tx: WriteTx,
  o: Observation,
  now: Date,
  isNewObservation: boolean,
  random: () => number,
): Promise<CardOutcome> {
  if (o.identificationStatus !== 'confirmed' || !o.speciesId) return { created: false };
  const species = (await tx.objectStore('species').get(o.speciesId))!;
  const existing = await tx.objectStore('cards').index('bySpecies').get(o.speciesId);
  if (!existing) {
    const finish = drawFinish(random);
    const card = generateCard(species, ABILITY_MAP, now, finish);
    await tx.objectStore('cards').put(card);
    return { card, created: true, finishDrawn: finish, finishUpgraded: false, finishNew: true };
  }
  if (!isNewObservation) return { card: existing, created: false };
  const drawn = drawFinish(random);
  const res = applyFinishDraw(existing, drawn, now);
  if (res.card !== existing) await tx.objectStore('cards').put(res.card);
  return { card: res.card, created: false, finishDrawn: drawn, finishUpgraded: res.upgraded, finishNew: res.firstTime };
}

/**
 * Crée une observation (et ses photos) dans une transaction unique. Si l'identification est confirmée
 * et que l'espèce n'a pas encore de carte, la carte est générée selon les règles déterministes.
 */
export async function createObservation(
  db: DB,
  input: ObservationInput,
  photos: NewPhoto[] = [],
  now = new Date(),
  random: () => number = Math.random,
): Promise<SaveResult> {
  const ts = now.toISOString();
  const id = newId('obs');
  const photoRecords: Photo[] = photos.map((p) => ({ ...p, id: newId('photo'), observationId: id, createdAt: ts }));
  const observation = buildObservation({ id, photoIds: photoRecords.map((p) => p.id) }, input, ts);
  const tx = db.transaction(STORES, 'readwrite');
  try {
    check(observation, now, !observation.speciesId || !!(await tx.objectStore('species').get(observation.speciesId)));
  } catch (e) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw e;
  }
  for (const p of photoRecords) await tx.objectStore('photos').put(p);
  await tx.objectStore('observations').put(observation);
  const { card, created, finishDrawn, finishUpgraded, finishNew } = await cardForConfirmed(tx, observation, now, true, random);
  await tx.done;
  notifyDataChanged();
  return { observation, card, cardCreated: created, finishDrawn, finishUpgraded, finishNew };
}

export async function updateObservation(
  db: DB,
  id: string,
  input: ObservationInput,
  changes: { addPhotos?: NewPhoto[]; removePhotoIds?: string[] } = {},
  now = new Date(),
): Promise<SaveResult> {
  const ts = now.toISOString();
  const tx = db.transaction(STORES, 'readwrite');
  const existing = await tx.objectStore('observations').get(id);
  if (!existing) {
    tx.abort();
    throw new Error('Observation introuvable');
  }
  const removed = new Set(changes.removePhotoIds ?? []);
  const added: Photo[] = (changes.addPhotos ?? []).map((p) => ({ ...p, id: newId('photo'), observationId: id, createdAt: ts }));
  const photoIds = [...existing.photoIds.filter((p) => !removed.has(p)), ...added.map((p) => p.id)];
  const observation = buildObservation({ ...existing, photoIds }, input, ts);
  try {
    check(observation, now, !observation.speciesId || !!(await tx.objectStore('species').get(observation.speciesId)));
  } catch (e) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw e;
  }
  for (const pid of removed) await tx.objectStore('photos').delete(pid);
  for (const p of added) await tx.objectStore('photos').put(p);
  await tx.objectStore('observations').put(observation);
  const { card, created, finishDrawn, finishUpgraded } = await cardForConfirmed(tx, observation, now, false, Math.random);
  await tx.done;
  notifyDataChanged();
  return { observation, card, cardCreated: created, finishDrawn, finishUpgraded };
}

/**
 * Supprime une observation et ses photos. La carte de l'espèce est conservée (identifiant et numéro stables) ;
 * l'affichage la considère verrouillée tant qu'aucune observation confirmée ne la soutient.
 */
export async function deleteObservation(db: DB, id: string): Promise<void> {
  const tx = db.transaction(['observations', 'photos'], 'readwrite');
  const photos = await tx.objectStore('photos').index('byObservation').getAllKeys(id);
  for (const pid of photos) await tx.objectStore('photos').delete(pid);
  await tx.objectStore('observations').delete(id);
  await tx.done;
  notifyDataChanged();
}
