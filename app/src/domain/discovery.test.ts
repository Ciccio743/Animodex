import { describe, expect, it } from 'vitest';
import { areaConfidence, matchesFilter, pickSurprise } from './discovery';
import type { Rarity } from './models';
import { BLACKBIRD, DRAGONFLY, HERON, LYNX, sp } from '../test/inatFixtures';

const catalog = [HERON, BLACKBIRD, LYNX, DRAGONFLY].map(sp);

describe('filtres du catalogue', () => {
  it('filtre par groupe, type, rareté et texte (sans accents)', () => {
    expect(catalog.filter((s) => matchesFilter(s, { group: 'bird' })).length).toBe(2);
    expect(catalog.filter((s) => matchesFilter(s, { query: 'heron' })).map((s) => s.id)).toEqual(['inat-900001']);
    expect(catalog.filter((s) => matchesFilter(s, { query: 'Grey' })).map((s) => s.id)).toEqual(['inat-900001']);
    expect(catalog.filter((s) => matchesFilter(s, { type: 'insect' })).map((s) => s.id)).toEqual(['inat-900004']);
    expect(catalog.filter((s) => matchesFilter(s, { rarity: 'epic' })).map((s) => s.id)).toEqual(['inat-900003']);
  });
});

describe('découverte surprise', () => {
  const pool: { id: string; r: Rarity }[] = [
    { id: 'a', r: 'common' },
    { id: 'b', r: 'rare' },
    { id: 'c', r: 'legendary' },
  ];
  it('reste dans le pool et expose une probabilité', () => {
    for (const x of [0, 0.3, 0.6, 0.999]) {
      const res = pickSurprise(pool, (p) => p.r, () => x)!;
      expect(pool).toContain(res.item);
      expect(res.probability).toBeGreaterThan(0);
    }
  });
  it('les probabilités suivent les poids et somment à 1', () => {
    const seen = new Map<string, number>();
    for (let i = 0; i < 1000; i++) {
      const r = pickSurprise(pool, (p) => p.r, () => i / 1000)!;
      seen.set(r.item.id, r.probability);
    }
    expect([...seen.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(seen.get('a')).toBeCloseTo(50 / 85, 5);
  });
  it('renvoie undefined sans candidat', () => {
    expect(pickSurprise([], () => 'common')).toBeUndefined();
  });
});

describe('confiance des suggestions de zone', () => {
  it('dépend du nombre d’observations validées', () => {
    expect(areaConfidence(50).level).toBe('high');
    expect(areaConfidence(5).level).toBe('medium');
    expect(areaConfidence(1).level).toBe('low');
  });
});
