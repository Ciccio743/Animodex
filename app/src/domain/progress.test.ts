import { describe, expect, it } from 'vitest';
import { BLACKBIRD, HERON, sp } from '../test/inatFixtures';

const SPECIES = [sp(HERON), sp(BLACKBIRD)];
import { computeProgress, isSpeciesKnown } from './progress';
import { computeXpEvents, levelFromXp, totalXp, XP_RULES } from './xp';
import { isRealObservation, validateObservation } from './validation';
import { makeObservation } from '../test/fixtures';

describe('progression du Pokédex', () => {
  it('compte chaque espèce une seule fois', () => {
    const obs = [
      makeObservation({ speciesId: 'inat-900001' }),
      makeObservation({ speciesId: 'inat-900001', observedAt: '2026-06-01T10:00:00.000Z' }),
      makeObservation({ speciesId: 'inat-900002' }),
    ];
    const p = computeProgress(obs, SPECIES);
    expect(p.discoveredSpeciesIds.size).toBe(2);
    expect(p.totalObservations).toBe(3);
    expect(p.observationCountBySpecies.get('inat-900001')).toBe(2);
    expect(p.percent).toBe(Math.round((2 / SPECIES.length) * 100));
    expect(p.firstObservationBySpecies.get('inat-900001')!.observedAt).toBe('2026-05-01T10:00:00.000Z');
    expect(p.lastObservationBySpecies.get('inat-900001')!.observedAt).toBe('2026-06-01T10:00:00.000Z');
  });
  it('une identification incertaine ne débloque pas l’espèce', () => {
    const p = computeProgress([makeObservation({ identificationStatus: 'uncertain' })], SPECIES);
    expect(p.discoveredSpeciesIds.size).toBe(0);
    expect(p.pendingSpeciesIds.has('inat-900001')).toBe(true);
  });
  it('compte les observations à identifier à part', () => {
    const p = computeProgress([makeObservation({ identificationStatus: 'to_identify', speciesId: undefined })], SPECIES);
    expect(p.toIdentifyCount).toBe(1);
    expect(p.discoveredSpeciesIds.size).toBe(0);
  });
  it('détecte une espèce déjà connue', () => {
    const obs = [makeObservation({ speciesId: 'inat-900002' })];
    expect(isSpeciesKnown('inat-900002', obs)).toBe(true);
    expect(isSpeciesKnown('inat-900001', obs)).toBe(false);
  });
});

describe('attribution de l’XP', () => {
  it('récompense la première observation d’une espèce, d’un groupe, d’un ordre et d’une famille', () => {
    const events = computeXpEvents([makeObservation({ speciesId: 'inat-900001' })], SPECIES);
    const reasons = events.map((e) => e.reason);
    expect(reasons.filter((r) => r === 'newSpecies')).toHaveLength(1);
    expect(reasons).toContain('newGroup');
    expect(reasons).toContain('newOrder');
    expect(reasons).toContain('newFamily');
  });
  it('n’accorde pas d’XP en double pour la même espèce le même jour', () => {
    const base = makeObservation({ speciesId: 'inat-900002' });
    const events = computeXpEvents(
      [base, makeObservation({ speciesId: 'inat-900002' }), makeObservation({ speciesId: 'inat-900002' })],
      SPECIES,
    );
    expect(events.filter((e) => e.reason === 'repeatSighting')).toHaveLength(1);
  });
  it('n’accorde rien aux observations incertaines ou à identifier', () => {
    const events = computeXpEvents(
      [makeObservation({ identificationStatus: 'uncertain' }), makeObservation({ identificationStatus: 'to_identify', speciesId: undefined })],
      SPECIES,
    );
    expect(totalXp(events)).toBe(0);
  });
  it('calcule les niveaux', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(300).level).toBe(3);
    expect(XP_RULES.newSpecies).toBe(100);
  });
});

describe('validation d’une observation', () => {
  it('accepte une observation sans coordonnées', () => {
    expect(validateObservation(makeObservation()).ok).toBe(true);
  });
  it('refuse une précision de position sans coordonnées réelles', () => {
    const r = validateObservation(makeObservation({ locationPrecision: 'approximate' }));
    expect(r.ok).toBe(false);
    expect(r.issues[0].field).toBe('locationPrecision');
  });
  it('refuse une latitude sans longitude', () => {
    expect(validateObservation(makeObservation({ latitude: 45, locationPrecision: 'exact' })).ok).toBe(false);
  });
  it('refuse des coordonnées si « sans coordonnées »', () => {
    expect(validateObservation(makeObservation({ latitude: 45, longitude: 3, locationPrecision: 'none' })).ok).toBe(false);
  });
  it('accepte des coordonnées valides avec précision', () => {
    expect(validateObservation(makeObservation({ latitude: 45, longitude: 3, locationPrecision: 'approximate' })).ok).toBe(true);
  });
  it('exige une espèce sauf « à identifier »', () => {
    expect(validateObservation(makeObservation({ speciesId: undefined })).ok).toBe(false);
    expect(validateObservation(makeObservation({ speciesId: undefined, identificationStatus: 'to_identify' })).ok).toBe(true);
  });
  it('refuse une date future et une espèce inconnue', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(validateObservation(makeObservation(), { now }).ok).toBe(false);
    expect(validateObservation(makeObservation({ speciesId: 'licorne' }), { knownSpeciesIds: new Set(['inat-900001']) }).ok).toBe(false);
  });
  it('rejette les champs inattendus', () => {
    expect(validateObservation({ ...makeObservation(), hack: true }).ok).toBe(false);
  });
});

describe('espèce potentielle vs observation réelle', () => {
  it('une suggestion n’est jamais une observation réelle', () => {
    expect(isRealObservation({ kind: 'suggestion', speciesId: 'inat-900001', reason: 'observée dans la zone', source: 'iNaturalist' })).toBe(false);
    expect(isRealObservation(makeObservation())).toBe(true);
  });
});
