// @vitest-environment node
// Environnement Node : ses Blob natifs survivent au clonage structuré d’IndexedDB (fake-indexeddb), contrairement à ceux de jsdom.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openAnimodexDB, type DB } from '../db/database';
import { createObservation, deleteObservation, ObservationValidationError, updateObservation, type NewPhoto } from './observationService';
import { applyImport, buildBackup, parseBackup, previewImport, observationsToCsv } from './backupService';
import { listObservations } from '../repositories/observations';
import { listCards, getCardForSpecies } from '../repositories/cards';
import { getSettings, saveSettings } from '../repositories/settings';
import { upsertSpecies } from '../repositories/species';
import { BLACKBIRD, HERON, inatTaxon, sp } from '../test/inatFixtures';

let db: DB;
let n = 0;

const GREAT_TIT = inatTaxon({ id: 900005, name: 'Parus major', preferred_common_name: 'Mésange charbonnière', ancestors: BLACKBIRD.ancestors });
const SWAN = inatTaxon({ id: 900006, name: 'Cygnus olor', preferred_common_name: 'Cygne tuberculé', ancestors: HERON.ancestors });
const CATALOG = [HERON, BLACKBIRD, GREAT_TIT, SWAN].map(sp);

async function seeded(name: string): Promise<DB> {
  const d = await openAnimodexDB(name);
  await upsertSpecies(d, CATALOG);
  return d;
}

beforeEach(async () => {
  db = await seeded(`animodex-test-${++n}`);
});
afterEach(() => db.close());

function fakePhoto(): NewPhoto {
  return {
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }),
    thumbBlob: new Blob([new Uint8Array([5, 6])], { type: 'image/jpeg' }),
    mimeType: 'image/jpeg',
    width: 10,
    height: 8,
    source: 'import',
  };
}

const NOW = new Date('2026-10-01T12:00:00Z');

describe('récupération d’une espèce', () => {
  it('le catalogue local fournit la fiche et ses sources, sans réseau', async () => {
    const s = (await db.get('species', 'inat-900001'))!;
    expect(s.frenchName).toBe('Héron cendré');
    expect(s.sourceReferences[0].accessedAt).toBeDefined();
    expect(s.longevity).toBeUndefined();
  });
  it('refuse une observation d’une espèce absente du catalogue', async () => {
    await expect(createObservation(db, { speciesId: 'inat-1', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, [], NOW)).rejects.toBeInstanceOf(ObservationValidationError);
  });
});

describe('création d’observation et génération de carte', () => {
  it('crée l’observation et débloque la carte une seule fois', async () => {
    const r1 = await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed', locationLabel: '  Étang  ' }, [], NOW);
    expect(r1.cardCreated).toBe(true);
    expect(r1.card?.cardNumber).toBe('AX-900001');
    expect(r1.observation.locationLabel).toBe('Étang');
    expect(r1.observation.locationPrecision).toBe('none');
    expect(r1.observation.latitude).toBeUndefined();

    const r2 = await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T09:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    expect(r2.cardCreated).toBe(false);
    expect(r2.card?.id).toBe(r1.card?.id);
    expect(await listCards(db)).toHaveLength(1);
    expect(await listObservations(db)).toHaveLength(2);
  });

  it('tire une finition à la création puis à chaque nouvelle observation, et garde la plus rare', async () => {
    const base = { speciesId: 'inat-900001', identificationStatus: 'confirmed' } as const;
    const r1 = await createObservation(db, { ...base, observedAt: '2026-09-30T08:00:00Z' }, [], NOW, () => 0);
    expect(r1.card).toMatchObject({ finish: 'nature', finishesFound: ['nature'] });
    expect(r1.finishDrawn).toBe('nature');
    const r2 = await createObservation(db, { ...base, observedAt: '2026-09-30T09:00:00Z' }, [], NOW, () => 0.9999);
    expect(r2.finishDrawn).toBe('prisme');
    expect(r2.finishUpgraded).toBe(true);
    const r3 = await createObservation(db, { ...base, observedAt: '2026-09-30T10:00:00Z' }, [], NOW, () => 0.5);
    expect(r3.finishUpgraded).toBe(false);
    const card = (await getCardForSpecies(db, 'inat-900001'))!;
    expect(card.finish).toBe('prisme');
    expect(card.finishesFound).toEqual(['nature', 'prisme', r3.finishDrawn]);
    const restored = parseBackup(JSON.stringify(await buildBackup(db)));
    expect(restored.ok).toBe(true);
  });

  it('enregistre la position selon la précision choisie', async () => {
    const base = { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' } as const;
    const approx = await createObservation(db, { ...base, latitude: 45.764043, longitude: 4.835659, locationPrecision: 'approximate' }, [], NOW);
    expect(approx.observation).toMatchObject({ latitude: 45.76, longitude: 4.84, locationPrecision: 'approximate' });
    const exact = await createObservation(db, { ...base, latitude: 45.7640432, longitude: 4.8356591, locationPrecision: 'exact' }, [], NOW);
    expect(exact.observation).toMatchObject({ latitude: 45.76404, longitude: 4.83566, locationPrecision: 'exact' });
    const none = await createObservation(db, { ...base, latitude: 45.7, longitude: 4.8, locationPrecision: 'none' }, [], NOW);
    expect(none.observation.latitude).toBeUndefined();
    expect(none.observation.locationPrecision).toBe('none');
    // Retirer le point lors d'une modification efface bien les coordonnées.
    const edited = await updateObservation(db, approx.observation.id, { ...base, locationPrecision: 'none' }, {}, NOW);
    expect(edited.observation.latitude).toBeUndefined();
    expect(edited.observation.locationPrecision).toBe('none');
  });

  it('une observation incertaine ne crée pas de carte, la confirmation la crée', async () => {
    const r = await createObservation(db, { speciesId: 'inat-900002', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'uncertain' }, [], NOW);
    expect(r.card).toBeUndefined();
    expect(await getCardForSpecies(db, 'inat-900002')).toBeUndefined();
    const u = await updateObservation(db, r.observation.id, { speciesId: 'inat-900002', observedAt: r.observation.observedAt, identificationStatus: 'confirmed' }, {}, NOW);
    expect(u.cardCreated).toBe(true);
    expect(u.observation.createdAt).toBe(r.observation.createdAt);
  });

  it('accepte une observation « à identifier » sans espèce', async () => {
    const r = await createObservation(db, { observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'to_identify' }, [fakePhoto()], NOW);
    expect(r.observation.speciesId).toBeUndefined();
    expect(r.observation.photoIds).toHaveLength(1);
  });

  it('refuse une observation invalide sans rien écrire', async () => {
    await expect(
      createObservation(db, { observedAt: '2030-01-01T00:00:00Z', identificationStatus: 'confirmed', speciesId: 'inat-900001' }, [fakePhoto()], NOW),
    ).rejects.toBeInstanceOf(ObservationValidationError);
    expect(await listObservations(db)).toHaveLength(0);
    expect(await db.count('photos')).toBe(0);
  });

  it('une modification invalide laisse l’observation intacte', async () => {
    const r = await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    await expect(updateObservation(db, r.observation.id, { observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, {}, NOW)).rejects.toThrow();
    expect((await db.get('observations', r.observation.id))?.speciesId).toBe('inat-900001');
  });
});

describe('suppression d’observation', () => {
  it('supprime l’observation et ses photos, garde la carte', async () => {
    const r = await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, [fakePhoto(), fakePhoto()], NOW);
    expect(await db.count('photos')).toBe(2);
    await deleteObservation(db, r.observation.id);
    expect(await listObservations(db)).toHaveLength(0);
    expect(await db.count('photos')).toBe(0);
    expect(await listCards(db)).toHaveLength(1);
  });
});

describe('sauvegarde locale et restauration', () => {
  it('les données survivent à la réouverture de la base', async () => {
    const name = `animodex-reopen-${n}`;
    const first = await seeded(name);
    await createObservation(first, { speciesId: 'inat-900005', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    first.close();
    const again = await openAnimodexDB(name);
    expect(await listObservations(again)).toHaveLength(1);
    expect(await listCards(again)).toHaveLength(1);
    again.close();
  });

  it('export → import (remplacement) restaure tout avec les mêmes identifiants', async () => {
    await saveSettings(db, { textScale: 'large' });
    const a = await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed', notes: 'Au bord de l’étang' }, [fakePhoto()], NOW);
    await createObservation(db, { observedAt: '2026-09-30T09:00:00Z', identificationStatus: 'to_identify' }, [], NOW);
    const backup = await buildBackup(db, NOW);
    const text = JSON.stringify(backup);

    const target = await seeded(`animodex-restore-${n}`);
    await createObservation(target, { speciesId: 'inat-900005', observedAt: '2026-09-01T08:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    const parsed = parseBackup(text);
    expect(parsed.errors).toEqual([]);
    await applyImport(target, parsed.backup!, 'replace', NOW);

    const restored = await listObservations(target);
    expect(restored.map((o) => o.id).sort()).toEqual(backup.data.observations.map((o) => o.id).sort());
    const photo = await target.get('photos', a.observation.photoIds[0]);
    expect(new Uint8Array(await photo!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect((await listCards(target)).map((c) => c.speciesId)).toEqual(['inat-900001']);
    expect((await getSettings(target)).textScale).toBe('large');
    target.close();
  });

  it('import en fusion : ajoute, garde la version la plus récente, ne supprime rien', async () => {
    const local = await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'uncertain' }, [], NOW);
    const backup = await buildBackup(db, NOW);
    // Le fichier contient une version plus récente de la même observation et une nouvelle observation.
    backup.data.observations[0] = { ...backup.data.observations[0], identificationStatus: 'confirmed', updatedAt: '2026-10-02T00:00:00.000Z' };
    const other = await seeded(`animodex-src-${n}`);
    await createObservation(other, { speciesId: 'inat-900006', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    const otherBackup = await buildBackup(other, NOW);
    other.close();
    backup.data.observations.push(...otherBackup.data.observations);
    backup.data.cards.push(...otherBackup.data.cards);
    // Appareil vierge côté catalogue pour vérifier que le catalogue voyage avec la sauvegarde.
    await db.clear('species');
    await upsertSpecies(db, [CATALOG[2]]);

    await createObservation(db, { speciesId: 'inat-900005', observedAt: '2026-09-30T10:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    const preview = await previewImport(db, parsed.backup!);
    expect(preview.observations).toEqual({ added: 1, updated: 1, unchanged: 0, keptLocal: 0 });

    await applyImport(db, parsed.backup!, 'merge', NOW);
    const all = await listObservations(db);
    expect(all).toHaveLength(3);
    expect(all.find((o) => o.id === local.observation.id)?.identificationStatus).toBe('confirmed');
    // La confirmation importée génère la carte manquante.
    expect((await listCards(db)).map((c) => c.speciesId).sort()).toEqual(['inat-900001', 'inat-900005', 'inat-900006']);
  });

  it('un fichier invalide est refusé et ne touche pas aux données', async () => {
    await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed' }, [], NOW);
    expect(parseBackup('pas du json').ok).toBe(false);
    expect(parseBackup('{"format":"autre"}').errors[0]).toMatch(/pas une sauvegarde/);
    const backup = await buildBackup(db, NOW);
    expect(parseBackup(JSON.stringify({ ...backup, schemaVersion: 99 })).errors[0]).toMatch(/plus récente/);
    expect(parseBackup(JSON.stringify({ ...backup, schemaVersion: 1 })).errors[0]).toMatch(/Ancien format/);
    const noSpecies = structuredClone(backup);
    noSpecies.data.species = [];
    expect(parseBackup(JSON.stringify(noSpecies)).ok).toBe(false);
    const broken = structuredClone(backup);
    broken.data.observations[0].speciesId = 'licorne';
    expect(parseBackup(JSON.stringify(broken)).ok).toBe(false);
    const badCard = structuredClone(backup);
    badCard.data.cards[0].cardNumber = 'AX-1';
    expect(parseBackup(JSON.stringify(badCard)).errors.join()).toMatch(/numéro stable/);
    const orphan = structuredClone(backup);
    orphan.data.observations[0].photoIds = ['photo_absente'];
    expect(parseBackup(JSON.stringify(orphan)).ok).toBe(false);
    expect(await listObservations(db)).toHaveLength(1);
  });

  it('exporte les observations en CSV', async () => {
    await createObservation(db, { speciesId: 'inat-900001', observedAt: '2026-09-30T08:00:00Z', identificationStatus: 'confirmed', notes: 'virgule, "guillemets"' }, [], NOW);
    const csv = observationsToCsv(await listObservations(db), new Map(CATALOG.map((x) => [x.id, x])));
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('Héron cendré');
    expect(csv).toContain('"virgule, ""guillemets"""');
  });
});
