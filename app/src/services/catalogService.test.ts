// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openAnimodexDB, type DB } from '../db/database';
import { downloadAreaPack, ensureSpecies, getAreaSpecies } from './catalogService';
import { listSpecies } from '../repositories/species';
import { resetThrottleForTests } from './sources/http';
import { BLACKBIRD, HERON, OAK, inatTaxon, jsonResponse } from '../test/inatFixtures';

let db: DB;
let n = 0;
const area = { kind: 'place' as const, placeId: 123, label: 'Zone test' };

function route(handlers: Record<string, () => Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) throw new TypeError('réseau indisponible (test)');
    return handlers[key]();
  });
}

beforeEach(async () => {
  db = await openAnimodexDB(`catalog-test-${++n}`);
  resetThrottleForTests();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  db.close();
  vi.restoreAllMocks();
});

describe('catalogue alimenté par iNaturalist (réponses simulées)', () => {
  it('le catalogue démarre vide', async () => {
    expect(await listSpecies(db)).toEqual([]);
  });

  it('ajoute une espèce consultée, avec rattachement GBIF', async () => {
    route({
      '/taxa/900001': () => jsonResponse({ results: [HERON] }),
      '/species/match': () => jsonResponse({ usageKey: 2481589, matchType: 'EXACT', confidence: 99 }),
    });
    const { species, stale } = await ensureSpecies(db, 900001);
    expect(stale).toBe(false);
    expect(species.gbifUsageKey).toBe(2481589);
    expect(species.sourceReferences.find((r) => r.label.startsWith('GBIF'))!.url).toBe('https://www.gbif.org/species/2481589');
    expect((await listSpecies(db)).map((s) => s.id)).toEqual(['inat-900001']);
  }, 10_000);

  it('GBIF indisponible n’empêche pas l’ajout', async () => {
    route({ '/taxa/900001': () => jsonResponse({ results: [HERON] }), '/species/match': () => jsonResponse({}, 500) });
    const { species } = await ensureSpecies(db, 900001);
    expect(species.gbifUsageKey).toBeUndefined();
  }, 10_000);

  it('hors réseau : renvoie la fiche enregistrée, sinon une erreur', async () => {
    route({});
    await expect(ensureSpecies(db, 900001)).rejects.toMatchObject({ kind: 'network' });
    route({ '/taxa/900001': () => jsonResponse({ results: [HERON] }), '/species/match': () => jsonResponse({ matchType: 'NONE' }) });
    await ensureSpecies(db, 900001);
    route({});
    const r = await ensureSpecies(db, 900001, { force: true });
    expect(r.stale).toBe(true);
    expect(r.species.frenchName).toBe('Héron cendré');
  }, 15_000);

  it('refuse un taxon non animal', async () => {
    route({ '/taxa/900099': () => jsonResponse({ results: [OAK] }) });
    await expect(ensureSpecies(db, 900099)).rejects.toThrow(/pas une espèce animale/);
  });

  it('liste de zone : source, cache et repli sur le cache périmé', async () => {
    const f = route({
      '/observations/species_counts': () => jsonResponse({ total_results: 3, results: [{ count: 42, taxon: HERON }, { count: 3, taxon: BLACKBIRD }, { count: 9, taxon: OAK }] }),
    });
    const first = await getAreaSpecies(db, { area });
    expect(first.items.map((i) => [i.summary.taxonId, i.count])).toEqual([
      [900001, 42],
      [900002, 3],
    ]);
    expect(first.fromCache).toBe(false);
    expect(new URL(String(f.mock.calls[0][0])).searchParams.get('place_id')).toBe('123');
    expect(new URL(String(f.mock.calls[0][0])).searchParams.get('quality_grade')).toBe('research');
    // Les suggestions ne touchent ni au catalogue ni à la collection.
    expect(await listSpecies(db)).toEqual([]);

    const second = await getAreaSpecies(db, { area });
    expect(second.fromCache).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);

    route({});
    const offline = await getAreaSpecies(db, { area }, { force: true });
    expect(offline.stale).toBe(true);
    expect(offline.items).toHaveLength(2);
  }, 15_000);

  it('arrondit la position avant envoi et transmet rayon et mois', async () => {
    const f = route({ '/observations/species_counts': () => jsonResponse({ results: [] }) });
    await getAreaSpecies(db, { area: { kind: 'point', lat: 45.764321, lng: 4.835659, radiusKm: 5, label: 'ici' }, month: 5, group: 'bird' });
    const p = new URL(String(f.mock.calls[0][0])).searchParams;
    expect([p.get('lat'), p.get('lng'), p.get('radius'), p.get('month'), p.get('iconic_taxa')]).toEqual(['45.76', '4.84', '5', '5', 'Aves']);
  });

  it('pack hors ligne : fiches détaillées par lots de 30', async () => {
    const taxa = Array.from({ length: 45 }, (_, i) => inatTaxon({ id: 800000 + i, name: `Avis test${i}`, ancestors: HERON.ancestors }));
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('species_counts')) return jsonResponse({ results: taxa.map((t) => ({ count: 1, taxon: t })) });
      const ids = /taxa\/([\d,]+)/.exec(url)![1].split(',').map(Number);
      return jsonResponse({ results: taxa.filter((t) => ids.includes(t.id)) });
    });
    resetThrottleForTests();
    const progress: number[] = [];
    const saved = await downloadAreaPack(db, area, (done) => progress.push(done));
    expect(saved).toBe(45);
    expect(f).toHaveBeenCalledTimes(3); // 1 liste + 2 lots
    expect(progress).toEqual([30, 45]);
    expect(await listSpecies(db)).toHaveLength(45);
  }, 15_000);
});
