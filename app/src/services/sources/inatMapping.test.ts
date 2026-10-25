import { describe, expect, it } from 'vitest';
import { photoSize, speciesFromInat, summaryFromInat } from './inatMapping';
import { inatTaxaResponseSchema } from './inatSchemas';
import { DRAGONFLY, FIXED_NOW, HERON, LYNX, OAK, inatTaxon } from '../../test/inatFixtures';

describe('conversion iNaturalist → espèce', () => {
  const heron = speciesFromInat(HERON, FIXED_NOW)!;

  it('reprend noms, taxonomie, groupe et numéro stable', () => {
    expect(heron).toMatchObject({
      id: 'inat-900001',
      cardNumber: 'AX-900001',
      scientificName: 'Ardea cinerea',
      frenchName: 'Héron cendré',
      commonNames: ['Grey Heron'],
      group: 'bird',
      taxonomy: { kingdom: 'Animalia', phylum: 'Chordata', class: 'Aves', order: 'Pelecaniformes', family: 'Ardeidae', genus: 'Ardea' },
      observationsCount: 150_000,
      fetchedAt: FIXED_NOW.toISOString(),
    });
  });

  it('garde les champs inconnus absents', () => {
    expect(heron.diet).toBeUndefined();
    expect(heron.physicalCharacteristics).toBeUndefined();
    expect(heron.habitats).toEqual([]);
  });

  it('nettoie le résumé Wikipédia et garde son attribution', () => {
    expect(heron.description).toEqual({
      text: 'Le Héron cendré est une espèce d’échassiers. Il vit près de l’eau.',
      source: 'Wikipédia (via iNaturalist)',
      url: HERON.wikipedia_url,
      license: 'CC BY-SA',
    });
  });

  it('n’accepte que les photos sous licence libre, avec attribution', () => {
    expect(heron.media.map((m) => m.id)).toEqual(['inat-photo-501', 'inat-photo-503']); // 502 sans licence : écartée
    expect(heron.media[0]).toMatchObject({ license: 'CC BY-NC', source: 'iNaturalist', url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/501/medium.jpg' });
    expect(heron.media[0].attribution).toContain('Photographe Test 501');
  });

  it('reprend le statut de conservation sans l’inventer', () => {
    expect(heron.conservationStatus).toMatchObject({ code: 'LC', category: 'LC', authority: 'IUCN Red List', placeName: undefined });
    const lynx = speciesFromInat(LYNX, FIXED_NOW)!;
    expect(lynx.conservationStatus).toMatchObject({ code: 'EN', placeName: 'France' });
    expect(lynx.sensitive).toBe(true);
    expect(speciesFromInat(inatTaxon({ id: 5, name: 'X y' }))!.conservationStatus).toBeUndefined();
  });

  it('écarte les non-animaux et les rangs autres que l’espèce', () => {
    expect(speciesFromInat(OAK)).toBeUndefined();
    expect(speciesFromInat({ ...HERON, rank: 'genus' })).toBeUndefined();
    expect(summaryFromInat(OAK)).toBeUndefined();
  });

  it('classe les insectes', () => {
    expect(speciesFromInat(DRAGONFLY)!.group).toBe('insect');
  });

  it('change la taille des URL de photo', () => {
    expect(photoSize('https://x/photos/1/square.jpg', 'small')).toBe('https://x/photos/1/small.jpg');
    expect(photoSize('https://x/photos/1/medium.JPEG', 'large')).toBe('https://x/photos/1/large.JPEG');
  });

  it('le schéma rejette une réponse sans champs indispensables', () => {
    expect(inatTaxaResponseSchema.safeParse({ results: [{ name: 'sans id' }] }).success).toBe(false);
    expect(inatTaxaResponseSchema.safeParse({ results: [{ ...HERON, champ_inconnu: 1, default_photo: null }] }).success).toBe(true);
  });
});
