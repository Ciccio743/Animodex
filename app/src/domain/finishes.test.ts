import { describe, expect, it } from 'vitest';
import { CARD_FINISHES, drawFinish, FINISH_WEIGHTS, formatFinishChance } from './finishes';
import { applyFinishDraw, cardFinish, generateCard } from './cards';
import { ABILITY_MAP } from '../data/abilities';
import { HERON, sp } from '../test/inatFixtures';

const heron = sp(HERON);

describe('finitions de carte', () => {
  it('les chances font 100 % et vont de la plus courante à la plus rare', () => {
    const weights = CARD_FINISHES.map((f) => FINISH_WEIGHTS[f]);
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it('le tirage suit les chances', () => {
    expect(drawFinish(() => 0)).toBe('nature');
    expect(drawFinish(() => 0.399)).toBe('nature');
    expect(drawFinish(() => 0.4)).toBe('aquarelle');
    expect(drawFinish(() => 0.9999)).toBe('prisme');
    // Tirage pseudo-aléatoire reproductible : la répartition reste proche des chances annoncées.
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const counts = new Map<string, number>();
    for (let i = 0; i < 20000; i++) {
      const f = drawFinish(rnd);
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    expect((counts.get('nature') ?? 0) / 20000).toBeGreaterThan(0.37);
    expect((counts.get('nature') ?? 0) / 20000).toBeLessThan(0.43);
  });

  it('affiche les chances simplement', () => {
    expect(formatFinishChance('nature')).toBe('40 %');
    expect(formatFinishChance('aurore')).toBe('1 sur 20');
    expect(formatFinishChance('prisme')).toBe('1 sur 500');
  });

  it('une carte ancienne sans finition est « nature »', () => {
    const { finish: _f, finishesFound: _ff, ...old } = generateCard(heron, ABILITY_MAP);
    expect(cardFinish(old)).toBe('nature');
    const res = applyFinishDraw(old, 'givre');
    expect(res.upgraded).toBe(true);
    expect(res.card.finish).toBe('givre');
    expect(res.card.finishesFound).toEqual(['nature', 'givre']);
  });

  it('une finition moins rare est ajoutée sans remplacer la plus rare', () => {
    const card = generateCard(heron, ABILITY_MAP, new Date(), 'soleil');
    const res = applyFinishDraw(card, 'rosee');
    expect(res.upgraded).toBe(false);
    expect(res.firstTime).toBe(true);
    expect(res.card.finish).toBe('soleil');
    const again = applyFinishDraw(res.card, 'rosee');
    expect(again.card).toBe(res.card);
  });
});
