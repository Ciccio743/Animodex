import { describe, expect, it } from 'vitest';
import { ANECDOTE_LISTS, anecdoteFor } from './anecdotes';

describe('anecdotes « Le savais-tu ? »', () => {
  it('restent assez courtes pour tenir sur la carte', () => {
    const all = Object.values(ANECDOTE_LISTS).flatMap((m) => Object.values(m).flat());
    for (const a of all) expect(a.length, a).toBeLessThanOrEqual(115);
  });

  it('choisit l’espèce, puis le genre, la famille, l’ordre et enfin le groupe', () => {
    const base = { id: 'inat-1', taxonomy: {}, group: 'bird' as const };
    expect(anecdoteFor({ ...base, scientificName: 'Alcedo atthis' })).toMatch(/train/);
    expect(
      anecdoteFor({
        ...base,
        scientificName: 'Turdus pilaris',
        taxonomy: { genus: 'Turdus', family: 'Turdidae' },
      }),
    ).toMatch(/merles et les grives/);
    expect(
      anecdoteFor({
        ...base,
        scientificName: 'Strix nebulosa',
        taxonomy: { genus: 'Strix', family: 'Strigidae' },
      }),
    ).toMatch(/sans bruit/);
    expect(anecdoteFor({ ...base, scientificName: 'Inconnu inconnu' })).toMatch(/oiseaux/i);
  });

  it('donne toujours la même anecdote pour une espèce', () => {
    const fox = {
      id: 'inat-42069',
      scientificName: 'Vulpes vulpes',
      taxonomy: {},
      group: 'mammal' as const,
    };
    expect(anecdoteFor(fox)).toBe(anecdoteFor(fox));
  });
});
